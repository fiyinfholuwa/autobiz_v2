/// Airtime, Data & Bills — web: app/bills.html · RN: mobile_app/src/app/(tabs)/pay.tsx
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../features/bills/betting_pane.dart';
import '../../features/bills/cable_pane.dart';
import '../../features/bills/education_pane.dart';
import '../../features/bills/electricity_pane.dart';
import '../../features/bills/mobile_pane.dart';
import '../../features/bills/panels.dart';
import '../../features/bills/shared.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /pay  (tab screen) — query: tab, phone
class PayScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const PayScreen({super.key, this.q = const {}});
  @override
  State<PayScreen> createState() => _PayScreenState();
}

class _PayScreenState extends State<PayScreen> {
  late String tab = isBillTab(widget.q['tab']) ? widget.q['tab']! : 'airtime';

  @override
  void didUpdateWidget(PayScreen old) {
    super.didUpdateWidget(old);
    final t = widget.q['tab'];
    if (isBillTab(t) && t != tab) setState(() => tab = t!);
    final p = widget.q['phone'];
    if (p != null && p.isNotEmpty && p != old.q['phone'] && tab != 'airtime' && tab != 'data') setState(() => tab = 'airtime');
  }

  void _select(String t) {
    setState(() => tab = t);
    // keep the URL in sync so links like /pay?tab=cable always switch tabs
    context.go(loc('/pay', {...widget.q, 'tab': t}));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final meta = billTab(tab);
    final phone = widget.q['phone'];

    return AppScreen(
      bottomInset: tabBarSpace,
      header: AppHeader(
        back: false,
        title: 'Airtime, Data & Bills',
        subtitle: 'Instant top-ups and bill payments, 24/7',
        actions: [
          IconBtn('bi-receipt-cutoff', tooltip: 'History', onPressed: () => context.push('/transactions')),
          IconBtn('bi-plus-lg', tooltip: 'Fund wallet', color: Colors.white, bg: c.primary, onPressed: openFund),
        ],
      ),
      children: [
        // Wallet strip
        Material(
          color: c.primarySoft,
          borderRadius: BorderRadius.circular(R.lg),
          child: InkWell(
            borderRadius: BorderRadius.circular(R.lg),
            onTap: openFund,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(children: [
                AppIcon('bi-wallet2', size: 20, color: c.primary),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const AppText('Wallet balance', v: TV.xs, muted: true),
                  AppText(s.authed ? (s.settings.hideBalance ? '₦ ••••••' : f.naira(s.balance, 2)) : 'Log in to pay', weight: FontWeight.w700, tabular: true),
                ])),
                AppText('Fund +', v: TV.sm, weight: FontWeight.w700, color: c.primary),
              ]),
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Tabs
        SizedBox(
          height: 96,
          child: OverflowBox(
            maxWidth: MediaQuery.sizeOf(context).width,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: billTabs.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, i) {
                final t = billTabs[i];
                final on = t.id == tab;
                final tc = context.tone(t.tone);
                return Semantics(
                  selected: on, button: true, label: t.label,
                  child: Material(
                    color: on ? c.surface : Colors.transparent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.lg), side: BorderSide(color: on ? c.primary : c.border, width: 1.5)),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(R.lg),
                      onTap: () { tapHaptic(); _select(t.id); },
                      child: SizedBox(
                        width: 82,
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            width: 40, height: 40,
                            decoration: BoxDecoration(color: on ? tc.fg : tc.bg, borderRadius: BorderRadius.circular(13)),
                            child: Center(child: AppIcon(t.icon, size: 20, color: on ? Colors.white : tc.fg)),
                          ),
                          const SizedBox(height: 6),
                          AppText(t.label, size: 12, weight: on ? FontWeight.w700 : FontWeight.w600, color: on ? c.text : c.muted, maxLines: 1),
                        ]),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 14),

        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Row(children: [
                Expanded(child: AppText(meta.label, v: TV.h3)),
                AppText(tab == 'airtime' ? '2% cashback' : tab == 'betting' ? 'Zero fees' : 'Instant delivery', v: TV.xs, muted: true),
              ]),
            ),
            switch (tab) {
              'airtime' || 'data' => MobilePane(mode: tab, initialPhone: phone),
              'electricity' => const ElectricityPane(),
              'cable' => const CablePane(),
              'betting' => const BettingPane(),
              _ => const EducationPane(),
            },
          ]),
        ),
        const SizedBox(height: 16),
        PromoTile(tab: tab),
        const SizedBox(height: 16),
        RecentPanel(tab: tab),
      ],
    );
  }
}
