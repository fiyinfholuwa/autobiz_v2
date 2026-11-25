import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../features/cards/card_visual.dart';
import '../../features/cards/constants.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _steps = ['Brand', 'Design', 'Details', 'Review'];

/// Route: /cards/create — 4-step USD card wizard. Ported from mobile_app/src/app/cards/create.tsx.
class CardCreateScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const CardCreateScreen({super.key, this.q = const {}});
  @override
  State<CardCreateScreen> createState() => _CardCreateScreenState();
}

class _CardCreateScreenState extends State<CardCreateScreen> {
  int step = 0;
  String brand = 'visa';
  late CardDesign theme = themes[store.cards.length % themes.length];
  late String label = store.cards.isNotEmpty ? 'Card ${store.cards.length + 1}' : 'Online Shopping';
  String amountStr = '10';
  String? labelErr, amountErr;
  bool busy = false;

  double get amount => double.tryParse(amountStr) ?? 0;

  bool _validateDetails() {
    String? le, ae;
    if (label.trim().length < 2) le = 'Enter a nickname (2–20 characters).';
    if (amount == 0 || amount < minCreate) {
      ae = r'Minimum initial funding is $5.00.';
    } else if (amount > maxInitial) {
      ae = r'Maximum initial funding is $2,500.';
    } else if (RegExp(r'\.\d{3,}$').hasMatch(amountStr)) {
      ae = 'Use at most 2 decimal places.';
    }
    setState(() { labelErr = le; amountErr = ae; });
    return le == null && ae == null;
  }

  void _next() {
    if (step == 2 && !_validateDetails()) return;
    if (step < 3) {
      setState(() => step++);
    } else {
      _pay();
    }
  }

  void _back() => step == 0 ? goBack(context, '/cards') : setState(() => step--);

  Future<void> _pay() async {
    if (store.cards.length >= maxCards) { toast('You can have up to 5 cards. Terminate one to create another.', type: ToastType.warning); return; }
    final cost = createCost(amount);
    setState(() => busy = true);
    await sleep(320);
    final name = label.trim();
    final ok = await confirmPay(PayOpts(
      title: 'Create USD card', amount: cost.naira, cta: 'Create card',
      rows: [SRow('Card', '${brandName(brand)} · $name'), SRow('Initial balance', f.usd(amount)), SRow('Fees', f.usd(2 + cost.fee)), const SRow('Rate', '₦1,580/\$')],
    ));
    if (mounted) setState(() => busy = false);
    if (!ok) return;
    final tx = store.debit(cost.naira, TxInput(type: 'card', title: 'Virtual Card Created', subtitle: '${brandName(brand)} · $name · ${f.usd(amount)}', icon: 'bi-credit-card-2-front', tone: 'success'));
    if (tx == null) { toast('Insufficient wallet balance', type: ToastType.error); return; }
    final holder = store.user.fullName;
    final card = buildCard(brand: brand, theme: theme, label: name, amount: amount, holder: holder.toUpperCase());
    store.mutate(() => store.cards.add(card));
    store.notify(icon: 'bi-credit-card-2-front', tone: 'success', title: 'Your USD card is ready', body: '$name (•••• ${last4(card.number)}) funded with ${f.usd(card.balance)}.');
    CardsUI.select(card.id);
    if (mounted) context.go('/cards');
    final b = brandName(brand);
    Future.delayed(const Duration(milliseconds: 350), () => success(SuccessOpts(
      title: 'Card created!',
      message: 'Your $b USD card is ready to use online.',
      rows: [SRow('Card', '•••• ${last4(card.number)}'), SRow('Balance', f.usd(card.balance)), SRow('Charged', f.naira(cost.naira, 2)), SRow('Reference', tx.id)],
      actions: [SuccessAction('Reveal details', () => CardsUI.requestReveal(card.id), icon: 'bi-eye')],
    )));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final cost = createCost(amount);
    final holder = s.user.fullName;
    final preview = CardFaceData(brand: brand, theme: theme, label: label.trim().isEmpty ? 'Card' : label.trim(), balance: amount, number: previewNumber[brand]!, holder: holder);

    return PopScope(
      canPop: step == 0 && !busy,
      onPopInvokedWithResult: (didPop, _) { if (!didPop && !busy && step > 0) setState(() => step--); },
      child: AppScreen(
        header: AppHeader(title: 'Create USD card', subtitle: 'Step ${step + 1} of 4 · ${_steps[step]}', onBack: _back, fallback: '/cards'),
        footer: Row(children: [
          Expanded(child: Btn(step == 0 ? 'Cancel' : 'Back', variant: BtnVariant.outline, disabled: busy, onPressed: _back)),
          const SizedBox(width: 10),
          Expanded(
            flex: 2,
            child: Btn(step == 3 ? 'Pay ${f.naira(cost.naira, 2)}' : 'Continue', icon: step == 3 ? 'bi-lock-fill' : null, iconRight: step < 3 ? 'bi-arrow-right' : null, loading: busy, onPressed: _next),
          ),
        ]),
        children: [
          // Stepper
          Row(children: [
            for (var i = 0; i < _steps.length; i++) ...[
              if (i > 0) const SizedBox(width: 6),
              Expanded(
                child: GestureDetector(
                  onTap: i < step ? () => setState(() => step = i) : null,
                  child: Semantics(
                    label: 'Step ${i + 1} ${_steps[i]}',
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      AnimatedContainer(duration: const Duration(milliseconds: 200), height: 5, decoration: BoxDecoration(color: i <= step ? c.primary : c.border, borderRadius: BorderRadius.circular(3))),
                      const SizedBox(height: 5),
                      AppText('${i + 1}. ${_steps[i]}', size: 11, weight: i == step ? FontWeight.w700 : FontWeight.w500, color: i == step ? c.primary : c.muted, maxLines: 1),
                    ]),
                  ),
                ),
              ),
            ],
          ]),
          const SizedBox(height: 16),

          if (step < 3) ...[StaticCard(preview), const SizedBox(height: 18)],

          if (step == 0) ...[
            const AppText('Choose card network', v: TV.h3),
            for (final b in brands.keys) ...[
              const SizedBox(height: 12),
              OptionCard(
                selected: brand == b,
                onTap: () => setState(() => brand = b),
                child: Row(children: [
                  Container(width: 72, height: 46, decoration: BoxDecoration(color: brands[b]!.panel, borderRadius: BorderRadius.circular(R.md)), child: Center(child: BrandMark(b, size: 0.8))),
                  const SizedBox(width: 14),
                  Expanded(child: Padding(
                    padding: const EdgeInsets.only(right: 18),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      AppText(brands[b]!.name, weight: FontWeight.w700),
                      AppText(brands[b]!.desc, v: TV.xs, muted: true),
                    ]),
                  )),
                ]),
              ),
            ],
          ],

          if (step == 1) ...[
            const AppText('Pick a design', v: TV.h3),
            const SizedBox(height: 12),
            LayoutBuilder(builder: (context, cons) {
              final w = (cons.maxWidth - 2 * 12) / 3;
              return Wrap(spacing: 12, runSpacing: 14, children: [
                for (final t in themes)
                  SizedBox(
                    width: w,
                    child: Semantics(
                      selected: t.id == theme.id, button: true, label: t.name,
                      child: GestureDetector(
                        onTap: () { tapHaptic(); setState(() => theme = t); },
                        child: Column(children: [
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 160),
                            width: w, height: w / 1.586, padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(R.md),
                              gradient: LinearGradient(colors: t.colors, begin: Alignment.topLeft, end: Alignment.bottomRight),
                              border: Border.all(color: t.id == theme.id ? c.primary : Colors.transparent, width: 3),
                            ),
                            alignment: Alignment.topRight,
                            child: t.id == theme.id ? const AppIcon('bi-check-circle-fill', size: 18, color: Colors.white) : null,
                          ),
                          const SizedBox(height: 6),
                          AppText(t.name, size: 12, weight: t.id == theme.id ? FontWeight.w700 : FontWeight.w500, color: t.id == theme.id ? c.primary : c.text),
                        ]),
                      ),
                    ),
                  ),
              ]);
            }),
          ],

          if (step == 2) ...[
            AppTextField(label: 'Card nickname', value: label, maxLength: 20, placeholder: 'e.g. Subscriptions', error: labelErr, onChanged: (t) => setState(() { label = t; labelErr = null; })),
            const SizedBox(height: 14),
            AppTextField(
              label: 'Initial funding', prefix: r'$', big: true, keyboardType: const TextInputType.numberWithOptions(decimal: true), value: amountStr, error: amountErr, hint: r'Minimum $5.00',
              onChanged: (t) => setState(() { amountStr = cleanAmt(t); amountErr = null; }),
            ),
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: [for (final p in [5, 10, 25, 50, 100]) AppChip('\$$p', active: amount == p, onTap: () => setState(() { amountStr = '$p'; amountErr = null; }))]),
            const SizedBox(height: 14),
            Summary([SRow(r'Fees ($2 + 1%)', f.usd(2 + cost.fee)), SRow('You pay (at ₦1,580/\$)', f.naira(cost.naira, 2), bold: true)]),
          ],

          if (step == 3) ...[
            Row(children: [
              Container(
                width: 110, height: 110 / 1.586, padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.md), gradient: LinearGradient(colors: theme.colors, begin: Alignment.topLeft, end: Alignment.bottomRight)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  AppText(label.trim(), size: 10, weight: FontWeight.w700, color: Colors.white, maxLines: 1),
                  Align(alignment: Alignment.centerRight, child: BrandMark(brand, size: 0.5)),
                ]),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppText(label.trim(), v: TV.h3),
                AppText('${brandName(brand)} · ${theme.name} design', v: TV.sm, muted: true),
              ])),
            ]),
            const SizedBox(height: 14),
            Summary(
              [
                SRow('Initial card balance', f.usd(amount)),
                const SRow('Card creation fee', r'$2.00'),
                SRow('Funding fee (1%)', f.usd(cost.fee)),
                SRow('Total in USD', f.usd(cost.totalUsd)),
                const SRow('Exchange rate', '\$1 = ₦1,580'),
              ],
              total: ('You pay', f.naira(cost.naira, 2)),
            ),
            const SizedBox(height: 14),
            AppText('Charged from your Naira wallet (${f.naira(s.balance, 2)} available).', v: TV.xs, muted: true, center: true),
          ],
        ],
      ),
    );
  }
}
