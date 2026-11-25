import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../data/catalog.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';
import 'logic.dart';

void goCart(BuildContext context) => rootContext.push('/cart');
void goWish(BuildContext context) => rootContext.push(loc('/orders', {'tab': 'wishlist'}));

class ProductCard extends StatefulWidget {
  final Product p;
  final bool list, flash;
  final double? width;
  const ProductCard(this.p, {super.key, this.list = false, this.flash = false, this.width});
  @override
  State<ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends State<ProductCard> {
  bool added = false;
  Timer? _t;
  @override
  void dispose() { _t?.cancel(); super.dispose(); }

  void _add() {
    if (addToCart(widget.p.id, onView: () => goCart(context))) {
      setState(() => added = true);
      _t?.cancel();
      _t = Timer(const Duration(milliseconds: 1200), () { if (mounted) setState(() => added = false); });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final p = widget.p;
    final list = widget.list;
    final wished = context.select<AppStore, bool>((s) => s.wishlist.contains(p.id));
    final d = disc(p);

    final art = Stack(children: [
      list ? ProductArt(icon: p.icon, tone: p.tone, size: 104) : AspectRatio(aspectRatio: 1, child: ProductArt(icon: p.icon, tone: p.tone, size: null)),
      if (d > 0) Positioned(top: 8, left: 8, child: Pill('-$d%', tone: 'danger', solid: true)),
      if (p.badge != null && !p.badge!.startsWith('-') && !list) Positioned(bottom: 8, left: 8, child: Pill(p.badge!, solid: true)),
      Positioned(
        top: 6, right: 6,
        child: Container(
          decoration: BoxDecoration(shape: BoxShape.circle, boxShadow: shadow(c)),
          child: IconBtn(wished ? 'bi-heart-fill' : 'bi-heart', size: 32, color: wished ? c.pink : c.text, tooltip: wished ? 'Remove from wishlist' : 'Save to wishlist', onPressed: () => toggleWish(p.id, () => goWish(context))),
        ),
      ),
    ]);

    final tags = widget.flash
        ? Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              ProgressBar(flashClaimed(p.id) / 100, color: c.danger, height: 5),
              const SizedBox(height: 3),
              AppText('${flashClaimed(p.id)}% claimed', v: TV.xs, muted: true),
            ]),
          )
        : Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Wrap(spacing: 4, runSpacing: 4, children: [
              if (p.digital) const Pill('Instant', tone: 'warning', icon: 'bi-lightning-fill') else if (p.freeShipping) const Pill('Free delivery', tone: 'success', icon: 'bi-truck'),
              if (p.stock <= 10 && !p.digital) Pill('Only ${p.stock} left', tone: 'danger'),
            ]),
          );

    final info = Padding(
      padding: EdgeInsets.all(list ? 0 : 10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        AppText('${p.brand}${p.brand != p.seller ? ' · ${p.seller}' : ''}', v: TV.xs, muted: true, maxLines: 1),
        const SizedBox(height: 2),
        SizedBox(height: list ? null : 36, child: AppText(p.name, v: TV.sm, weight: FontWeight.w600, maxLines: 2)),
        const SizedBox(height: 4),
        Row(children: [Stars(p.rating, size: 11), const SizedBox(width: 4), Flexible(child: AppText('${p.rating} (${p.reviews})', v: TV.xs, muted: true, maxLines: 1))]),
        if (list) Padding(padding: const EdgeInsets.only(top: 4), child: AppText(shortDesc(p), v: TV.xs, muted: true, maxLines: 2)),
        const SizedBox(height: 6),
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AppText(f.naira(p.price), weight: FontWeight.w800, tabular: true, maxLines: 1),
            if (p.oldPrice != null) AppText(f.naira(p.oldPrice), v: TV.xs, muted: true, strike: true, tabular: true),
          ])),
          Semantics(
            button: true, label: 'Add to cart',
            child: GestureDetector(
              onTap: _add,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: 34, height: 34,
                decoration: BoxDecoration(color: added ? c.success : c.primary, shape: BoxShape.circle),
                child: Center(child: AppIcon(added ? 'bi-check-lg' : 'ion:cart-outline', size: 17, color: Colors.white)),
              ),
            ),
          ),
        ]),
        tags,
      ]),
    );

    final card = Container(
      width: widget.width,
      decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(R.xl), border: c.dark ? Border.all(color: c.border) : null, boxShadow: shadow(c)),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: BorderRadius.circular(R.xl),
          onTap: () => context.push('/product/${p.id}'),
          child: Padding(
            padding: EdgeInsets.all(list ? 10 : 6),
            child: list
                ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [art, const SizedBox(width: 12), Expanded(child: info)])
                : Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [art, info]),
          ),
        ),
      ),
    );
    return card;
  }
}

/// 2-column grid of product cards (shrink-wrapped, for use inside scroll views).
class ProductGrid extends StatelessWidget {
  final List<Product> items;
  const ProductGrid(this.items, {super.key});
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, cons) {
        const gap = 12.0;
        final w = (cons.maxWidth - gap) / 2;
        return Wrap(spacing: gap, runSpacing: gap, children: [for (final p in items) SizedBox(width: w, child: ProductCard(p))]);
      });
}
