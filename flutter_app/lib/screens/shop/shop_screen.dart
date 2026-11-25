import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../data/catalog.dart';
import '../../features/shop/logic.dart';
import '../../features/shop/product_card.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _page = 12;
const _sorts = [('popular', 'Most popular'), ('low', 'Price: low to high'), ('high', 'Price: high to low'), ('rating', 'Top rated'), ('discount', 'Biggest discount')];
const _presets = [('Under ₦50k', 0.0, 50000.0), ('₦50k–₦200k', 50000.0, 200000.0), ('₦200k–₦1m', 200000.0, 1000000.0), ('₦1m+', 1000000.0, null)];
const _ratings = [(0.0, 'Any rating'), (4.5, '4.5 & above'), (4.0, '4.0 & above'), (3.0, '3.0 & above')];

class _F {
  String q = '', cat = 'all', seller = '';
  double? min, max;
  List<String> brands = [];
  double rating = 0;
  bool free = false, stock = false, sale = false;
  _F copy() => _F()..q = q..cat = cat..seller = seller..min = min..max = max..brands = [...brands]..rating = rating..free = free..stock = stock..sale = sale;
}

bool _match(Product p, _F f, {bool skipBrand = false}) {
  if (f.cat != 'all' && p.category != f.cat) return false;
  if (f.seller.isNotEmpty && p.seller != f.seller) return false;
  if (f.q.isNotEmpty) {
    final hay = '${p.name} ${p.brand} ${p.seller} ${catName(p.category)}'.toLowerCase();
    if (!f.q.toLowerCase().split(RegExp(r'\s+')).where((t) => t.isNotEmpty).every(hay.contains)) return false;
  }
  if (f.min != null && p.price < f.min!) return false;
  if (f.max != null && p.price > f.max!) return false;
  if (!skipBrand && f.brands.isNotEmpty && !f.brands.contains(p.brand)) return false;
  if (f.rating > 0 && p.rating < f.rating) return false;
  if (f.free && !(p.freeShipping || p.digital)) return false;
  if (f.stock && p.stock < 10) return false;
  if (f.sale && disc(p) < 15) return false;
  return true;
}

List<Product> _sortList(List<Product> list, String s) {
  final l = [...list];
  switch (s) {
    case 'popular': l.sort((a, b) => (b.reviews * b.rating).compareTo(a.reviews * a.rating));
    case 'low': l.sort((a, b) => a.price.compareTo(b.price));
    case 'high': l.sort((a, b) => b.price.compareTo(a.price));
    case 'rating': l.sort((a, b) { final r = b.rating.compareTo(a.rating); return r != 0 ? r : b.reviews.compareTo(a.reviews); });
    case 'discount': l.sort((a, b) => disc(b).compareTo(disc(a)));
  }
  return l;
}

class _Slide {
  final List<Color> colors;
  final Color iconColor;
  final String icon, eyebrow, title, body, cta;
  final String? cat, product;
  const _Slide(this.colors, this.iconColor, this.icon, this.eyebrow, this.title, this.body, this.cta, {this.cat, this.product});
}

const _slides = [
  _Slide([Color(0xFF3A3F5C), Color(0xFF15172B), Color(0xFF0B0C18)], Color(0xFFFFD43B), 'bi-phone', 'Black Friday week', 'Up to 30% off phones & gadgets', 'Samsung, Apple, Xiaomi & more — free delivery nationwide.', 'Shop phones', cat: 'phones'),
  _Slide([Color(0xFFE64980), Color(0xFF9C36B5)], Colors.white, 'bi-play-btn', 'Delivered instantly', 'Netflix, Steam & Microsoft 365 codes', 'Pay from your wallet, get your code in seconds.', 'Browse digital', cat: 'digital'),
  _Slide([Color(0xFFF59F00), Color(0xFFE8590C)], Colors.white, 'bi-sun', 'Beat the grid', 'Solar inverter kits from ₦1.15m', 'Power your home 24/7. Installation available in Lagos & Abuja.', 'View deal', product: 'p22'),
];

/// Route: /shop  (tab) — params q, cat, seller, free
class ShopScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const ShopScreen({super.key, this.q = const {}});
  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  _F fl = _F();
  String sort = 'popular';
  int shown = _page;
  bool loading = false, moreBusy = false;
  int slide = 0;
  final _scroll = ScrollController();
  final _catalogKey = GlobalKey();
  final _flashKey = GlobalKey();
  final _pager = PageController();
  final _searchCtl = TextEditingController();
  Timer? _carTimer, _clock, _skel;
  String countdown = '';

  @override
  void initState() {
    super.initState();
    _applyParams(widget.q, initial: true);
    _tick();
    _clock = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
    _carTimer = Timer.periodic(const Duration(milliseconds: 5500), (_) {
      if (!_pager.hasClients) return;
      final n = (slide + 1) % _slides.length;
      _pager.animateToPage(n, duration: const Duration(milliseconds: 400), curve: Curves.easeOut);
    });
  }

  @override
  void didUpdateWidget(ShopScreen old) {
    super.didUpdateWidget(old);
    if (old.q.toString() != widget.q.toString()) _applyParams(widget.q);
  }

  @override
  void dispose() {
    _carTimer?.cancel(); _clock?.cancel(); _skel?.cancel();
    _scroll.dispose(); _pager.dispose(); _searchCtl.dispose();
    super.dispose();
  }

  void _tick() {
    final d = DateTime.now();
    final h = ((d.hour ~/ 6) + 1) * 6;
    final next = DateTime(d.year, d.month, d.day, h);
    final s = next.difference(d).inSeconds.clamp(0, 1 << 30);
    String p(int n) => n.toString().padLeft(2, '0');
    if (mounted) setState(() => countdown = '${p(s ~/ 3600)}:${p((s % 3600) ~/ 60)}:${p(s % 60)}');
  }

  void _applyParams(Map<String, String> q, {bool initial = false}) {
    final cat = q['cat'] != null && categories.any((x) => x.id == q['cat']) ? q['cat'] : null;
    if (q['q'] != null || cat != null || q['seller'] != null || q['free'] != null) {
      final n = fl.copy();
      if (q['q'] != null) { n.q = q['q']!; _searchCtl.text = n.q; }
      if (cat != null) { n.cat = cat; n.brands = []; }
      if (q['seller'] != null) n.seller = q['seller']!;
      if (q['free'] == '1') n.free = true;
      if (initial) { fl = n; } else { _setF(n); }
      Future.delayed(const Duration(milliseconds: 300), _scrollToCatalog);
    }
  }

  /// filter/sort change → reset paging + 380ms skeleton
  void _setF(_F n, {String? newSort}) {
    setState(() {
      fl = n;
      if (newSort != null) sort = newSort;
      shown = _page;
      loading = true;
    });
    _skel?.cancel();
    _skel = Timer(const Duration(milliseconds: 380), () { if (mounted) setState(() => loading = false); });
  }

  void _upd(void Function(_F n) fn) { final n = fl.copy(); fn(n); _setF(n); }

  void _scrollToCatalog() {
    final ctx = _catalogKey.currentContext;
    if (ctx != null) Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 350), curve: Curves.easeOut);
  }

  void _setCat(String cat) { _upd((n) { n.cat = cat; n.brands = []; }); Future.delayed(const Duration(milliseconds: 50), _scrollToCatalog); }

  void _resetAll() {
    _searchCtl.clear();
    _setF(_F(), newSort: 'popular');
    if (widget.q.isNotEmpty) context.go('/shop');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final view = s.settings.marketView;
    final priceErr = fl.min != null && fl.max != null && fl.min! > fl.max! ? "Min price can't be greater than max." : null;
    final eff = priceErr != null ? (fl.copy()..min = null..max = null) : fl;
    final results = _sortList(products.where((p) => _match(p, eff)).toList(), sort);
    final flash = ([...products]..sort((a, b) => disc(b).compareTo(disc(a)))).take(8).toList();
    final page = results.take(shown).toList();
    final activeCount = (fl.seller.isNotEmpty ? 1 : 0) + (fl.min != null || fl.max != null ? 1 : 0) + fl.brands.length + (fl.rating > 0 ? 1 : 0) + (fl.free ? 1 : 0) + (fl.stock ? 1 : 0) + (fl.sale ? 1 : 0) + (fl.cat != 'all' ? 1 : 0);

    final pills = <(String, VoidCallback)>[];
    if (fl.q.isNotEmpty) pills.add(('“${fl.q}”', () { _searchCtl.clear(); _upd((n) => n.q = ''); }));
    if (fl.seller.isNotEmpty) pills.add(('Seller: ${fl.seller}', () => _upd((n) => n.seller = '')));
    if (fl.min != null || fl.max != null) pills.add(('${fl.min != null ? f.naira(fl.min) : '₦0'} – ${fl.max != null ? f.naira(fl.max) : 'any'}', () => _upd((n) { n.min = null; n.max = null; })));
    for (final b in fl.brands) { pills.add((b, () => _upd((n) => n.brands.remove(b)))); }
    if (fl.rating > 0) pills.add(('${fl.rating % 1 == 0 ? fl.rating.toInt() : fl.rating}★ & up', () => _upd((n) => n.rating = 0)));
    if (fl.free) pills.add(('Free delivery', () => _upd((n) => n.free = false)));
    if (fl.stock) pills.add(('In stock', () => _upd((n) => n.stock = false)));
    if (fl.sale) pills.add(('15%+ off', () => _upd((n) => n.sale = false)));

    final top = MediaQuery.paddingOf(context).top;
    final header = Container(
      color: c.bg,
      padding: EdgeInsets.fromLTRB(16, top + 8, 16, 10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        Row(children: [
          const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AppText('Marketplace', v: TV.h1),
            AppText('Genuine products from verified sellers', v: TV.xs, muted: true),
          ])),
          IconBtn('bi-heart', badge: s.wishlist.length, tooltip: 'Wishlist', onPressed: () => context.push(loc('/orders', {'tab': 'wishlist'}))),
          if (s.authed) ...[const SizedBox(width: 8), IconBtn('bi-box-seam', tooltip: 'My orders', onPressed: () => context.push('/orders'))],
          const SizedBox(width: 8),
          IconBtn('ion:cart-outline', badge: s.cartCount, tooltip: 'Cart', onPressed: () => context.push('/cart')),
        ]),
        const SizedBox(height: 12),
        AppTextField(
          controller: _searchCtl,
          icon: 'bi-search',
          placeholder: 'Search products, brands, sellers…',
          textInputAction: TextInputAction.search,
          onChanged: (q) => _upd((n) => n.q = q),
          onSubmitted: (_) => _scrollToCatalog(),
          suffix: fl.q.isNotEmpty ? GestureDetector(onTap: () { _searchCtl.clear(); _upd((n) => n.q = ''); }, child: AppIcon('bi-x-circle-fill', size: 18, color: c.muted)) : null,
        ),
      ]),
    );

    return AppScreen(
      header: header,
      bottomInset: tabBarSpace,
      padded: false,
      controller: _scroll,
      children: [
        // Promo carousel
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
          child: SizedBox(
            // fits eyebrow + 2-line title + 2-line body + CTA; grows with the user's text size
            height: MediaQuery.textScalerOf(context).scale(192),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(R.xl),
              child: PageView.builder(
                controller: _pager,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => slide = i),
                itemBuilder: (_, i) => _slideView(_slides[i]),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          for (var i = 0; i < _slides.length; i++)
            AnimatedContainer(duration: const Duration(milliseconds: 200), margin: const EdgeInsets.symmetric(horizontal: 2.5), width: i == slide ? 22 : 6, height: 5, decoration: BoxDecoration(color: i == slide ? c.primary : c.border, borderRadius: BorderRadius.circular(3))),
        ]),
        // Quick tiles
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
          child: Row(children: [
            for (final (i, t) in [
              ('bi-lightning-charge', c.warning, 'Instant digital', 'Codes in seconds', () => _setCat('digital')),
              ('bi-truck', c.success, 'Free delivery', 'No delivery fee', () { _upd((n) => n.free = true); Future.delayed(const Duration(milliseconds: 50), _scrollToCatalog); }),
              ('bi-fire', c.danger, 'Flash sales', 'Every 6 hours', () { final ctx = _flashKey.currentContext; if (ctx != null) Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 350)); }),
            ].indexed) ...[
              if (i > 0) const SizedBox(width: 8),
              Expanded(
                child: CardBox(
                  padding: const EdgeInsets.all(10),
                  elevated: false,
                  radius: R.lg,
                  onTap: t.$5,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    AppIcon(t.$1, size: 18, color: t.$2),
                    const SizedBox(height: 6),
                    AppText(t.$3, v: TV.xs, weight: FontWeight.w700, maxLines: 1),
                    AppText(t.$4, size: 10, muted: true, maxLines: 1),
                  ]),
                ),
              ),
            ],
          ]),
        ),
        // Categories
        const Padding(padding: EdgeInsets.fromLTRB(16, 20, 16, 10), child: AppText('Shop by category', v: TV.h3)),
        HScroll(gap: 12, children: [
          for (final cat in categories)
            GestureDetector(
              onTap: () => _setCat(fl.cat == cat.id ? 'all' : cat.id),
              child: SizedBox(
                width: 72,
                child: Column(children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    width: 60, height: 60,
                    decoration: BoxDecoration(color: fl.cat == cat.id ? c.primary : c.surface, borderRadius: BorderRadius.circular(20), border: fl.cat == cat.id ? null : Border.all(color: c.border)),
                    child: Center(child: AppIcon(cat.icon, size: 24, color: fl.cat == cat.id ? Colors.white : c.primary)),
                  ),
                  const SizedBox(height: 6),
                  AppText(cat.name, size: 11, weight: FontWeight.w600, center: true, maxLines: 2),
                ]),
              ),
            ),
        ]),
        // Flash deals
        Padding(
          key: _flashKey,
          padding: const EdgeInsets.fromLTRB(16, 22, 16, 10),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [AppIcon('bi-lightning-fill', size: 18, color: c.danger), const SizedBox(width: 6), const AppText('Flash deals', v: TV.h3)]),
              const AppText('Biggest discounts, limited stock', v: TV.xs, muted: true),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(color: c.dangerSoft, borderRadius: BorderRadius.circular(R.pill)),
              child: AppText('Ends in $countdown', v: TV.xs, weight: FontWeight.w700, color: c.danger, tabular: true),
            ),
          ]),
        ),
        HScroll(gap: 12, children: [for (final p in flash) ProductCard(p, flash: true, width: 168)]),
        // Catalog
        SizedBox(key: _catalogKey, height: 24),
        HScroll(children: [
          AppChip('All', active: fl.cat == 'all', onTap: () => _upd((n) { n.cat = 'all'; n.brands = []; })),
          for (final cat in categories) AppChip(cat.name, icon: cat.icon, active: fl.cat == cat.id, onTap: () => _upd((n) { n.cat = cat.id; n.brands = []; })),
        ]),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
          child: Row(children: [
            Expanded(
              child: Text.rich(TextSpan(style: tvStyle(context, TV.sm, muted: true), children: [
                TextSpan(text: '${results.length}', style: const TextStyle(fontWeight: FontWeight.w700)),
                TextSpan(text: ' product${results.length == 1 ? '' : 's'}'),
                if (fl.cat != 'all') ...[const TextSpan(text: ' in '), TextSpan(text: catName(fl.cat), style: const TextStyle(fontWeight: FontWeight.w700))],
              ])),
            ),
            Material(
              color: c.surface,
              shape: StadiumBorder(side: BorderSide(color: c.border)),
              child: InkWell(
                customBorder: const StadiumBorder(),
                onTap: () => _openFilters(),
                child: Container(
                  height: 36, padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    AppIcon('bi-sliders', size: 16, color: c.text),
                    const SizedBox(width: 6),
                    const AppText('Filters', v: TV.sm, weight: FontWeight.w600),
                    if (activeCount > 0) ...[
                      const SizedBox(width: 6),
                      Container(
                        constraints: const BoxConstraints(minWidth: 18), height: 18, padding: const EdgeInsets.symmetric(horizontal: 4),
                        decoration: BoxDecoration(color: c.primary, borderRadius: BorderRadius.circular(9)),
                        child: Center(child: AppText('$activeCount', size: 10, weight: FontWeight.w700, color: Colors.white)),
                      ),
                    ],
                  ]),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: c.border)),
              child: IconBtn(view == 'grid' ? 'bi-list' : 'bi-grid', size: 36, tooltip: 'Toggle view', onPressed: () => store.mutate(() => store.settings.marketView = view == 'grid' ? 'list' : 'grid')),
            ),
          ]),
        ),
        const SizedBox(height: 10),
        HScroll(children: [for (final o in _sorts) AppChip(o.$2, active: sort == o.$1, onTap: () => _setF(fl.copy(), newSort: o.$1))]),
        if (pills.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
            child: Wrap(spacing: 6, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
              for (final p in pills)
                GestureDetector(
                  onTap: p.$2,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(R.pill)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [AppText(p.$1, v: TV.xs, weight: FontWeight.w600, color: c.primary), const SizedBox(width: 4), AppIcon('bi-x', size: 14, color: c.primary)]),
                  ),
                ),
              if (pills.length > 1) GestureDetector(onTap: _resetAll, child: Padding(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5), child: AppText('Clear all', v: TV.xs, weight: FontWeight.w700, color: c.danger))),
            ]),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
          child: loading
              ? LayoutBuilder(builder: (context, cons) {
                  final grid = view == 'grid';
                  final w = grid ? (cons.maxWidth - 12) / 2 : cons.maxWidth;
                  return Wrap(spacing: 12, runSpacing: 12, children: [for (var i = 0; i < (grid ? 4 : 3); i++) Skeleton(w: w, h: grid ? 250 : 120, r: 20)]);
                })
              : results.isEmpty
                  ? EmptyState(icon: 'bi-search', title: 'No products match your filters', message: 'Try a different search term, widen your price range or clear some filters.', action: 'Clear all filters', onAction: _resetAll)
                  : view == 'grid'
                      ? ProductGrid(page)
                      : Column(children: [for (final p in page) Padding(padding: const EdgeInsets.only(bottom: 12), child: ProductCard(p, list: true))]),
        ),
        if (!loading && results.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Column(children: [
              AppText('Showing ${shown < results.length ? shown : results.length} of ${results.length}', v: TV.xs, muted: true),
              if (shown < results.length) ...[
                const SizedBox(height: 8),
                Btn('Load more', variant: BtnVariant.outline, loading: moreBusy, onPressed: () async {
                  setState(() => moreBusy = true);
                  await Future.delayed(const Duration(milliseconds: 600));
                  if (mounted) setState(() { shown += _page; moreBusy = false; });
                }),
              ],
            ]),
          ),
      ],
    );
  }

  Widget _slideView(_Slide s) => Container(
        decoration: BoxDecoration(gradient: LinearGradient(colors: s.colors, begin: Alignment.topLeft, end: Alignment.bottomRight)),
        padding: const EdgeInsets.all(18),
        child: Stack(clipBehavior: Clip.none, children: [
          Positioned(right: -36, bottom: -36, child: Opacity(opacity: 0.22, child: AppIcon(s.icon, size: 130, color: s.iconColor))),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AppText(s.eyebrow, v: TV.label, color: Colors.white.withValues(alpha: 0.8)),
            const SizedBox(height: 6),
            FractionallySizedBox(widthFactor: 0.8, child: AppText(s.title, v: TV.h2, color: Colors.white, maxLines: 2)),
            const SizedBox(height: 4),
            FractionallySizedBox(widthFactor: 0.78, child: AppText(s.body, v: TV.xs, color: Colors.white.withValues(alpha: 0.85), maxLines: 2)),
            const Spacer(),
            GestureDetector(
              onTap: () => s.cat != null ? _setCat(s.cat!) : context.push('/product/${s.product}'),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(R.pill)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [AppText(s.cta, v: TV.sm, weight: FontWeight.w700, color: const Color(0xFF111111)), const SizedBox(width: 6), const AppIcon('bi-arrow-right', size: 14, color: Color(0xFF111111))]),
              ),
            ),
          ]),
        ]),
      );

  void _openFilters() {
    showSheet(_FilterSheet(
      get: () => (fl, sort),
      onChange: (n, s) => _setF(n, newSort: s),
      onReset: _resetAll,
      count: () {
        final pe = fl.min != null && fl.max != null && fl.min! > fl.max!;
        final eff = pe ? (fl.copy()..min = null..max = null) : fl;
        return products.where((p) => _match(p, eff)).length;
      },
      onShow: () => Future.delayed(const Duration(milliseconds: 250), _scrollToCatalog),
    ));
  }
}

class _FilterSheet extends StatefulWidget {
  final (_F, String) Function() get;
  final void Function(_F, String) onChange;
  final VoidCallback onReset, onShow;
  final int Function() count;
  const _FilterSheet({required this.get, required this.onChange, required this.onReset, required this.count, required this.onShow});
  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  void _upd(void Function(_F n) fn) {
    final (f0, s0) = widget.get();
    final n = f0.copy();
    fn(n);
    widget.onChange(n, s0);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final (fl, sort) = widget.get();
    final priceErr = fl.min != null && fl.max != null && fl.min! > fl.max! ? "Min price can't be greater than max." : null;
    final eff = priceErr != null ? (fl.copy()..min = null..max = null) : fl;
    final brandPool = products.where((p) => fl.cat == 'all' || p.category == fl.cat).map((p) => p.brand).toSet().toList()..sort();
    int brandCount(String b) => products.where((p) => p.brand == b && _match(p, eff, skipBrand: true)).length;
    final n = widget.count();
    Widget label(String t, [double top = 18]) => Padding(padding: EdgeInsets.only(top: top, bottom: 8), child: AppText(t, v: TV.label, muted: true));
    return AppSheet(
      title: 'Filters',
      footer: Row(children: [
        Expanded(child: Btn('Reset', variant: BtnVariant.outline, onPressed: () { widget.onReset(); setState(() {}); })),
        const SizedBox(width: 10),
        Expanded(flex: 2, child: Btn('Show $n result${n == 1 ? '' : 's'}', onPressed: () { Navigator.of(context).pop(); widget.onShow(); })),
      ]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        label('Sort by', 0),
        Wrap(spacing: 8, runSpacing: 8, children: [for (final o in _sorts) AppChip(o.$2, active: sort == o.$1, onTap: () { widget.onChange(fl.copy(), o.$1); setState(() {}); })]),
        label('Price (₦)'),
        Row(children: [
          Expanded(child: AppTextField(placeholder: 'Min', keyboardType: TextInputType.number, inputFormatters: [AppTextField.digits], value: fl.min != null ? fl.min!.toInt().toString() : '', onChanged: (t) => _upd((n) => n.min = t.isEmpty ? null : double.parse(t)))),
          const SizedBox(width: 10),
          Expanded(child: AppTextField(placeholder: 'Max', keyboardType: TextInputType.number, inputFormatters: [AppTextField.digits], value: fl.max != null ? fl.max!.toInt().toString() : '', onChanged: (t) => _upd((n) => n.max = t.isEmpty ? null : double.parse(t)))),
        ]),
        FieldError(error: priceErr),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final pr in _presets)
            AppChip(pr.$1, active: fl.min == pr.$2 && fl.max == pr.$3, onTap: () {
              final on = fl.min == pr.$2 && fl.max == pr.$3;
              _upd((n) { if (on) { n.min = null; n.max = null; } else { n.min = pr.$2; n.max = pr.$3; } });
            }),
        ]),
        Padding(
          padding: const EdgeInsets.only(top: 18, bottom: 6),
          child: Row(children: [
            const Expanded(child: AppText('Brand', v: TV.label, muted: true)),
            if (fl.brands.isNotEmpty) GestureDetector(onTap: () => _upd((n) => n.brands = []), child: AppText('Clear', v: TV.xs, weight: FontWeight.w700, color: c.primary)),
          ]),
        ),
        if (brandPool.isEmpty) const AppText('No brands', v: TV.sm, muted: true),
        for (final b in brandPool)
          AppCheckbox(
            checked: fl.brands.contains(b),
            onChanged: (v) => _upd((n) { if (v) { n.brands.add(b); } else { n.brands.remove(b); } }),
            child: Row(children: [Expanded(child: AppText(b, v: TV.sm)), AppText('${brandCount(b)}', v: TV.xs, muted: true)]),
          ),
        label('Customer rating'),
        for (final r in _ratings)
          InkWell(
            onTap: () => _upd((n) => n.rating = r.$1),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(children: [
                Container(
                  width: 20, height: 20,
                  decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: fl.rating == r.$1 ? c.primary : c.border, width: 2)),
                  child: fl.rating == r.$1 ? Center(child: Container(width: 10, height: 10, decoration: BoxDecoration(color: c.primary, shape: BoxShape.circle))) : null,
                ),
                const SizedBox(width: 10),
                if (r.$1 > 0) ...[Stars(r.$1), const SizedBox(width: 10)],
                AppText(r.$2, v: TV.sm),
              ]),
            ),
          ),
        const SizedBox(height: 10),
        SwitchRow(title: 'Free delivery', value: fl.free, onChanged: (v) => _upd((n) => n.free = v)),
        SwitchRow(title: 'In stock (10+ units)', value: fl.stock, onChanged: (v) => _upd((n) => n.stock = v)),
        SwitchRow(title: '15% off or more', value: fl.sale, onChanged: (v) => _upd((n) => n.sale = v)),
      ]),
    );
  }
}
