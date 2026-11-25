import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../data/catalog.dart';
import '../../features/shop/logic.dart';
import '../../features/shop/order_actions.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /orders/:id — members only
class OrderDetailScreen extends StatefulWidget {
  final String id;
  /// query parameters
  final Map<String, String> q;
  const OrderDetailScreen({super.key, required this.id, this.q = const {}});
  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  @override
  void initState() {
    super.initState();
    if (!store.orders.any((o) => o.id == widget.id)) {
      WidgetsBinding.instance.addPostFrameCallback((_) => toast("We couldn't find that order", type: ToastType.warning));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    Order? o;
    for (final x in s.orders) { if (x.id == widget.id) o = x; }
    if (o == null) {
      return AppScreen(
        header: const AppHeader(title: 'Order', fallback: '/orders'),
        children: [EmptyState(icon: 'bi-box-seam', title: 'Order not found', message: 'It may have been removed or the link is incorrect.', action: 'My orders', onAction: () => context.go('/orders'))],
      );
    }
    final order = o;
    final st = orderStatus[order.status]!;
    final digital = isDigitalOrder(order);
    final units = orderUnits(order);
    final cancelled = order.status == 'cancelled';
    final delivered = order.status == 'delivered';
    int? deliveredAt;
    for (final t in order.timeline) { if (t.key == 'delivered') deliveredAt = t.date; }
    final firstPending = order.timeline.indexWhere((t) => !t.done);
    final (String payLabel, String payTone) = order.refunded ? ('Refunded', 'primary') : order.paid ? ('Paid', 'success') : cancelled ? ('Not charged', 'neutral') : ('Due on delivery', 'warning');

    void receipt() {
      final lines = [
        'AutoBiz · Order ${order.id}', 'Placed ${f.datetime(order.date)}', '',
        ...order.items.map((i) => '${i.qty} × ${i.name} — ${f.naira(i.price * i.qty)}'), '',
        'Subtotal: ${f.naira(order.subtotal)}', if (order.coupon != null) 'Coupon (${order.coupon}): −${f.naira(order.discount)}',
        'Delivery: ${order.deliveryFee > 0 ? f.naira(order.deliveryFee) : 'Free'}', 'Total: ${f.naira(order.total, 2)}',
        'Payment: ${order.payment == 'wallet' ? 'AutoBiz wallet' : 'Pay on delivery'} ($payLabel)', if (order.txId != null) 'Reference: ${order.txId}',
      ];
      shareText('Order ${order.id}', lines.join('\n'));
    }

    return AppScreen(
      header: AppHeader(title: order.id, subtitle: 'Placed ${f.datetime(order.date)}', fallback: '/orders', actions: [IconBtn('bi-copy', tooltip: 'Copy order ID', onPressed: () => copyText(order.id, 'Order ID copied'))]),
      children: [
        // ETA
        CardBox(
          elevated: false,
          color: cancelled ? c.dangerSoft : delivered ? c.successSoft : c.primarySoft,
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText(cancelled ? 'Order cancelled' : delivered ? 'Delivered' : 'Estimated delivery', v: TV.xs, muted: true),
              const SizedBox(height: 2),
              AppText(cancelled ? (order.refunded ? 'Refunded ${f.naira(order.total)}' : 'No charge') : delivered ? (deliveredAt != null ? f.date(deliveredAt) : 'Delivered') : order.eta, v: TV.h2),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              AppIcon(st.icon, size: 26, color: cancelled ? c.danger : delivered ? c.success : c.primary),
              const SizedBox(height: 6),
              StatusPill(order.status, label: st.label, tone: st.tone),
            ]),
          ]),
        ),
        const SizedBox(height: 12),
        // Timeline
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Padding(padding: EdgeInsets.only(bottom: 12), child: AppText('Tracking', v: TV.h3)),
            for (var i = 0; i < order.timeline.length; i++)
              Builder(builder: (context) {
                final t = order.timeline[i];
                final isCancel = t.key == 'cancelled';
                final current = !cancelled && i == firstPending;
                final last = i == order.timeline.length - 1;
                Widget dot;
                if (t.done) {
                  dot = Container(width: 24, height: 24, decoration: BoxDecoration(color: isCancel ? c.danger : c.success, shape: BoxShape.circle), child: Center(child: AppIcon(isCancel ? 'bi-x-lg' : 'bi-check-lg', size: 14, color: Colors.white)));
                } else if (current) {
                  dot = Container(width: 24, height: 24, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: c.primary, width: 3)), child: Center(child: Container(width: 8, height: 8, decoration: BoxDecoration(color: c.primary, shape: BoxShape.circle))));
                } else {
                  dot = Container(width: 24, height: 24, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: c.border, width: 2)));
                }
                return IntrinsicHeight(
                  child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    SizedBox(width: 24, child: Column(children: [dot, if (!last) Expanded(child: Container(width: 2, constraints: const BoxConstraints(minHeight: 26), color: t.done ? c.success : c.border))])),
                    const SizedBox(width: 12),
                    Expanded(child: Padding(
                      padding: EdgeInsets.only(bottom: last ? 0 : 14),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        AppText(t.label, weight: t.done || current ? FontWeight.w700 : FontWeight.w500, muted: !t.done && !current),
                        AppText(t.done ? '${t.note}${t.date != null ? ' · ${f.datetime(t.date!)}' : ''}' : t.note, v: TV.xs, muted: true),
                      ]),
                    )),
                  ]),
                );
              }),
          ]),
        ),
        const SizedBox(height: 12),
        // Items
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Padding(padding: const EdgeInsets.only(bottom: 6), child: AppText('Items ($units)', v: TV.h3)),
            for (var i = 0; i < order.items.length; i++)
              Builder(builder: (context) {
                final it = order.items[i];
                final brand = productById(it.id)?.brand ?? 'the brand';
                return Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(border: i > 0 ? Border(top: BorderSide(color: c.border)) : null),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Row(children: [
                      ProductArt(icon: it.icon, tone: it.tone, size: 56),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        AppText(it.name, v: TV.sm, weight: FontWeight.w600, maxLines: 2),
                        AppText('${it.qty} × ${f.naira(it.price)}${it.color != null ? ' · ${colorName(it.color)}' : ''} · ${it.seller}', v: TV.xs, muted: true),
                      ])),
                      const SizedBox(width: 8),
                      AppText(f.naira(it.price * it.qty), weight: FontWeight.w700, tabular: true),
                    ]),
                    if (it.codes != null && it.codes!.isNotEmpty) ...[
                      for (var n = 0; n < it.codes!.length; n++)
                        Container(
                          margin: const EdgeInsets.only(top: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.md), border: Border.all(color: cancelled ? c.border : c.warning, width: 1.5), color: cancelled ? null : c.warningSoft),
                          child: Row(children: [
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              AppText('Voucher code ${n + 1}', v: TV.xs, muted: true),
                              AppText(it.codes![n], weight: FontWeight.w700, tabular: true, strike: cancelled, muted: cancelled, selectable: !cancelled),
                            ])),
                            cancelled
                                ? AppText('Voided', v: TV.xs, weight: FontWeight.w700, color: c.danger)
                                : Btn('Copy', size: BtnSize.sm, variant: BtnVariant.soft, icon: 'bi-copy', onPressed: () => copyText(it.codes![n], 'Voucher code copied')),
                          ]),
                        ),
                      if (!cancelled) Padding(padding: const EdgeInsets.only(top: 8), child: AppText('Redeem on the official $brand website or app.', v: TV.xs, muted: true)),
                    ],
                  ]),
                );
              }),
          ]),
        ),
        const SizedBox(height: 12),
        // Address & delivery
        IntrinsicHeight(
          child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Expanded(child: CardBox(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppText(digital && order.method == 'digital' ? 'Delivered to' : order.method == 'pickup' ? 'Pickup station' : 'Ship to', v: TV.label, muted: true),
                const SizedBox(height: 6),
                AppText(order.address.name, v: TV.sm, weight: FontWeight.w600),
                const SizedBox(height: 2),
                AppText(order.method == 'digital' ? order.address.email : order.method == 'pickup' ? '${order.pickupHub}, ${order.address.state}' : '${order.address.street}, ${order.address.city}, ${order.address.state}', v: TV.xs, muted: true),
                AppText(order.address.phone, v: TV.xs, muted: true),
              ]),
            )),
            const SizedBox(width: 12),
            Expanded(child: CardBox(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const AppText('Delivery', v: TV.label, muted: true),
                const SizedBox(height: 6),
                AppText(methodLabel[order.method] ?? order.method, v: TV.sm, weight: FontWeight.w600),
                const SizedBox(height: 2),
                AppText(order.method == 'digital' ? 'Instant' : 'ETA ${order.eta}', v: TV.xs, muted: true),
              ]),
            )),
          ]),
        ),
        const SizedBox(height: 12),
        // Receipt
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Padding(padding: EdgeInsets.only(bottom: 10), child: AppText('Receipt', v: TV.h3)),
            Summary([
              SRow('Subtotal', f.naira(order.subtotal)),
              if (order.coupon != null) SRow('Coupon (${order.coupon})', '−${f.naira(order.discount)}', color: c.success),
              SRow('Delivery', order.deliveryFee > 0 ? f.naira(order.deliveryFee) : 'Free'),
              SRow('Total', f.naira(order.total, 2), bold: true),
              SRow('Payment', order.payment == 'wallet' ? 'AutoBiz wallet' : 'Pay on delivery'),
              SRow('Status', StatusPill(payLabel, tone: payTone)),
              if (order.txId != null) SRow('Reference', order.txId!),
            ]),
          ]),
        ),
        const SizedBox(height: 14),
        // Actions
        if (order.status == 'shipped') Padding(padding: const EdgeInsets.only(bottom: 10), child: Btn("I've received this order", icon: 'bi-check2-circle', full: true, onPressed: () => markReceived(order))),
        Row(children: [
          Expanded(child: Btn('Reorder items', icon: 'bi-arrow-repeat', variant: BtnVariant.soft, onPressed: () => reorder(order, () => context.push('/cart')))),
          const SizedBox(width: 10),
          Expanded(child: Btn('Share receipt', icon: 'bi-share', variant: BtnVariant.outline, onPressed: receipt)),
        ]),
        if (canCancel(order))
          Padding(padding: const EdgeInsets.only(top: 10), child: Btn('Cancel order', variant: BtnVariant.dangerSoft, icon: 'bi-x-circle', full: true, onPressed: () => openCancelOrder(order)))
        else if (order.status == 'processing' && digital)
          const Padding(padding: EdgeInsets.only(top: 10), child: Notice("Orders with digital codes can't be cancelled once codes are issued.", tone: 'warning')),
      ],
    );
  }
}
