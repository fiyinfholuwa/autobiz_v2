import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../core/validators.dart';
import '../../features/shop/logic.dart';
import '../../features/shop/order_summary.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /checkout (members only — router redirects guests to /login)
class CheckoutScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const CheckoutScreen({super.key, this.q = const {}});
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

Address _defaultAddress() {
  for (final o in store.orders) {
    if (o.address.state.isNotEmpty) return o.address.copy();
  }
  return Address(name: '${store.user.firstName} ${store.user.lastName}', phone: store.user.phone, email: store.user.email, state: 'Lagos');
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  int step = 1;
  Address addr = _defaultAddress();
  Map<String, String> errs = {};
  String method = 'standard';
  String hub = '';
  String pay = 'wallet';
  bool placing = false;
  final _scroll = ScrollController();

  @override
  void dispose() { _scroll.dispose(); super.dispose(); }

  void _go(int n) {
    setState(() => step = n);
    if (_scroll.hasClients) _scroll.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
  }

  void _set(String k, String v) => setState(() {
        switch (k) {
          case 'name': addr.name = v;
          case 'phone': addr.phone = v;
          case 'email': addr.email = v;
          case 'state': addr.state = v;
          case 'city': addr.city = v;
          case 'street': addr.street = v;
          case 'landmark': addr.landmark = v;
        }
        errs.remove(k);
      });

  void _submitAddress(bool digital) {
    final e = <String, String>{};
    if (addr.name.trim().length < 3 || !RegExp(r'\s').hasMatch(addr.name.trim())) e['name'] = 'Enter your first and last name.';
    if (!RegExp(r'^0[789][01]\d{8}$').hasMatch(addr.phone.replaceAll(RegExp(r'\s'), ''))) e['phone'] = 'Enter a valid 11-digit Nigerian number (e.g. 08031234567).';
    if (!isEmail(addr.email)) e['email'] = 'Enter a valid email address.';
    if (!digital) {
      if (addr.city.trim().length < 2) e['city'] = 'Enter your city or LGA.';
      if (addr.street.trim().length < 6) e['street'] = 'Enter your full street address.';
    }
    setState(() => errs = e);
    if (e.isNotEmpty) { toast('Please fix the highlighted fields', type: ToastType.warning); return; }
    setState(() {
      addr.phone = addr.phone.replaceAll(RegExp(r'\s'), '');
      addr.name = addr.name.trim();
      if (digital) {
        method = 'digital';
      } else if (method == 'digital') {
        method = 'standard';
      }
    });
    _go(digital ? 3 : 2);
  }

  Future<void> _place(Totals t, String curHub) async {
    final rnd = math.Random();
    final id = 'ORD-${f.now().toRadixString(36).toUpperCase().substring(math.max(0, f.now().toRadixString(36).length - 5))}${List.generate(3, (_) => '0123456789abcdefghijklmnopqrstuvwxyz'[rnd.nextInt(36)]).join().toUpperCase()}';
    final m = t.method;
    final count = t.units;
    Tx? tx;
    if (pay == 'wallet') {
      final rows = [SRow('Order', id), SRow('Items', '$count item${count > 1 ? 's' : ''}'), SRow('Delivery', t.delivery > 0 ? f.naira(t.delivery) : 'Free'), if (t.coupon != null) SRow('Coupon', '−${f.naira(t.discount)}')];
      final ok = await confirmPay(PayOpts(title: 'Confirm order payment', amount: t.total, cta: 'Pay ${f.naira(t.total)}', rows: rows));
      if (!ok) return;
      tx = store.debit(t.total, TxInput(type: 'shop', title: 'Marketplace Order', subtitle: '${t.items.length == 1 ? t.items.first.name : '${t.items.length} items'} · $id', icon: 'bi-bag', tone: 'violet'));
      if (tx == null) { toast('Insufficient wallet balance. Please fund your wallet.', type: ToastType.error); return; }
    } else {
      if (placing) return;
      setState(() => placing = true);
      await sleep(1000);
    }
    if (mounted) setState(() => placing = true);
    final order = Order(
      id: id, date: f.now(), status: 'processing',
      items: [for (final l in t.items) l.copy()..codes = l.digital ? List.generate(l.qty, (n) => voucherCode(id, l.id, n)) : null],
      subtotal: t.sub, discount: t.discount, coupon: t.coupon, deliveryFee: t.delivery, total: t.total,
      address: addr.copy(), method: m, pickupHub: m == 'pickup' ? curHub : null,
      payment: pay, paid: pay == 'wallet', txId: tx?.id,
      eta: m == 'digital' ? 'Instant' : eta(addr.state, m), timeline: buildTimeline(m),
    );
    store.mutate(() => store.orders.insert(0, order));
    store.cartClear();
    store.notify(icon: 'bi-bag-check', tone: 'success', title: 'Order placed · $id', body: '$count item${count > 1 ? 's' : ''} · ${f.naira(t.total)} · ${pay == 'wallet' ? 'Paid from wallet' : 'Pay on delivery'}');
    final hasDigital = order.items.any((i) => i.digital);
    final rows = [SRow('Order ID', id), SRow('Amount', f.naira(t.total, 2)), SRow('Payment', pay == 'wallet' ? 'Wallet (paid)' : 'Pay on delivery'), if (pay == 'wallet') SRow('New balance', f.naira(store.balance, 2))];
    if (!mounted) return;
    context.pushReplacement('/orders');
    success(SuccessOpts(
      title: 'Order placed!',
      message: hasDigital ? 'Your digital codes are ready in My Orders.' : "We'll notify you as your order moves. Estimated delivery: **${order.eta}**.",
      rows: rows,
      actions: [SuccessAction('View order', () => rootContext.push('/orders/$id'), icon: 'bi-box-seam')],
    ));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final t = computeTotals(s, method, addr.state);
    final digital = t.digital;
    final mixed = anyDigital(t.items) && !digital;
    final hubs = hubsFor(addr.state);
    final curHub = hub.isNotEmpty && hubs.contains(hub) ? hub : hubs.first;

    if (t.items.isEmpty && !placing) {
      return AppScreen(
        header: const AppHeader(title: 'Checkout', fallback: '/cart'),
        children: [EmptyState(icon: 'ion:cart-outline', title: 'Your cart is empty', message: 'Add items to your cart to check out.', action: 'Start shopping', onAction: () => context.go('/shop'))],
      );
    }

    final short = pay == 'wallet' && s.balance < t.total;
    const steps = ['Address', 'Delivery', 'Payment'];

    return AppScreen(
      controller: _scroll,
      header: AppHeader(
        title: 'Checkout',
        subtitle: 'Secure checkout — just 3 quick steps.',
        fallback: '/cart',
        onBack: step > 1 ? () => _go(step == 3 && digital ? 1 : step - 1) : null,
      ),
      footer: step == 1
          ? Btn('Continue', iconRight: 'bi-arrow-right', size: BtnSize.lg, full: true, onPressed: () => _submitAddress(digital))
          : step == 2
              ? Btn('Continue to payment', iconRight: 'bi-arrow-right', size: BtnSize.lg, full: true, onPressed: () => _go(3))
              : Btn(pay == 'wallet' ? 'Pay · ${f.naira(t.total)}' : 'Place order · ${f.naira(t.total)}', icon: pay == 'wallet' ? 'bi-lock-fill' : 'bi-bag-check', size: BtnSize.lg, full: true, loading: placing && pay == 'pod', loadingText: 'Placing order…', onPressed: () => _place(t, curHub)),
      children: [
        // Stepper
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Row(children: [
            for (var i = 0; i < steps.length; i++) ...[
              if (i > 0) const SizedBox(width: 6),
              Expanded(
                child: Builder(builder: (context) {
                  final n = i + 1;
                  final done = n < step;
                  final on = n == step;
                  final skip = digital && n == 2;
                  return GestureDetector(
                    onTap: !done || skip ? null : () => _go(n),
                    child: Opacity(
                      opacity: skip ? 0.4 : 1,
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Container(height: 4, decoration: BoxDecoration(color: done || on ? c.primary : c.border, borderRadius: BorderRadius.circular(2))),
                        const SizedBox(height: 6),
                        Row(children: [
                          done ? AppIcon('bi-check-circle-fill', size: 14, color: c.primary) : AppText('$n.', size: 11, weight: FontWeight.w700, color: on ? c.primary : c.muted),
                          const SizedBox(width: 5),
                          AppText(steps[i], size: 12, weight: on ? FontWeight.w700 : FontWeight.w600, color: on || done ? c.text : c.muted),
                        ]),
                      ]),
                    ),
                  );
                }),
              ),
            ],
          ]),
        ),
        if (step == 1)
          CardBox(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              AppText(digital ? 'Contact details' : 'Delivery address', v: TV.h3),
              AppText(digital ? 'Your codes will be shown in My Orders and sent to this email.' : 'Where should we deliver your order?', v: TV.sm, muted: true),
              const SizedBox(height: 12),
              AppTextField(label: 'Full name', value: addr.name, error: errs['name'], onChanged: (v) => _set('name', v), autofillHints: const [AutofillHints.name]),
              const SizedBox(height: 12),
              AppTextField(label: 'Phone number', value: addr.phone, error: errs['phone'], keyboardType: TextInputType.phone, maxLength: 11, placeholder: '08012345678', onChanged: (v) => _set('phone', v)),
              const SizedBox(height: 12),
              AppTextField(label: 'Email', value: addr.email, error: errs['email'], keyboardType: TextInputType.emailAddress, autocorrect: false, onChanged: (v) => _set('email', v)),
              if (!digital) ...[
                const SizedBox(height: 12),
                SelectField<String>(label: 'State', value: addr.state, title: 'Choose state', searchable: true, options: [for (final st in states) SelectOption(st, st)], onChanged: (v) => _set('state', v)),
                const SizedBox(height: 12),
                AppTextField(label: 'City / LGA', value: addr.city, error: errs['city'], placeholder: 'e.g. Ikeja', onChanged: (v) => _set('city', v)),
                const SizedBox(height: 12),
                AppTextField(label: 'Street address', value: addr.street, error: errs['street'], placeholder: 'House number, street name', onChanged: (v) => _set('street', v)),
                const SizedBox(height: 12),
                AppTextField(label: 'Nearest landmark (optional)', value: addr.landmark, placeholder: 'e.g. Opposite Shoprite', onChanged: (v) => _set('landmark', v)),
              ],
            ]),
          )
        else if (step == 2)
          CardBox(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const AppText('Delivery method', v: TV.h3),
              const SizedBox(height: 12),
              Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 6, children: [
                Text.rich(TextSpan(style: tvStyle(context, TV.sm, muted: true), children: [
                  const TextSpan(text: 'Delivering to '),
                  TextSpan(text: '${addr.city}, ${addr.state}', style: TextStyle(fontWeight: FontWeight.w700, color: c.text)),
                  const TextSpan(text: ' ·'),
                ])),
                GestureDetector(onTap: () => _go(1), child: AppText('Change', v: TV.sm, weight: FontWeight.w700, color: c.primary)),
              ]),
              for (final m in const [
                ('standard', 'Standard door delivery', 'Delivered to your address', 'bi-truck', 'primary'),
                ('express', 'Express delivery', 'Priority dispatch, fastest route', 'bi-lightning', 'violet'),
                ('pickup', 'Pickup station', 'Collect at a hub near you', 'bi-shop-window', 'success'),
              ])
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Builder(builder: (context) {
                    final fee = deliveryFee(t.items, m.$1, addr.state);
                    return OptionCard(
                      selected: method == m.$1,
                      onTap: () => setState(() => method = m.$1),
                      child: Row(children: [
                        IconTile(m.$4, tone: m.$5, size: 40),
                        const SizedBox(width: 12),
                        Expanded(child: Padding(
                          padding: const EdgeInsets.only(right: 18),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            AppText(m.$2, weight: FontWeight.w600),
                            Text.rich(TextSpan(style: tvStyle(context, TV.xs, muted: true), children: [
                              TextSpan(text: '${m.$3} · '),
                              TextSpan(text: eta(addr.state, m.$1), style: const TextStyle(fontWeight: FontWeight.w700)),
                            ])),
                          ]),
                        )),
                        Padding(padding: const EdgeInsets.only(right: 14), child: AppText(fee > 0 ? f.naira(fee) : 'Free', weight: FontWeight.w700, color: fee > 0 ? c.text : c.success)),
                      ]),
                    );
                  }),
                ),
              if (method == 'pickup') ...[
                const SizedBox(height: 12),
                SelectField<String>(label: 'Choose pickup station', value: curHub, options: [for (final h in hubs) SelectOption(h, h)], onChanged: (v) => setState(() => hub = v)),
              ],
              if (mixed) const Padding(padding: EdgeInsets.only(top: 12), child: Notice('Digital items in your cart are delivered instantly after payment.', tone: 'warning', icon: 'bi-lightning-charge')),
            ]),
          )
        else ...[
          CardBox(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const AppText('Payment', v: TV.h3),
              const AppText("Choose how you'd like to pay.", v: TV.sm, muted: true),
              const SizedBox(height: 12),
              OptionCard(
                selected: pay == 'wallet',
                onTap: () => setState(() => pay = 'wallet'),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    const IconTile('bi-wallet2', size: 40),
                    const SizedBox(width: 12),
                    Expanded(child: Padding(
                      padding: const EdgeInsets.only(right: 18),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const AppText('AutoBiz wallet', weight: FontWeight.w600),
                        AppText('Balance: ${f.naira(s.balance, 2)} · ${short ? 'Insufficient for this order' : 'Instant confirmation'}', v: TV.xs, color: short ? c.danger : c.muted),
                      ]),
                    )),
                  ]),
                  if (short) Padding(padding: const EdgeInsets.only(top: 10), child: Btn('Top up', size: BtnSize.sm, variant: BtnVariant.soft, icon: 'bi-plus-lg', onPressed: openFund)),
                ]),
              ),
              const SizedBox(height: 12),
              Opacity(
                opacity: anyDigital(t.items) ? 0.5 : 1,
                child: OptionCard(
                  selected: pay == 'pod',
                  onTap: () => anyDigital(t.items) ? toast("Pay on delivery isn't available for digital items", type: ToastType.warning) : setState(() => pay = 'pod'),
                  child: Row(children: [
                    const IconTile('bi-cash', tone: 'success', size: 40),
                    const SizedBox(width: 12),
                    Expanded(child: Padding(
                      padding: const EdgeInsets.only(right: 18),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const AppText('Pay on delivery', weight: FontWeight.w600),
                        AppText(anyDigital(t.items) ? 'Not available for orders with digital items' : 'Cash, transfer or POS when your order arrives', v: TV.xs, muted: true),
                      ]),
                    )),
                  ]),
                ),
              ),
            ]),
          ),
          const SizedBox(height: 12),
          CardBox(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              _ReviewBlock(
                title: digital ? 'Contact' : 'Ship to',
                onEdit: () => _go(1),
                children: [
                  AppText('${addr.name} · ${addr.phone}', v: TV.sm, weight: FontWeight.w600),
                  AppText(digital ? addr.email : '${addr.street}, ${addr.city}, ${addr.state}${addr.landmark.isNotEmpty ? ' · ${addr.landmark}' : ''}', v: TV.xs, muted: true),
                ],
              ),
              if (!digital) ...[
                const SizedBox(height: 12),
                _ReviewBlock(
                  title: 'Delivery',
                  onEdit: () => _go(2),
                  children: [
                    AppText('${methodLabel[t.method]}${t.method == 'pickup' ? ' · $curHub' : ''}', v: TV.sm, weight: FontWeight.w600),
                    AppText('Est. ${eta(addr.state, t.method)} · ${t.delivery > 0 ? f.naira(t.delivery) : 'Free'}', v: TV.xs, muted: true),
                  ],
                ),
              ],
            ]),
          ),
          const SizedBox(height: 12),
          AppText("By placing this order you agree to AutoBiz's Terms of Sale.${pay == 'pod' ? ' Please have the exact amount ready on delivery.' : ''}", v: TV.xs, muted: true, center: true),
        ],
        const SizedBox(height: 14),
        SummaryCard(
          t: t,
          deliveryNote: digital ? '' : step == 1 ? '(${addr.state}, standard)' : '(${t.method})',
          showItems: true,
          child: GestureDetector(onTap: () => goBack(context, '/cart'), child: AppText('Edit cart', v: TV.sm, weight: FontWeight.w700, color: c.primary, center: true)),
        ),
      ],
    );
  }
}

class _ReviewBlock extends StatelessWidget {
  final String title;
  final VoidCallback onEdit;
  final List<Widget> children;
  const _ReviewBlock({required this.title, required this.onEdit, required this.children});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(R.md)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(padding: const EdgeInsets.only(bottom: 4), child: AppText(title, v: TV.label, muted: true)),
          ...children,
        ])),
        GestureDetector(onTap: onEdit, child: AppText('Edit', v: TV.sm, weight: FontWeight.w700, color: c.primary)),
      ]),
    );
  }
}
