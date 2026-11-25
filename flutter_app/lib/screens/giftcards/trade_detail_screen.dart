import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/format.dart' as f;
import '../../features/giftcards/components.dart';
import '../../features/giftcards/logic.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /giftcards/trade/:id — trade details with live progress (members only).
class TradeDetailScreen extends StatefulWidget {
  final String id;
  /// query parameters
  final Map<String, String> q;
  const TradeDetailScreen({super.key, required this.id, this.q = const {}});
  @override
  State<TradeDetailScreen> createState() => _TradeDetailScreenState();
}

class _TradeDetailScreenState extends State<TradeDetailScreen> {
  Timer? _t;
  @override
  void initState() {
    super.initState();
    _t = Timer.periodic(const Duration(seconds: 1), (_) { if (mounted) setState(() {}); });
  }
  @override
  void dispose() { _t?.cancel(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    final c = context.c;
    final id = Uri.decodeComponent(widget.id);
    Trade? found;
    for (final x in s.trades) { if (x.id == id) found = x; }
    if (found == null) {
      return AppScreen(
        header: const AppHeader(title: 'Trade details', fallback: '/giftcards?tab=trades'),
        children: [EmptyState(icon: 'bi-gift', title: 'Trade not found', action: 'My trades', onAction: () => context.go('/giftcards?tab=trades'))],
      );
    }
    final t = found;
    final buy = t.side == 'buy';
    final failed = t.status == 'Failed';
    final label = buy ? 'You paid' : failed ? 'Not paid' : t.status == 'Completed' ? 'You received' : "You'll receive";
    final rows = <SRow>[
      SRow('Trade ID', Row(mainAxisSize: MainAxisSize.min, children: [
        Flexible(child: AppText(t.id, v: TV.sm, weight: FontWeight.w600, selectable: true)),
        const SizedBox(width: 6),
        IconBtn('bi-copy', size: 28, bg: c.surface, tooltip: 'Copy trade ID', onPressed: () => copyText(t.id, 'Trade ID copied')),
      ])),
      SRow('Card', '${t.country} · ${t.type}'),
      SRow('Value', '${t.qty > 1 ? '${t.qty} × \$${dollars(t.face)} = ' : ''}${f.usd(t.usd)}'),
      SRow('Rate', '₦${rateStr(t.rate)}/\$${t.bonus > 0 ? ' (incl. bonus)' : ''}'),
      if (buy) ...[SRow('Fee', f.naira(t.fee ?? 0)), SRow('Delivered to', t.email ?? '—')]
      else t.codes.isNotEmpty ? SRow('E-codes', t.codes.join('\n')) : SRow('Photos', '${t.images ?? 0} uploaded'),
      if (t.note != null && t.note!.isNotEmpty) SRow('Note', t.note!),
    ];
    return AppScreen(
      header: const AppHeader(title: 'Trade details', fallback: '/giftcards?tab=trades'),
      footer: Row(children: [
        Expanded(child: Btn('Get help', icon: 'bi-headset', variant: BtnVariant.outline, onPressed: () => launchUrl(Uri.parse('mailto:support@autobiz.ng?subject=Trade%20${t.id}')))),
        const SizedBox(width: 10),
        Expanded(
          child: buy
              ? Btn('Buy again', onPressed: () => context.go(loc('/giftcards', {'tab': 'buy', 'brand': t.card, 'face': dollars(t.face)})))
              : Btn('Sell another', onPressed: () => context.go(loc('/giftcards', {'tab': 'sell', 'card': t.card, 'country': t.country, 'type': t.type, 'step': '3'}))),
        ),
      ]),
      children: [
        CardBox(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            CardTile(t.card, size: 48),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText(t.cardName, weight: FontWeight.w700),
              AppText('${buy ? 'Bought' : 'Sold'} · ${f.datetime(t.createdAt)}', v: TV.xs, muted: true),
            ])),
            StatusPill(t.status, tone: statusTone[t.status]),
          ]),
          if (failed) ...[
            const SizedBox(height: 14),
            Notice('**Reason:** ${t.reason}\nNo money was deducted. Contact support if you think this is a mistake.', tone: 'danger', icon: 'bi-x-octagon'),
          ],
          const SizedBox(height: 18),
          Center(child: Column(children: [
            AppText(label, v: TV.label, muted: true),
            AppText(f.naira(t.naira), v: TV.display, tabular: true, strike: failed, color: failed ? c.muted : buy ? c.text : c.success),
            if (!buy && !failed && t.status != 'Completed') Padding(padding: const EdgeInsets.only(top: 10), child: SizedBox(width: 200, child: ProgressBar(tradeProgress(t) / 100))),
          ])),
          const SizedBox(height: 18),
          Summary(rows),
          if (buy && t.codes.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 12), child: CodesBlock(t.codes)),
        ])),
        const SizedBox(height: 16),
        CardBox(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const AppText('Progress', v: TV.h3),
          const SizedBox(height: 12),
          _Timeline(t),
        ])),
      ],
    );
  }
}

class _Timeline extends StatelessWidget {
  final Trade t;
  const _Timeline(this.t);
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final b = brand(t.card).name;
    int? at(String st) { for (final x in t.timeline) { if (x.s == st) return x.at; } return null; }
    final steps = t.side == 'buy'
        ? [('Pending', 'Payment received', 'Debited from your wallet'), ('Processing', 'Code generated', 'Issued by $b'), ('Completed', 'Delivered', 'Sent to ${t.email}')]
        : [
            ('Pending', 'Trade submitted', 'We received your card details'),
            ('Processing', 'Verifying card', 'Our team is checking your card'),
            t.status == 'Failed' ? ('Failed', 'Trade declined', t.reason ?? '') : ('Completed', 'Paid to wallet', '${f.naira(t.naira)} credited'),
          ];
    return Column(children: [
      for (var i = 0; i < steps.length; i++)
        Builder(builder: (_) {
          final st = steps[i];
          final reached = at(st.$1);
          final nextReached = i + 1 < steps.length ? at(steps[i + 1].$1) : null;
          final state = st.$1 == 'Failed' && reached != null ? 'fail' : reached != null && (nextReached != null || t.status == 'Completed') ? 'done' : reached != null ? 'now' : 'pending';
          final color = state == 'fail' ? c.danger : state == 'done' ? c.success : state == 'now' ? c.primary : c.border;
          return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Column(children: [
              Container(
                width: 26, height: 26,
                decoration: BoxDecoration(shape: BoxShape.circle, color: state == 'pending' ? c.surface2 : color, border: state == 'now' ? Border.all(color: c.primarySoft, width: 3) : null),
                child: Center(child: state == 'done'
                    ? const AppIcon('bi-check-lg', size: 14, color: Colors.white)
                    : state == 'fail' ? const AppIcon('bi-x-lg', size: 13, color: Colors.white)
                    : state == 'now' ? Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)) : null),
              ),
              if (i < steps.length - 1) Container(width: 2, height: 34, color: state == 'done' ? c.success : c.border),
            ]),
            const SizedBox(width: 12),
            Expanded(child: Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  AppText(st.$2, weight: FontWeight.w600),
                  if (state == 'now') ...[const SizedBox(width: 6), const Pill('In progress')],
                ]),
                AppText(reached != null ? '${st.$3} · ${f.datetime(reached)}' : 'Waiting…', v: TV.xs, muted: true),
              ]),
            )),
          ]);
        }),
    ]);
  }
}
