/// Beneficiary strip, promo tile and recent purchases panel.
/// Port of mobile_app/src/features/bills/{Beneficiaries,PromoTile,RecentPanel}.tsx.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../data/catalog.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';
import 'shared.dart';

/// Horizontal strip of saved beneficiaries for one kind. Tap = pick, × = remove.
class BeneficiaryStrip extends StatelessWidget {
  final String kind;
  final ValueChanged<Beneficiary> onPick;
  final String? emptyText;
  const BeneficiaryStrip({super.key, required this.kind, required this.onPick, this.emptyText});

  @override
  Widget build(BuildContext context) {
    final list = context.watch<AppStore>().beneficiaries.where((b) => b.kind == kind).toList();
    if (list.isEmpty) {
      if (emptyText == null) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const AppText('Saved beneficiaries', v: TV.label, muted: true),
          const SizedBox(height: 6),
          AppText(emptyText!, v: TV.xs, muted: true),
        ]),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const AppText('Saved beneficiaries', v: TV.label, muted: true),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: [
            for (final b in list) ...[
              _BenChip(b: b, onPick: () => onPick(b), net: b.network != null ? networkById(b.network!) : null),
              const SizedBox(width: 10),
            ],
          ]),
        ),
      ]),
    );
  }
}

class _BenChip extends StatelessWidget {
  final Beneficiary b;
  final VoidCallback onPick;
  final Network? net;
  const _BenChip({required this.b, required this.onPick, this.net});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final ini = f.phraseInitials(b.label);
    return Semantics(
      button: true, label: 'Use ${b.label}',
      child: Stack(children: [
        Material(
          color: c.surface2,
          borderRadius: BorderRadius.circular(R.lg),
          child: InkWell(
            borderRadius: BorderRadius.circular(R.lg),
            onTap: () { tapHaptic(); onPick(); },
            child: Container(
              width: 88,
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
              child: Column(children: [
                Stack(clipBehavior: Clip.none, children: [
                  Avatar(ini.isEmpty ? '?' : ini, size: 42),
                  if (net != null)
                    Positioned(
                      right: -3, bottom: -3,
                      child: Container(
                        decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: c.surface2, width: 2)),
                        child: NetworkLogo(net!.logo, size: 18),
                      ),
                    ),
                ]),
                const SizedBox(height: 6),
                AppText(b.label, v: TV.xs, weight: FontWeight.w600, maxLines: 1),
                AppText(maskValue(b.value), size: 11, muted: true, tabular: true),
              ]),
            ),
          ),
        ),
        Positioned(
          top: 4, right: 4,
          child: Semantics(
            button: true, label: 'Remove ${b.label}',
            child: GestureDetector(
              onTap: () => removeBeneficiary(b.id),
              child: Container(
                width: 20, height: 20,
                decoration: BoxDecoration(color: c.surface, shape: BoxShape.circle),
                child: Center(child: AppIcon('bi-x', size: 13, color: c.muted)),
              ),
            ),
          ),
        ),
      ]),
    );
  }
}

class _Promo {
  final List<Color>? colors;
  final String icon, title, body, cta;
  final void Function(BuildContext) go;
  const _Promo({this.colors, required this.icon, required this.title, required this.body, required this.cta, required this.go});
}

final Map<String, _Promo> _promos = {
  'airtime': _Promo(colors: [hexColor('#f59f00'), hexColor('#e8590c')], icon: 'bi-phone-vibrate', title: '2% back on every top-up', body: 'Airtime purchases earn instant cashback into your wallet.', cta: 'Upgrade to reseller', go: (c) => c.push('/settings/verification?upgrade=1')),
  'data': _Promo(icon: 'bi-wifi', title: 'Travelling soon?', body: 'Skip roaming. Get an eSIM with data in 120+ countries.', cta: 'Browse eSIMs', go: (c) => c.push('/esim')),
  'electricity': _Promo(colors: [hexColor('#fd7e14'), hexColor('#d6336c')], icon: 'bi-lightning-charge', title: 'Never run out of units', body: 'Save your meter and recharge in 2 taps — token arrives instantly.', cta: 'View history', go: (c) => c.push('/transactions?type=electricity')),
  'cable': _Promo(colors: [hexColor('#1098ad'), hexColor('#0b6b8a')], icon: 'bi-tv', title: 'Stream on Netflix & Showmax', body: 'Pay for global subscriptions with a USD virtual card.', cta: 'Get a USD card', go: (c) => c.go('/cards')),
  'betting': _Promo(colors: [hexColor('#12b886'), hexColor('#087f5b')], icon: 'bi-trophy', title: 'Instant wallet funding', body: 'Zero fees on all betting platforms. Funds reflect in seconds.', cta: 'Fund wallet', go: (_) => openFund()),
  'education': _Promo(colors: [hexColor('#7048e8'), hexColor('#4c2bd1')], icon: 'bi-mortarboard', title: 'Bulk PINs for schools', body: 'Buy up to 5 PINs per order. Resellers get extra discounts.', cta: 'Upgrade account', go: (c) => c.push('/settings/verification?upgrade=1')),
};

class PromoTile extends StatelessWidget {
  final String tab;
  const PromoTile({super.key, required this.tab});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final p = _promos[tab]!;
    final br = BorderRadius.circular(R.xl);
    return Container(
      decoration: BoxDecoration(borderRadius: br, gradient: LinearGradient(colors: p.colors ?? [c.primary, c.primary700], begin: Alignment.topLeft, end: Alignment.bottomRight)),
      clipBehavior: Clip.antiAlias,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: () => p.go(context),
          child: Stack(children: [
            Positioned(right: -18, bottom: -22, child: Opacity(opacity: 0.18, child: AppIcon(p.icon, size: 120, color: Colors.white))),
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.22), borderRadius: BorderRadius.circular(R.pill)),
                  child: const AppText('Offer', size: 11, weight: FontWeight.w700, color: Colors.white),
                ),
                const SizedBox(height: 10),
                FractionallySizedBox(widthFactor: 0.8, alignment: Alignment.centerLeft, child: AppText(p.title, v: TV.h3, color: Colors.white)),
                const SizedBox(height: 4),
                FractionallySizedBox(widthFactor: 0.85, alignment: Alignment.centerLeft, child: AppText(p.body, v: TV.sm, color: Colors.white.withValues(alpha: 0.88))),
                const SizedBox(height: 12),
                Row(children: [
                  AppText(p.cta, v: TV.sm, weight: FontWeight.w700, color: Colors.white),
                  const SizedBox(width: 6),
                  const AppIcon('bi-arrow-right', size: 16, color: Colors.white),
                ]),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

class RecentPanel extends StatelessWidget {
  final String tab;
  const RecentPanel({super.key, required this.tab});
  @override
  Widget build(BuildContext context) {
    final meta = billTab(tab);
    final list = context.watch<AppStore>().transactions.where((t) => t.type == tab).take(5).toList();
    final lbl = meta.label.toLowerCase();
    return CardBox(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SectionHeader('Recent $lbl purchases', action: 'See all', onAction: () => context.push(loc('/transactions', {'type': tab}))),
        if (list.isNotEmpty)
          for (final t in list) TxRow(t)
        else
          EmptyState(icon: meta.icon, tone: meta.tone, title: 'No $lbl purchases yet', message: 'Your recent purchases will show up here.'),
      ]),
    );
  }
}
