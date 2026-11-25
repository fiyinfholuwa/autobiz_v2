import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../features/esim/components.dart';
import '../../features/esim/logic.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /esim/:id — plan picker. [id] is the country code; q['topup'] = eSIM id for top-up/renew.
class EsimPlansScreen extends StatefulWidget {
  final String id;
  /// query parameters
  final Map<String, String> q;
  const EsimPlansScreen({super.key, required this.id, this.q = const {}});
  @override
  State<EsimPlansScreen> createState() => _EsimPlansScreenState();
}

class _EsimPlansScreenState extends State<EsimPlansScreen> {
  late final country = countryByCode(widget.id);
  late final plans = country != null ? plansFor(country!) : <Plan>[];
  late int sel = plans.indexWhere((p) => p.popular).clamp(0, plans.isEmpty ? 0 : plans.length - 1);
  int qty = 1;
  String device = '';
  bool devErr = false;

  String? get topupId => widget.q['topup'];
  bool get isTopup => topupId != null && topupId!.isNotEmpty;

  Future<void> _buy(Esim? esim) async {
    final c = country!;
    final p = plans[sel];
    final q = isTopup ? 1 : qty;
    final total = p.ngn * q;
    if (device.isNotEmpty && deviceOk(device) != true) {
      setState(() => devErr = true);
      toast("Your selected device doesn't support eSIM. Pick a compatible phone to continue.", type: ToastType.warning);
      return;
    }
    final ok = await confirmPay(PayOpts(
      title: isTopup ? 'Confirm eSIM top-up' : 'Confirm eSIM purchase',
      amount: total,
      rows: [
        SRow('Destination', c.name),
        SRow('Plan', '${p.label} · ${p.days} days'),
        isTopup ? SRow('eSIM', '•••• ${last4(esim!.iccid)}') : SRow('Quantity', '$q'),
        SRow('Price', '${f.usd(p.usd * q)} @ ₦1,580/\$'),
      ],
      cta: isTopup ? 'Confirm top-up' : 'Pay & get eSIM',
      note: 'eSIMs are delivered instantly. Unused, uninstalled eSIMs are refundable within 7 days.',
    ));
    if (!ok) return;
    final tx = store.debit(total, TxInput(
      type: 'esim',
      title: isTopup ? 'eSIM Top-up · ${c.name}' : 'eSIM · ${c.name}',
      subtitle: '${p.label} · ${p.days} days${q > 1 ? ' × $q' : ''}',
      icon: 'bi-sim', tone: 'violet',
    ));
    if (tx == null) { toast('Insufficient wallet balance', type: ToastType.error); return; }
    if (!mounted) return;
    if (isTopup) {
      finishTopup(esim!, p, tx);
      goBack(context, '/esim?tab=mine');
    } else {
      final router = GoRouter.of(context);
      finishPurchase(c, p, q, tx, (id) {
        if (id.isNotEmpty) {
          router.pushReplacement('/esim/install/$id');
        } else {
          router.go('/esim?tab=mine');
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    final col = context.c;
    Esim? esim;
    if (isTopup) { for (final e in s.esims) { if (e.id == topupId) esim = e; } }
    final c = country;
    if (c == null || (isTopup && esim == null)) {
      return AppScreen(
        header: const AppHeader(title: 'eSIM', fallback: '/esim'),
        children: [EmptyState(icon: 'bi-globe2', title: 'Destination not found', message: "This destination isn't available. Pick another country.", action: 'Browse destinations', onAction: () => context.go('/esim'))],
      );
    }
    final p = plans[sel];
    final q = isTopup ? 1 : qty;
    final total = p.ngn * q;
    final features = [
      ('ion:radio-outline', 'Networks', '${c.networks}${c.regional ? ' (best local network in each country)' : ''}'),
      ('bi-lightning-charge', 'Speed', '${c.speed}${c.speed.contains('5G') ? ' where available, 4G/LTE fallback' : ' LTE'}'),
      ('bi-wifi', 'Hotspot', 'Allowed — share with laptop & family'),
      ('bi-calendar3', 'Activation', 'Validity starts when the eSIM first connects in ${c.regional ? 'a covered country' : c.name}. Install within 180 days.'),
      ('bi-phone', 'Data only', 'Use WhatsApp, FaceTime & Zoom for calls'),
      ('bi-plus-lg', 'Top-up', 'Any time from My eSIMs'),
    ];
    final w = (MediaQuery.sizeOf(context).width - 42) / 2;
    return AppScreen(
      header: AppHeader(title: isTopup ? 'Top up eSIM' : c.name, subtitle: isTopup ? c.name : regionName(c.region), fallback: '/esim'),
      footer: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Expanded(child: AppText('Total', v: TV.sm, muted: true)),
          AppText(f.naira(total), v: TV.h2, tabular: true),
        ]),
        const SizedBox(height: 10),
        Btn('${isTopup ? 'Top up' : 'Buy'} · ${f.naira(total)}', icon: isTopup ? 'bi-plus-lg' : 'bi-bag-check', size: BtnSize.lg, full: true, onPressed: () => _buy(esim)),
        const SizedBox(height: 6),
        AppText('Wallet: ${f.naira(s.spendable, 2)}', v: TV.xs, muted: true, center: true),
      ]),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.xl), gradient: LinearGradient(colors: [col.primary700, const Color(0xFF0F3F3A)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
          child: Row(children: [
            CountryArt.of(c, size: 56),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText(isTopup ? 'Top up eSIM' : regionName(c.region), v: TV.label, color: const Color(0xBFFFFFFF)),
              AppText(c.name, v: TV.h2, color: Colors.white),
              AppText(isTopup ? 'Adds data & extends validity on ICCID •••• ${last4(esim!.iccid)}' : 'Data-only eSIM · Instant delivery', v: TV.xs, color: const Color(0xCCFFFFFF)),
            ])),
          ]),
        ),
        const SizedBox(height: 20),
        const AppText('Choose a plan', v: TV.h3),
        const AppText('Prices in USD · charged in ₦', v: TV.xs, muted: true),
        const SizedBox(height: 10),
        Wrap(spacing: 10, runSpacing: 10, children: [
          for (var i = 0; i < plans.length; i++)
            SizedBox(
              width: w,
              child: OptionCard(
                selected: sel == i,
                onTap: () => setState(() => sel = i),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  if (plans[i].popular) const Padding(padding: EdgeInsets.only(bottom: 6), child: Pill('Popular', tone: 'warning', solid: true)),
                  Row(children: [
                    if (plans[i].unlimited) ...[AppIcon('bi-infinity', size: 22, color: col.text), const SizedBox(width: 6)],
                    Flexible(child: AppText(plans[i].unlimited ? 'Unlimited' : plans[i].data, v: TV.h2, maxLines: 1)),
                  ]),
                  AppText('${plans[i].unlimited ? 'Unlimited · ' : ''}${plans[i].days} days', v: TV.xs, muted: true),
                  const SizedBox(height: 8),
                  AppText(f.usd(plans[i].usd), weight: FontWeight.w700, color: col.primary),
                  AppText(f.naira(plans[i].ngn), v: TV.xs, muted: true),
                ]),
              ),
            ),
        ]),
        if (!isTopup) ...[
          const SizedBox(height: 16),
          CardBox(child: DeviceCheck(value: device, onChanged: (v) => setState(() { device = v; devErr = false; }), error: devErr)),
        ],
        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const AppText('Coverage & features', v: TV.h3),
            const SizedBox(height: 10),
            for (final ft in features)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 7),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Padding(padding: const EdgeInsets.only(top: 1), child: AppIcon(ft.$1, size: 18, color: col.primary)),
                  const SizedBox(width: 12),
                  Expanded(child: RichAppText('**${ft.$2}:** ${ft.$3}', v: TV.sm)),
                ]),
              ),
          ]),
        ),
        const SizedBox(height: 16),
        Summary([
          SRow('Plan', '${p.unlimited ? 'Unlimited' : p.data} · ${p.days} days'),
          SRow('Price', '${f.usd(p.usd)}${q > 1 ? ' × $q' : ''}'),
          const SRow('Rate', '₦1,580/\$'),
        ], total: ('Total', f.naira(total))),
        if (!isTopup) ...[
          const SizedBox(height: 16),
          CardBox(
            child: Row(children: [
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppText('Quantity', weight: FontWeight.w600),
                AppText('One eSIM per device', v: TV.xs, muted: true),
              ])),
              QtyStepper(value: qty, onChanged: (v) => setState(() => qty = v.clamp(1, 5)), min: 1, max: 5),
            ]),
          ),
        ],
      ],
    );
  }
}
