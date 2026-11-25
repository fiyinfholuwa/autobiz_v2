import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../data/catalog.dart';
import '../../features/shop/logic.dart';
import '../../features/shop/order_actions.dart';
import '../../features/shop/product_card.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /orders  (param tab=wishlist) — members only
class OrdersScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const OrdersScreen({super.key, this.q = const {}});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  late String tab = widget.q['tab'] == 'wishlist' ? 'wishlist' : 'orders';
  String status = 'all';
  String query = '';

  @override
  void didUpdateWidget(OrdersScreen old) {
    super.didUpdateWidget(old);
    if (old.q['tab'] != widget.q['tab']) setState(() => tab = widget.q['tab'] == 'wishlist' ? 'wishlist' : 'orders');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    return AppScreen(
      header: Column(mainAxisSize: MainAxisSize.min, children: [
        AppHeader(
          title: 'My orders',
          subtitle: 'Track deliveries, get your digital codes and reorder favourites.',
          fallback: '/shop',
          actions: [IconBtn('ion:cart-outline', badge: s.cartCount, tooltip: 'Cart', onPressed: () => context.push('/cart'))],
        ),
        Container(
          color: c.bg,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
          child: Segment<String>(
            value: tab,
            onChanged: (v) => setState(() => tab = v),
            options: [const SegOption('orders', 'Orders'), SegOption('wishlist', 'Wishlist (${s.wishlist.length})')],
          ),
        ),
      ]),
      children: [tab == 'orders' ? _ordersPane(context, s) : _wishlistPane(context, s)],
    );
  }

  Widget _ordersPane(BuildContext context, AppStore s) {
    final c = context.c;
    final orders = s.orders;
    if (orders.isEmpty) {
      return EmptyState(icon: 'bi-box-seam', title: 'No orders yet', message: "When you buy something on the marketplace, you'll track it here.", action: 'Start shopping', onAction: () => context.go('/shop'));
    }
    final ql = query.trim().toLowerCase();
    final list = orders.where((o) => (status == 'all' || o.status == status) && (ql.isEmpty || o.id.toLowerCase().contains(ql) || o.items.any((i) => i.name.toLowerCase().contains(ql)))).toList();
    int count(String st) => st == 'all' ? orders.length : orders.where((o) => o.status == st).length;

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      HScroll(padding: EdgeInsets.zero, children: [
        for (final st in const ['all', 'processing', 'shipped', 'delivered', 'cancelled'])
          AppChip(st == 'all' ? 'All' : orderStatus[st]!.label, count: count(st), active: status == st, onTap: () => setState(() => status = st)),
      ]),
      const SizedBox(height: 12),
      AppTextField(icon: 'bi-search', placeholder: 'Search order ID or item', value: query, autocorrect: false, onChanged: (v) => setState(() => query = v)),
      if (list.isEmpty)
        EmptyState(
          icon: 'bi-search',
          title: 'No ${status == 'all' ? '' : '${orderStatus[status]!.label.toLowerCase()} '}orders${query.isNotEmpty ? ' matching “$query”' : ''}',
          action: 'Show all orders',
          onAction: () => setState(() { status = 'all'; query = ''; }),
        )
      else
        for (final o in list)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Builder(builder: (context) {
              final st = orderStatus[o.status]!;
              final units = orderUnits(o);
              final digital = isDigitalOrder(o);
              return CardBox(
                onTap: () => context.push('/orders/${o.id}'),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      AppText(o.id, weight: FontWeight.w700),
                      AppText(f.datetime(o.date), v: TV.xs, muted: true),
                    ])),
                    StatusPill(o.status, label: st.label, tone: st.tone),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    for (final i in o.items.take(4)) Padding(padding: const EdgeInsets.only(right: 8), child: ProductArt(icon: i.icon, tone: i.tone, size: 46)),
                    if (o.items.length > 4)
                      Container(width: 46, height: 46, decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(10)), child: Center(child: AppText('+${o.items.length - 4}', v: TV.sm, weight: FontWeight.w700))),
                  ]),
                  const SizedBox(height: 10),
                  AppText('${o.items.first.name}${o.items.length > 1 ? ' + ${o.items.length - 1} more' : ''}', v: TV.sm, weight: FontWeight.w600, maxLines: 1),
                  AppText('$units item${units > 1 ? 's' : ''} · ${methodLabel[o.method]}${o.status == 'cancelled' ? '' : o.status == 'delivered' ? ' · Delivered' : ' · ETA ${o.eta}'}', v: TV.xs, muted: true),
                  if (digital && o.status != 'cancelled')
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Row(children: [AppIcon('bi-upc-scan', size: 13, color: c.warningText), const SizedBox(width: 4), AppText('Digital code${units > 1 ? 's' : ''} ready', v: TV.xs, weight: FontWeight.w700, color: c.warningText)]),
                    ),
                  const SizedBox(height: 10),
                  AppText(f.naira(o.total), weight: FontWeight.w800, tabular: true),
                  AppText(o.payment == 'wallet' ? (o.refunded ? 'Refunded to wallet' : 'Paid · Wallet') : o.paid ? 'Paid on delivery' : 'Pay on delivery', v: TV.xs, muted: true),
                  const SizedBox(height: 12),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    Btn(o.status == 'cancelled' ? 'View details' : digital ? 'View codes & details' : 'Track order', size: BtnSize.sm, onPressed: () => context.push('/orders/${o.id}')),
                    Btn('Reorder', size: BtnSize.sm, variant: BtnVariant.soft, icon: 'bi-arrow-repeat', onPressed: () => reorder(o, () => context.push('/cart'))),
                    if (canCancel(o)) Btn('Cancel order', size: BtnSize.sm, variant: BtnVariant.dangerSoft, onPressed: () => openCancelOrder(o)),
                  ]),
                ]),
              );
            }),
          ),
    ]);
  }

  Widget _wishlistPane(BuildContext context, AppStore s) {
    final items = s.wishlist.map(productById).whereType<Product>().toList();
    if (items.isEmpty) {
      return EmptyState(icon: 'bi-heart', tone: 'pink', title: 'Your wishlist is empty', message: 'Tap the heart on any product to save it for later.', action: 'Explore marketplace', onAction: () => context.go('/shop'));
    }
    void addAll() {
      var n = 0;
      for (final p in items) {
        if (p.stock - inCartQty(p.id) <= 0) continue;
        final color = p.colors != null && p.colors!.isNotEmpty ? p.colors!.first : null;
        var ex = 0;
        for (final l in store.cart) { if (l.id == p.id && l.color == color) ex = l.qty; }
        store.cartAdd(lineFor(p, color), 1, ex + 1);
        n++;
      }
      if (n > 0) {
        toast('$n item${n > 1 ? 's' : ''} added to cart', actionLabel: 'Go to cart', onAction: () => rootContext.push('/cart'));
      } else {
        toast('All saved items are already in your cart', type: ToastType.info);
      }
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        Expanded(child: AppText('${items.length} saved item${items.length > 1 ? 's' : ''}', v: TV.sm, muted: true)),
        Btn('Add all to cart', size: BtnSize.sm, icon: 'ion:cart-outline', onPressed: addAll),
      ]),
      const SizedBox(height: 12),
      ProductGrid(items),
    ]);
  }
}
