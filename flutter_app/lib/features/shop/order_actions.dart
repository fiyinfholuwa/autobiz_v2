import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';
import 'logic.dart';

const cancelReasons = ['Changed my mind', 'Ordered by mistake', 'Found a better price', 'Delivery takes too long', 'Other'];

Future<void> openCancelOrder(Order o) => showSheet(_CancelOrderSheet(o));

class _CancelOrderSheet extends StatefulWidget {
  final Order o;
  const _CancelOrderSheet(this.o);
  @override
  State<_CancelOrderSheet> createState() => _CancelOrderSheetState();
}

class _CancelOrderSheetState extends State<_CancelOrderSheet> {
  String reason = '';
  String? err;
  bool busy = false;

  Future<void> _confirm() async {
    if (reason.isEmpty) { setState(() => err = 'Please select a reason.'); return; }
    setState(() => busy = true);
    await sleep(900);
    if (!mounted) return;
    Order? cur;
    for (final x in store.orders) { if (x.id == widget.o.id) cur = x; }
    if (cur == null || !canCancel(cur)) {
      Navigator.of(context).pop();
      toast('This order can no longer be cancelled', type: ToastType.warning);
      return;
    }
    Tx? refundTx;
    if (cur.payment == 'wallet' && cur.paid) {
      refundTx = store.credit(cur.total, TxInput(type: 'refund', title: 'Order Refund', subtitle: '${cur.id} · cancelled', icon: 'bi-arrow-counterclockwise', tone: 'success'));
    }
    final o = cur;
    store.mutate(() {
      o.status = 'cancelled';
      o.cancelReason = reason;
      o.refunded = refundTx != null;
      o.paid = false;
      o.refundTxId = refundTx?.id;
      o.timeline = [
        ...o.timeline.where((t) => t.done),
        TimelineStep(key: 'cancelled', label: 'Order cancelled', note: reason + (refundTx != null ? ' · refunded to wallet' : ''), done: true, date: f.now()),
      ];
    });
    store.notify(icon: 'bi-x-circle', tone: 'danger', title: 'Order ${o.id} cancelled', body: refundTx != null ? '${f.naira(o.total)} refunded to your wallet.' : 'Your order has been cancelled.');
    Navigator.of(context).pop();
    final rows = [SRow('Order', o.id), SRow('Reason', reason), if (refundTx != null) SRow('New balance', f.naira(store.balance, 2))];
    Future.delayed(const Duration(milliseconds: 300), () => success(SuccessOpts(
          title: 'Order cancelled',
          message: refundTx != null ? '${f.naira(o.total, 2)} has been refunded to your wallet.' : 'Your order was cancelled. No charge was made.',
          rows: rows,
        )));
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.o;
    return AppSheet(
      locked: busy,
      footer: Row(children: [
        Expanded(child: Btn('Keep order', variant: BtnVariant.outline, disabled: busy, onPressed: () => Navigator.of(context).pop())),
        const SizedBox(width: 10),
        Expanded(child: Btn('Cancel order', variant: BtnVariant.danger, loading: busy, loadingText: 'Cancelling…', onPressed: _confirm)),
      ]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Center(child: IconTile('bi-x-circle', tone: 'danger', size: 64, rounded: true)),
        const SizedBox(height: 12),
        AppText('Cancel order ${o.id}?', v: TV.h2, center: true),
        const SizedBox(height: 6),
        RichAppText(
          o.payment == 'wallet' && o.paid ? '**${f.naira(o.total)}** will be refunded to your AutoBiz wallet instantly.' : "You haven't been charged for this pay-on-delivery order.",
          v: TV.sm, muted: true, center: true,
        ),
        const SizedBox(height: 16),
        SelectField<String>(
          label: 'Reason for cancelling',
          value: reason.isEmpty ? null : reason,
          placeholder: 'Select a reason',
          error: err,
          options: [for (final r in cancelReasons) SelectOption(r, r)],
          onChanged: (v) => setState(() { reason = v; err = null; }),
        ),
      ]),
    );
  }
}

void markReceived(Order o) {
  store.mutate(() {
    o.status = 'delivered';
    o.paid = true;
    for (final t in o.timeline) {
      if (!t.done) { t.done = true; t.date = f.now(); }
    }
  });
  store.notify(icon: 'bi-check2-circle', tone: 'success', title: 'Order ${o.id} delivered', body: 'Thanks for shopping on AutoBiz!');
  toast('Marked as delivered. Enjoy your purchase!');
}
