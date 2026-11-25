import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../data/catalog.dart';
import '../../features/shop/logic.dart';
import '../../features/shop/order_summary.dart';
import '../../features/shop/product_card.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

void _goCheckout(BuildContext context) {
  if (!requireLogin(next: '/checkout', title: 'Log in to check out', message: 'Sign in or create a free account to place your order. It only takes a minute.')) return;
  context.push('/checkout');
}

/// Route: /cart  (param checkout=1 opens checkout)
class CartScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const CartScreen({super.key, this.q = const {}});
  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.q['checkout'] == '1' && store.cart.isNotEmpty) {
      Future.delayed(const Duration(milliseconds: 250), () { if (mounted) _goCheckout(context); });
    }
  }

  void _remove(int i) {
    final line = store.cartRemove(i);
    if (line == null) return;
    toast('Removed **${line.name}**', type: ToastType.info, actionLabel: 'Undo', onAction: () => store.cartInsert(line, i));
  }

  void _saveForLater(int i) {
    final line = store.cart[i];
    if (!store.wishlist.contains(line.id)) store.wishlistToggle(line.id);
    store.cartRemove(i);
    toast('**${line.name}** saved for later');
  }

  Future<void> _clearCart(int units) async {
    final ok = await confirmDialog(ConfirmOpts(title: 'Clear your cart?', message: 'All $units items will be removed.', confirmLabel: 'Clear cart', cancelLabel: 'Keep items', tone: 'danger', icon: 'bi-trash'));
    if (ok) { store.cartClear(); toast('Cart cleared'); }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    var lastState = 'Lagos';
    for (final o in s.orders) { if (o.address.state.isNotEmpty) { lastState = o.address.state; break; } }
    final t = computeTotals(s, 'standard', lastState);
    final items = t.items;
    final saved = s.wishlist.map(productById).whereType<Product>().take(6).toList();
    final suggestions = (products.where((p) => !s.wishlist.contains(p.id)).toList()..sort((a, b) => disc(b).compareTo(disc(a)))).take(4).toList();

    return AppScreen(
      header: AppHeader(
        title: 'My cart (${t.units})',
        subtitle: items.isNotEmpty ? 'Review your items before checkout.' : 'Your cart is waiting to be filled.',
        fallback: '/shop',
        actions: [IconBtn('bi-shop', tooltip: 'Continue shopping', onPressed: () => context.go('/shop'))],
      ),
      footer: items.isEmpty
          ? null
          : Row(children: [
              Expanded(flex: 5, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                const AppText('Total', v: TV.xs, muted: true),
                AppText(f.naira(t.total), v: TV.h2, tabular: true),
              ])),
              const SizedBox(width: 12),
              Expanded(flex: 7, child: Btn('Checkout', iconRight: 'bi-arrow-right', size: BtnSize.lg, onPressed: () => _goCheckout(context))),
            ]),
      children: [
        if (items.isEmpty)
          CardBox(
            padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
            child: Column(children: [
              Container(width: 84, height: 84, decoration: BoxDecoration(color: c.primarySoft, shape: BoxShape.circle), child: Center(child: AppIcon('ion:cart-outline', size: 40, color: c.primary))),
              const SizedBox(height: 14),
              const AppText('Your cart is empty', v: TV.h2, center: true),
              const SizedBox(height: 6),
              const AppText('Browse thousands of genuine products and instant digital goods — pay from your wallet or on delivery.', v: TV.sm, muted: true, center: true),
              const SizedBox(height: 16),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Btn('Start shopping', onPressed: () => context.go('/shop')),
                const SizedBox(width: 10),
                Btn('My orders', variant: BtnVariant.outline, onPressed: () => context.push('/orders')),
              ]),
            ]),
          )
        else ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(children: [
              Expanded(child: AppText('${items.length} item${items.length > 1 ? 's' : ''} · ${t.units} unit${t.units > 1 ? 's' : ''}', v: TV.sm, muted: true)),
              GestureDetector(onTap: () => _clearCart(t.units), child: AppText('Clear cart', v: TV.sm, weight: FontWeight.w700, color: c.danger)),
            ]),
          ),
          for (var i = 0; i < items.length; i++)
            Padding(padding: const EdgeInsets.only(bottom: 10), child: _CartLineRow(key: ValueKey('${items[i].id}-${items[i].color}-$i'), index: i, onRemove: () => _remove(i), onSave: () => _saveForLater(i))),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Wrap(alignment: WrapAlignment.center, spacing: 14, runSpacing: 6, children: [
              for (final (ic, l) in const [('bi-shield-check', 'Buyer protection'), ('bi-arrow-counterclockwise', '7-day easy returns'), ('bi-lock', 'Secure checkout')])
                Row(mainAxisSize: MainAxisSize.min, children: [AppIcon(ic, size: 13, color: c.success), const SizedBox(width: 4), AppText(l, v: TV.xs, muted: true)]),
            ]),
          ),
          SummaryCard(t: t, deliveryNote: t.digital ? '' : '($lastState, standard)', child: Btn('Proceed to checkout', iconRight: 'bi-arrow-right', full: true, onPressed: () => _goCheckout(context))),
        ],
        if (saved.isNotEmpty) ...[
          const SizedBox(height: 22),
          Row(children: [
            Expanded(child: AppText('Saved for later (${s.wishlist.length})', v: TV.h3)),
            GestureDetector(onTap: () => context.push(loc('/orders', {'tab': 'wishlist'})), child: AppText('View wishlist', v: TV.sm, weight: FontWeight.w700, color: c.primary)),
          ]),
          const SizedBox(height: 10),
          for (final p in saved)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: CardBox(
                padding: const EdgeInsets.all(12),
                onTap: () => context.push('/product/${p.id}'),
                child: Row(children: [
                  ProductArt(icon: p.icon, tone: p.tone, size: 56),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    AppText(p.name, v: TV.sm, weight: FontWeight.w600, maxLines: 2),
                    const SizedBox(height: 2),
                    AppText(f.naira(p.price), weight: FontWeight.w700, tabular: true),
                  ])),
                  const SizedBox(width: 8),
                  Btn('Move to cart', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: () { if (addToCart(p.id)) store.wishlistToggle(p.id); }),
                  const SizedBox(width: 6),
                  IconBtn('bi-x-lg', size: 30, bg: c.surface2, tooltip: 'Remove from wishlist', onPressed: () => store.wishlistToggle(p.id)),
                ]),
              ),
            ),
        ],
        if (items.isEmpty) ...[
          const SizedBox(height: 22),
          const AppText('You might like', v: TV.h3),
          const SizedBox(height: 10),
          ProductGrid(suggestions),
        ],
      ],
    );
  }
}

class _CartLineRow extends StatefulWidget {
  final int index;
  final VoidCallback onRemove, onSave;
  const _CartLineRow({super.key, required this.index, required this.onRemove, required this.onSave});
  @override
  State<_CartLineRow> createState() => _CartLineRowState();
}

class _CartLineRowState extends State<_CartLineRow> {
  final _ctl = TextEditingController();
  final _focus = FocusNode();
  int? _lastQty;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() { if (!_focus.hasFocus) _commit(); });
  }

  @override
  void dispose() { _ctl.dispose(); _focus.dispose(); super.dispose(); }

  int _max(CartLine l) => (productById(l.id)?.stock ?? l.qty) - (inCartQty(l.id) - l.qty);

  void _commit() {
    if (widget.index >= store.cart.length) return;
    final l = store.cart[widget.index];
    final max = _max(l);
    var n = int.tryParse(_ctl.text) ?? 1;
    if (n < 1) n = 1;
    if (n > max) { n = max; toast('Only $max available for this item', type: ToastType.warning); }
    store.cartSetQty(widget.index, n);
    _ctl.text = '$n';
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    if (widget.index >= s.cart.length) return const SizedBox.shrink();
    final l = s.cart[widget.index];
    if (_lastQty != l.qty && !_focus.hasFocus) { _ctl.text = '${l.qty}'; _lastQty = l.qty; }
    final p = productById(l.id);
    final max = _max(l);
    return CardBox(
      padding: const EdgeInsets.all(12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          GestureDetector(onTap: () => context.push('/product/${l.id}'), child: ProductArt(icon: l.icon, tone: l.tone, size: 76)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AppText(l.name, v: TV.sm, weight: FontWeight.w600, maxLines: 2),
            const SizedBox(height: 4),
            Wrap(spacing: 6, runSpacing: 2, crossAxisAlignment: WrapCrossAlignment.center, children: [
              if (l.color != null)
                Row(mainAxisSize: MainAxisSize.min, children: [
                  Container(width: 10, height: 10, decoration: BoxDecoration(color: swatch(l.color!), shape: BoxShape.circle, border: Border.all(color: c.border))),
                  const SizedBox(width: 4),
                  AppText(colorName(l.color), v: TV.xs, muted: true),
                ]),
              AppText(l.seller, v: TV.xs, muted: true, maxLines: 1),
              if (l.digital) AppText('Instant', v: TV.xs, weight: FontWeight.w700, color: c.warningText) else if (p?.freeShipping ?? false) AppText('Free delivery', v: TV.xs, weight: FontWeight.w700, color: c.success),
            ]),
            const SizedBox(height: 4),
            Text.rich(TextSpan(style: tvStyle(context, TV.xs, muted: true), children: [
              TextSpan(text: '${f.naira(l.price)} each'),
              if (max <= 5 && !l.digital) TextSpan(text: ' · $max max', style: TextStyle(color: c.danger)),
            ])),
          ])),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          GestureDetector(onTap: widget.onSave, child: Row(mainAxisSize: MainAxisSize.min, children: [AppIcon('bi-heart', size: 14, color: c.muted), const SizedBox(width: 4), const AppText('Save for later', v: TV.xs, weight: FontWeight.w600, muted: true)])),
          const SizedBox(width: 14),
          GestureDetector(onTap: widget.onRemove, child: Row(mainAxisSize: MainAxisSize.min, children: [AppIcon('bi-trash', size: 14, color: c.danger), const SizedBox(width: 4), AppText('Remove', v: TV.xs, weight: FontWeight.w600, color: c.danger)])),
          const Spacer(),
          IconBtn(l.qty <= 1 ? 'bi-trash' : 'bi-dash-lg', color: l.qty <= 1 ? c.danger : c.text, size: 32, bg: c.surface2, tooltip: 'Decrease', onPressed: () => l.qty <= 1 ? widget.onRemove() : store.cartSetQty(widget.index, l.qty - 1)),
          SizedBox(
            width: 38,
            child: TextField(
              controller: _ctl,
              focusNode: _focus,
              textAlign: TextAlign.center,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: tvStyle(context, TV.body, weight: FontWeight.w700),
              decoration: const InputDecoration(border: InputBorder.none, isDense: true),
              onSubmitted: (_) => _focus.unfocus(),
            ),
          ),
          IconBtn('bi-plus-lg', size: 32, bg: c.surface2, tooltip: 'Increase', onPressed: l.qty >= max ? null : () => store.cartSetQty(widget.index, l.qty + 1)),
        ]),
        const SizedBox(height: 6),
        Align(alignment: Alignment.centerRight, child: AppText(f.naira(l.price * l.qty), weight: FontWeight.w800, tabular: true)),
      ]),
    );
  }
}
