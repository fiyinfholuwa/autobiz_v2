import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _reasons = ['Value not received', 'Debited twice', 'Wrong amount charged', 'Wrong recipient / number', 'Token not working', 'Other'];

/// Route: /transactions/:id — ported from mobile_app/src/app/transactions/[id].tsx
class TransactionDetailScreen extends StatelessWidget {
  final String id;
  /// query parameters
  final Map<String, String> q;
  const TransactionDetailScreen({super.key, required this.id, this.q = const {}});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final txId = Uri.decodeComponent(id);
    Tx? t;
    for (final x in s.transactions) { if (x.id == txId) { t = x; break; } }
    if (t == null) {
      return const AppScreen(
        header: AppHeader(title: 'Transaction details', fallback: '/transactions'),
        children: [EmptyState(icon: 'bi-receipt', tone: 'danger', title: 'Transaction not found', message: 'It may have been removed or the link is incorrect.')],
      );
    }
    final tx = t;
    final reference = tx.ref ?? tx.id;
    final rows = <SRow>[
      SRow('Type', txTypeLabel(tx.type)),
      SRow('Description', (tx.subtitle ?? '').isEmpty ? '—' : tx.subtitle!),
      SRow('Direction', tx.direction == 'in' ? 'Credit (money in)' : 'Debit (money out)'),
      for (final e in tx.meta.entries) SRow(e.key, e.value),
      SRow('Date', f.datetime(tx.date)),
      SRow('Transaction ID', tx.id),
    ];
    void share() => shareText('AutoBiz receipt', receiptText(tx.title, [SRow('Amount', f.naira(tx.amount, 2)), SRow('Status', tx.status), SRow('Reference', reference), ...rows]));

    return AppScreen(
      header: AppHeader(title: 'Transaction details', fallback: '/transactions', actions: [IconBtn('bi-share', tooltip: 'Share receipt', onPressed: share)]),
      footer: Row(children: [
        Expanded(child: Btn(tx.reported != null ? 'Reported' : 'Report issue', icon: 'bi-headset', variant: BtnVariant.outline, disabled: tx.reported != null, onPressed: () => showSheet(_ReportSheet(tx: tx)))),
        const SizedBox(width: 10),
        Expanded(child: Btn('Share receipt', icon: 'bi-share', onPressed: share)),
      ]),
      children: [
        const SizedBox(height: 8),
        CardBox(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: Column(children: [
            IconTile(tx.icon, tone: tx.tone, size: 60, rounded: true),
            const SizedBox(height: 12),
            AppText(tx.title, v: TV.title, center: true),
            const SizedBox(height: 6),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: AppText('${tx.direction == 'in' ? '+' : '−'}${f.naira(tx.amount, 2)}', v: TV.display, tabular: true, color: tx.direction == 'in' ? c.success : c.text),
            ),
            const SizedBox(height: 10),
            StatusPill(tx.status, label: tx.status == 'success' ? 'Successful' : null),
            if (tx.reported != null) ...[
              const SizedBox(height: 14),
              Notice('Issue reported · ticket ${tx.reported}', tone: 'warning', icon: 'bi-headset'),
            ],
          ]),
        ),
        const SizedBox(height: 14),
        _DashedBox(
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const AppText('Reference', v: TV.xs, muted: true),
              AppText(reference, weight: FontWeight.w700, selectable: true),
            ])),
            Btn('Copy', icon: 'bi-copy', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: () => copyText(reference, 'Reference copied')),
          ]),
        ),
        const SizedBox(height: 14),
        Summary(rows),
        const SizedBox(height: 16),
        const AppText('AutoBiz Technologies Ltd · support@autobiz.ng', v: TV.xs, muted: true, center: true),
      ],
    );
  }
}

class _DashedBox extends StatelessWidget {
  final Widget child;
  const _DashedBox({required this.child});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return CustomPaint(
      painter: _DashPainter(c.border),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(R.lg)),
        child: child,
      ),
    );
  }
}

class _DashPainter extends CustomPainter {
  final Color color;
  _DashPainter(this.color);
  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()..addRRect(RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(R.lg)));
    final p = Paint()..color = color..style = PaintingStyle.stroke..strokeWidth = 1.2;
    for (final m in path.computeMetrics()) {
      var d = 0.0;
      while (d < m.length) {
        canvas.drawPath(m.extractPath(d, d + 5), p);
        d += 9;
      }
    }
  }
  @override
  bool shouldRepaint(_DashPainter o) => o.color != color;
}

/* ---------------- Report an issue ---------------- */
class _ReportSheet extends StatefulWidget {
  final Tx tx;
  const _ReportSheet({required this.tx});
  @override
  State<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<_ReportSheet> {
  String? reason, errReason, errDetails;
  String details = '';
  bool busy = false;

  Future<void> _submit() async {
    final er = reason == null ? 'Please select a reason' : null;
    final ed = details.trim().length < 10 ? 'Please describe the issue (min 10 characters)' : null;
    setState(() { errReason = er; errDetails = ed; });
    if (er != null || ed != null) return;
    setState(() => busy = true);
    await sleep(900);
    final ticket = 'TCK-${rndDigits(6)}';
    store.mutate(() => widget.tx.reported = ticket);
    store.notify(icon: 'bi-headset', tone: 'primary', title: 'Support ticket opened', body: "$ticket: $reason — we'll respond within 24 hours.");
    if (mounted) Navigator.of(context).pop();
    toast('Report submitted · **$ticket**');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final t = widget.tx;
    return AppSheet(
      title: 'Report an issue',
      locked: busy,
      footer: Btn('Submit report', size: BtnSize.lg, full: true, loading: busy, loadingText: 'Submitting…', onPressed: _submit),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(R.lg)),
          child: Row(children: [
            IconTile(t.icon, tone: t.tone, size: 40),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText(t.title, weight: FontWeight.w600, maxLines: 1),
              AppText('${f.naira(t.amount, 2)} · ${f.datetime(t.date)}', v: TV.xs, muted: true),
            ])),
          ]),
        ),
        const SizedBox(height: 16),
        SelectField<String>(
          label: 'What went wrong?', placeholder: 'Select a reason', value: reason, error: errReason,
          options: [for (final r in _reasons) SelectOption(r, r)],
          onChanged: (v) => setState(() { reason = v; errReason = null; }),
        ),
        const SizedBox(height: 14),
        AppTextField(
          label: 'Details', placeholder: 'Tell us a little more…', multiline: true, maxLength: 500, value: details, error: errDetails,
          hint: '${details.length}/500',
          onChanged: (v) => setState(() { details = v; errDetails = null; }),
        ),
      ]),
    );
  }
}
