/// Gift card UI pieces — ported from mobile_app/src/features/giftcards/components.tsx.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart' as f;
import '../../store/app_store.dart';
import '../../ui/ui.dart';
import 'logic.dart';

/// darken a colour ~35%
Color shade(Color c, [double amt = 0.35]) => Color.fromARGB(255, ((c.r * 255) * (1 - amt)).round(), ((c.g * 255) * (1 - amt)).round(), ((c.b * 255) * (1 - amt)).round());

/// Brand gradient tile
class CardTile extends StatelessWidget {
  final String id;
  final double size;
  const CardTile(this.id, {super.key, this.size = 48});
  @override
  Widget build(BuildContext context) {
    final b = brand(id);
    final col = Color(b.color);
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(size * 0.28), gradient: LinearGradient(colors: [col, shade(col)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
      child: Center(child: AppIcon(b.icon, size: size * 0.48, color: Colors.white)),
    );
  }
}

class CountryFlag extends StatelessWidget {
  final String country;
  final double size;
  const CountryFlag(this.country, {super.key, this.size = 22});
  @override
  Widget build(BuildContext context) {
    final code = flags[country];
    return code != null ? FlagImg(code, size: size) : AppIcon('bi-globe2', size: size, color: context.c.muted);
  }
}

class TradeRow extends StatelessWidget {
  final Trade t;
  const TradeRow(this.t, {super.key});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final active = t.status == 'Pending' || t.status == 'Processing';
    final buy = t.side == 'buy';
    final failed = t.status == 'Failed';
    return ListRow(
      onTap: () => context.push('/giftcards/trade/${Uri.encodeComponent(t.id)}'),
      leading: CardTile(t.card, size: 44),
      title: t.cardName,
      subtitle: '${t.qty > 1 ? '${t.qty} × \$${dollars(t.face)}' : f.usd(t.usd)} · ${t.type} · ${t.country} · ${f.ago(t.createdAt)}',
      trailing: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 150),
        child: Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [
          AppText('${buy ? '−' : '+'}${f.naira(t.naira)}', weight: FontWeight.w700, tabular: true, strike: failed, color: failed ? c.muted : buy ? c.text : c.success),
          const SizedBox(height: 4),
          Row(mainAxisSize: MainAxisSize.min, children: [
            Pill(buy ? 'Bought' : 'Sold', tone: buy ? 'violet' : 'pink'),
            const SizedBox(width: 4),
            StatusPill(t.status, tone: statusTone[t.status]),
          ]),
          if (active) ...[const SizedBox(height: 4), SizedBox(width: 90, child: ProgressBar(tradeProgress(t) / 100, height: 4))],
        ]),
      ),
    );
  }
}

/// Codes list with reveal/hide + copy (buy-side).
class CodesBlock extends StatefulWidget {
  final List<String> codes;
  const CodesBlock(this.codes, {super.key});
  @override
  State<CodesBlock> createState() => _CodesBlockState();
}

class _CodesBlockState extends State<CodesBlock> {
  final shown = <int>{};
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final codes = widget.codes;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      for (var i = 0; i < codes.length; i++)
        Container(
          margin: EdgeInsets.only(top: i > 0 ? 8 : 0),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.md), border: Border.all(color: c.primary300), color: c.primarySoft),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText('Code ${codes.length > 1 ? i + 1 : ''}', v: TV.xs, muted: true),
              AppText(shown.contains(i) ? codes[i] : '••••-••••-••••-${codes[i].substring(codes[i].length - 4)}', weight: FontWeight.w700, tabular: true, selectable: true),
            ])),
            IconBtn(shown.contains(i) ? 'bi-eye-slash' : 'bi-eye', size: 34, tooltip: shown.contains(i) ? 'Hide code' : 'Reveal code', onPressed: () => setState(() => shown.contains(i) ? shown.remove(i) : shown.add(i))),
            const SizedBox(width: 6),
            IconBtn('bi-copy', size: 34, tooltip: 'Copy code', onPressed: () => copyText(codes[i], 'Gift card code copied')),
          ]),
        ),
    ]);
  }
}
