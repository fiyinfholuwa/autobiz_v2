import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../store/app_store.dart';
import '../../ui/ui.dart';
import 'logic.dart';

const coupons = {'AUTOBIZ10': (pct: 10, label: '10% off your order')};

class Totals {
  final List<CartLine> items;
  final double sub, discount, delivery, total;
  final int units;
  final String? coupon;
  final String method;
  final bool digital, free;
  const Totals({required this.items, required this.sub, required this.units, required this.coupon, required this.discount, required this.method, required this.delivery, required this.total, required this.digital, required this.free});
}

Totals computeTotals(AppStore s, String method, String state) {
  final items = s.cart;
  final coupon = s.coupon != null && coupons.containsKey(s.coupon) ? s.coupon : null;
  final sub = items.fold(0.0, (a, l) => a + l.price * l.qty);
  final units = items.fold(0, (a, l) => a + l.qty);
  final discount = coupon != null ? (sub * coupons[coupon]!.pct / 100).roundToDouble() : 0.0;
  final m = allDigital(items) ? 'digital' : method;
  final delivery = deliveryFee(items, m, state);
  return Totals(items: items, sub: sub, units: units, coupon: coupon, discount: discount, method: m, delivery: delivery, total: math.max(0, sub - discount + delivery), digital: allDigital(items), free: allFree(items));
}

class CouponBox extends StatefulWidget {
  const CouponBox({super.key});
  @override
  State<CouponBox> createState() => _CouponBoxState();
}

class _CouponBoxState extends State<CouponBox> {
  String val = '';
  String? err;
  bool busy = false;

  Future<void> _apply() async {
    final v = val.trim().toUpperCase();
    if (v.isEmpty) { setState(() => err = 'Enter a coupon code.'); return; }
    setState(() { busy = true; err = null; });
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    setState(() => busy = false);
    if (!coupons.containsKey(v)) { setState(() => err = '“$v” is invalid or has expired.'); return; }
    store.mutate(() => store.coupon = v);
    setState(() => val = '');
    toast('Coupon **$v** applied — ${coupons[v]!.label}');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final code = context.watch<AppStore>().coupon;
    if (code != null && coupons.containsKey(code)) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: c.successSoft, borderRadius: BorderRadius.circular(R.md)),
        child: Row(children: [
          AppIcon('bi-tag', size: 18, color: c.success),
          const SizedBox(width: 8),
          Expanded(child: Text.rich(TextSpan(style: tvStyle(context, TV.sm, color: c.success), children: [
            TextSpan(text: '$code · ', style: const TextStyle(fontWeight: FontWeight.w700)),
            TextSpan(text: coupons[code]!.label),
          ]))),
          GestureDetector(
            onTap: () { store.mutate(() => store.coupon = null); toast('Coupon removed', type: ToastType.info); },
            child: Semantics(label: 'Remove coupon', child: AppIcon('bi-x-lg', size: 16, color: c.success)),
          ),
        ]),
      );
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: AppTextField(icon: 'bi-tag', placeholder: 'Coupon code', textCapitalization: TextCapitalization.characters, value: val, error: err, onChanged: (t) => setState(() { val = t.toUpperCase(); err = null; }), onSubmitted: (_) => _apply())),
        const SizedBox(width: 8),
        SizedBox(height: 50, child: Btn('Apply', variant: BtnVariant.soft, loading: busy, loadingText: '…', onPressed: _apply)),
      ]),
      if (err == null)
        Padding(
          padding: const EdgeInsets.only(top: 5),
          child: Text.rich(TextSpan(style: tvStyle(context, TV.xs, muted: true), children: const [
            TextSpan(text: 'Try '), TextSpan(text: 'AUTOBIZ10', style: TextStyle(fontWeight: FontWeight.w700)), TextSpan(text: ' for 10% off'),
          ])),
        ),
    ]);
  }
}

class SummaryCard extends StatelessWidget {
  final Totals t;
  final String deliveryNote;
  final bool showItems;
  final Widget? child;
  const SummaryCard({super.key, required this.t, required this.deliveryNote, this.showItems = false, this.child});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    Widget row(String k, String v, [Color? color]) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(children: [Expanded(child: AppText(k, v: TV.sm, muted: true)), AppText(v, v: TV.sm, weight: FontWeight.w600, tabular: true, color: color)]),
        );
    return CardBox(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const AppText('Order summary', v: TV.h3),
        const SizedBox(height: 12),
        if (showItems)
          for (final l in t.items)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  AppText(l.name, v: TV.sm, weight: FontWeight.w600, maxLines: 1),
                  AppText('Qty ${l.qty}${l.color != null ? ' · ${colorName(l.color)}' : ''}', v: TV.xs, muted: true),
                ])),
                const SizedBox(width: 10),
                AppText(f.naira(l.price * l.qty), v: TV.sm, weight: FontWeight.w600, tabular: true),
              ]),
            ),
        const CouponBox(),
        const SizedBox(height: 12),
        row('Subtotal (${t.units} item${t.units == 1 ? '' : 's'})', f.naira(t.sub)),
        if (t.coupon != null) row('Coupon (${t.coupon})', '−${f.naira(t.discount)}', c.success),
        row('Delivery $deliveryNote'.trim(), t.digital ? 'Instant · Free' : t.delivery > 0 ? f.naira(t.delivery) : 'Free', t.delivery > 0 ? null : c.success),
        Container(height: 1, color: c.border, margin: const EdgeInsets.only(bottom: 10)),
        Row(children: [const Expanded(child: AppText('Total', weight: FontWeight.w700)), AppText(f.naira(t.total), v: TV.h2, tabular: true)]),
        if (t.free && !t.digital) const Padding(padding: EdgeInsets.only(top: 12), child: Notice('All items qualify for free standard delivery.', tone: 'success', icon: 'bi-truck')),
        if (child != null) Padding(padding: const EdgeInsets.only(top: 12), child: child!),
        const SizedBox(height: 12),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          AppIcon('bi-lock', size: 12, color: c.muted),
          const SizedBox(width: 6),
          const AppText('Payments secured with 256-bit encryption', v: TV.xs, muted: true),
        ]),
      ]),
    );
  }
}
