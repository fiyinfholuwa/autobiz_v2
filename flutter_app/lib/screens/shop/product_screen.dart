import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../data/catalog.dart';
import '../../features/shop/logic.dart';
import '../../features/shop/product_card.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _tones = ['primary', 'violet', 'pink', 'cyan', 'orange', 'success', 'warning'];

/// Route: /product/:id
class ProductScreen extends StatefulWidget {
  final String id;
  /// query parameters
  final Map<String, String> q;
  const ProductScreen({super.key, required this.id, this.q = const {}});
  @override
  State<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends State<ProductScreen> {
  late final Product? p = productById(widget.id);
  int view = 0;
  String? color;
  int qty = 1;
  final _qtyCtl = TextEditingController(text: '1');
  String tab = 'desc';
  int? starFilter;
  final helpful = <int, bool>{};
  String state = 'Lagos';
  bool buying = false;
  final _pager = PageController();
  final _tabsKey = GlobalKey();
  late final List<Review> reviews = p != null ? genReviews(p!) : [];
  late final breakdown = p != null ? ratingBreakdown(p!) : <({int k, int count})>[];
  late final stats = p != null ? sellerStats(p!.seller) : null;

  @override
  void initState() {
    super.initState();
    color = p?.colors?.first;
    for (final o in store.orders) {
      if (o.address.state.isNotEmpty) { state = o.address.state; break; }
    }
  }

  @override
  void dispose() { _qtyCtl.dispose(); _pager.dispose(); super.dispose(); }

  int get _inCart => p == null ? 0 : inCartQty(p!.id);
  int get _max => p == null ? 0 : p!.stock - _inCart;

  void _setQ(int n) {
    final v = n.clamp(1, _max < 1 ? 1 : _max);
    setState(() { qty = v; _qtyCtl.text = '$v'; });
  }

  void _goView(int i) {
    final n = (i + 4) % 4;
    setState(() => view = n);
    _pager.animateToPage(n, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final p = this.p;
    if (p == null) {
      final popular = ([...products]..sort((a, b) => b.reviews.compareTo(a.reviews))).take(4).toList();
      return AppScreen(
        header: const AppHeader(title: 'Product', fallback: '/shop'),
        children: [
          EmptyState(icon: 'bi-search', title: "We couldn't find that product", message: 'It may have been sold out, removed by the seller, or the link is incorrect. Explore similar deals below.', action: 'Browse marketplace', onAction: () => context.go('/shop')),
          Center(child: Btn('Go to cart', variant: BtnVariant.outline, onPressed: () => context.push('/cart'))),
          const Padding(padding: EdgeInsets.only(top: 24, bottom: 10), child: AppText('Popular right now', v: TV.h3)),
          ProductGrid(popular),
        ],
      );
    }

    final wished = s.wishlist.contains(p.id);
    final following = s.settings.following[p.seller] == true;
    final d = disc(p);
    final inCart = _inCart;
    final max = _max;
    final altTone = _tones[(_tones.indexOf(p.tone) + 2) % 7];
    final views = [
      (label: 'Front', icon: p.icon, tone: p.tone, rotate: 0.0, scale: 0.42),
      (label: 'Angle', icon: p.icon, tone: p.tone, rotate: -0.314, scale: 0.42),
      (label: 'Detail', icon: p.icon, tone: altTone, rotate: 0.14, scale: 0.62),
      p.digital ? (label: 'Delivery', icon: 'bi-envelope-paper', tone: 'success', rotate: 0.0, scale: 0.42) : (label: 'In the box', icon: 'bi-box-seam', tone: 'success', rotate: 0.0, scale: 0.42),
    ];
    final (String stockText, Color stockCol) = max <= 0
        ? ('All available stock is in your cart', c.danger)
        : p.digital
            ? ('Available instantly', c.success)
            : p.stock <= 10
                ? ('Only ${p.stock} left in stock${inCart > 0 ? ' · $inCart in cart' : ''}', c.danger)
                : ('In stock · ${p.stock} available${inCart > 0 ? ' · $inCart in cart' : ''}', c.muted);

    void add() { if (addToCart(p.id, qty: qty, color: color, useDefaultColor: false, onView: () => context.push('/cart'))) _setQ(1); }
    Future<void> buyNow() async {
      if (!addToCart(p.id, qty: qty, color: color, useDefaultColor: false, silent: true)) return;
      setState(() => buying = true);
      await Future.delayed(const Duration(milliseconds: 500));
      if (!mounted) return;
      setState(() => buying = false);
      _setQ(1);
      if (context.mounted) context.push(loc('/cart', {'checkout': '1'}));
    }
    void toggleFollow() {
      final now = !following;
      store.mutate(() => store.settings.following[p.seller] = now);
      toast(now ? "You're now following **${p.seller}**" : 'Unfollowed ${p.seller}', type: now ? ToastType.success : ToastType.info);
    }

    final specs = [
      SRow('Brand', p.brand), SRow('Model', p.name), SRow('Category', catName(p.category)),
      SRow('SKU', 'AB-${p.id.toUpperCase()}-${(p.brand.length > 3 ? p.brand.substring(0, 3) : p.brand).toUpperCase()}'),
      if (p.colors != null) SRow('Colours', p.colors!.map(colorName).join(', ')),
      SRow('Condition', p.digital ? 'Digital licence / code' : 'Brand new, sealed'), SRow('Warranty', warranty(p)),
      SRow('Ships from', p.digital ? 'Instant (online)' : 'Lagos, Nigeria'), SRow('Seller', p.seller),
    ];
    final shownReviews = starFilter != null ? reviews.where((r) => r.stars == starFilter).toList() : reviews;
    final maxCount = breakdown.fold<int>(1, (a, b) => b.count > a ? b.count : a);
    final related = [
      ...products.where((x) => x.category == p.category && x.id != p.id),
      ...(products.where((x) => x.category != p.category && x.id != p.id).toList()..sort((a, b) => b.reviews.compareTo(a.reviews))),
    ].take(8).toList();
    final reviewsLabel = p.reviews > 999 ? '${(p.reviews / 100).round() / 10}k' : '${p.reviews}';

    return AppScreen(
      padded: false,
      header: AppHeader(title: catName(p.category), fallback: '/shop', actions: [
        IconBtn('bi-share', tooltip: 'Share product', onPressed: () => copyText('https://autobiz.app/product/${p.id}', 'Product link copied')),
        IconBtn('ion:cart-outline', badge: s.cartCount, tooltip: 'Cart', onPressed: () => context.push('/cart')),
      ]),
      footer: Row(children: [
        IconBtn(wished ? 'bi-heart-fill' : 'bi-heart', size: 50, color: wished ? c.pink : c.text, bg: c.surface2, tooltip: 'Wishlist', onPressed: () => toggleWish(p.id, () => context.push(loc('/orders', {'tab': 'wishlist'})))),
        const SizedBox(width: 10),
        Expanded(child: Btn('Add to cart', icon: 'ion:cart-outline', variant: BtnVariant.soft, disabled: max <= 0, onPressed: add)),
        const SizedBox(width: 10),
        Expanded(child: Btn('Buy now', disabled: max <= 0, loading: buying, loadingText: 'Buy now', onPressed: buyNow)),
      ]),
      children: [
        // Gallery
        Stack(children: [
          AspectRatio(
            aspectRatio: 1,
            child: PageView.builder(
              controller: _pager,
              itemCount: views.length,
              onPageChanged: (i) => setState(() => view = i),
              itemBuilder: (_, i) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ClipRRect(borderRadius: BorderRadius.circular(28), child: ProductArt(icon: views[i].icon, tone: views[i].tone, size: null, iconScale: views[i].scale, rotate: views[i].rotate)),
              ),
            ),
          ),
          if (d > 0) Positioned(top: 12, left: 28, child: Pill('-$d%', tone: 'danger', solid: true)),
          if (color != null)
            Positioned(
              bottom: 12, left: 28,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(R.pill)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Container(width: 12, height: 12, decoration: BoxDecoration(color: swatch(color!), shape: BoxShape.circle, border: Border.all(color: c.border))),
                  const SizedBox(width: 6),
                  AppText(colorName(color), v: TV.xs, weight: FontWeight.w600),
                ]),
              ),
            ),
          Positioned.fill(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 22),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                IconBtn('bi-chevron-left', size: 34, tooltip: 'Previous image', onPressed: () => _goView(view - 1)),
                IconBtn('bi-chevron-right', size: 34, tooltip: 'Next image', onPressed: () => _goView(view + 1)),
              ]),
            ),
          ),
        ]),
        const SizedBox(height: 12),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          for (var i = 0; i < views.length; i++)
            GestureDetector(
              onTap: () => _goView(i),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 5),
                child: Column(children: [
                  Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: i == view ? c.primary : Colors.transparent, width: 2)),
                    child: ProductArt(icon: views[i].icon, tone: views[i].tone, size: 54, rotate: views[i].rotate, iconScale: views[i].scale),
                  ),
                  const SizedBox(height: 4),
                  AppText(views[i].label, size: 10, weight: FontWeight.w600, muted: i != view),
                ]),
              ),
            ),
        ]),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Wrap(spacing: 6, runSpacing: 6, children: [
              if (p.badge != null) Pill(p.badge!),
              if (p.digital) const Pill('Instant delivery', tone: 'warning', icon: 'bi-lightning-fill') else if (p.freeShipping) const Pill('Free delivery', tone: 'success', icon: 'bi-truck'),
              Pill(p.brand, tone: 'neutral'),
            ]),
            const SizedBox(height: 14),
            AppText(p.name, v: TV.h2),
            const SizedBox(height: 14),
            GestureDetector(
              onTap: () {
                setState(() => tab = 'reviews');
                final ctx = _tabsKey.currentContext;
                if (ctx != null) Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 350));
              },
              child: Row(children: [
                Stars(p.rating), const SizedBox(width: 6),
                AppText('${p.rating}', v: TV.sm, weight: FontWeight.w600), const SizedBox(width: 6),
                AppText('· ${grouped(p.reviews)} ratings', v: TV.sm, muted: true),
              ]),
            ),
            const SizedBox(height: 14),
            Wrap(crossAxisAlignment: WrapCrossAlignment.end, spacing: 10, children: [
              AppText(f.naira(p.price), v: TV.display, tabular: true),
              if (p.oldPrice != null) Padding(padding: const EdgeInsets.only(bottom: 5), child: AppText(f.naira(p.oldPrice), muted: true, strike: true, tabular: true)),
              if (d > 0) Padding(padding: const EdgeInsets.only(bottom: 6), child: Pill('-$d%', tone: 'danger')),
            ]),
            if (p.oldPrice != null) AppText('You save ${f.naira(p.oldPrice! - p.price)}', v: TV.sm, weight: FontWeight.w600, color: c.success),
            if (p.colors != null) ...[
              const SizedBox(height: 14),
              Text.rich(TextSpan(style: tvStyle(context, TV.sm, weight: FontWeight.w600), children: [
                const TextSpan(text: 'Colour: '),
                TextSpan(text: colorName(color), style: TextStyle(color: c.muted, fontWeight: FontWeight.w400)),
              ])),
              const SizedBox(height: 8),
              Row(children: [
                for (final col in p.colors!)
                  Semantics(
                    label: colorName(col), button: true,
                    child: GestureDetector(
                      onTap: () => setState(() => color = col),
                      child: Container(
                        margin: const EdgeInsets.only(right: 10),
                        width: 42, height: 42, padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: color == col ? c.primary : Colors.transparent, width: 2)),
                        child: Container(decoration: BoxDecoration(shape: BoxShape.circle, color: swatch(col), border: Border.all(color: c.border))),
                      ),
                    ),
                  ),
              ]),
            ],
            const SizedBox(height: 14),
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const AppText('Quantity', v: TV.sm, weight: FontWeight.w600),
                const SizedBox(height: 2),
                AppText(stockText, v: TV.xs, color: stockCol),
              ])),
              IconBtn('bi-dash-lg', size: 36, bg: c.surface2, tooltip: 'Decrease', onPressed: qty <= 1 ? null : () => _setQ(qty - 1)),
              SizedBox(
                width: 44,
                child: TextField(
                  controller: _qtyCtl,
                  textAlign: TextAlign.center,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  style: tvStyle(context, TV.body, weight: FontWeight.w700, size: 16),
                  decoration: const InputDecoration(border: InputBorder.none, isDense: true),
                  onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
                  onEditingComplete: () => FocusManager.instance.primaryFocus?.unfocus(),
                ).withEndEditing(() {
                  final n = int.tryParse(_qtyCtl.text);
                  if (n == null || n < 1) { _setQ(1); return; }
                  if (n > max) { toast('Only $max available to add', type: ToastType.warning); _setQ(max); return; }
                  _setQ(n);
                }),
              ),
              IconBtn('bi-plus-lg', size: 36, bg: c.surface2, tooltip: 'Increase', onPressed: qty >= max ? null : () => _setQ(qty + 1)),
            ]),
            const SizedBox(height: 14),
            Row(children: [
              for (final (i, t) in [
                ('bi-shield-check', 'Buyer protection'),
                (p.digital ? 'bi-arrow-repeat' : 'bi-arrow-counterclockwise', p.digital ? 'Refund if code fails' : '7-day returns'),
                (p.digital ? 'bi-wallet2' : 'bi-cash', p.digital ? 'Wallet checkout' : 'Pay on delivery'),
              ].indexed) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(R.lg)),
                    child: Column(children: [AppIcon(t.$1, size: 18, color: c.primary), const SizedBox(height: 6), AppText(t.$2, size: 11, weight: FontWeight.w600, center: true)]),
                  ),
                ),
              ],
            ]),
            const SizedBox(height: 14),
            // Delivery
            CardBox(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const AppText('Delivery', v: TV.title),
                const SizedBox(height: 10),
                if (p.digital)
                  Row(children: [
                    const IconTile('bi-lightning-charge', tone: 'warning', size: 40),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const AppText('Instant digital delivery', weight: FontWeight.w600),
                      AppText('Code shown in My Orders & sent to ${s.user.email}', v: TV.xs, muted: true),
                    ])),
                    AppText('Free', weight: FontWeight.w700, color: c.success),
                  ])
                else ...[
                  SelectField<String>(label: 'Deliver to', value: state, title: 'Choose state', searchable: true, options: [for (final st in states) SelectOption(st, st)], onChanged: (v) => setState(() => state = v)),
                  const SizedBox(height: 6),
                  for (final m in const [('standard', 'Door delivery', 'bi-truck', 'primary'), ('express', 'Express delivery', 'bi-lightning', 'violet'), ('pickup', 'Pickup station', 'bi-shop-window', 'success')])
                    Builder(builder: (context) {
                      final fee = productDeliveryFee(p, m.$1, state);
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(children: [
                          IconTile(m.$3, tone: m.$4, size: 38),
                          const SizedBox(width: 12),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            AppText(m.$2, v: TV.sm, weight: FontWeight.w600),
                            AppText('Arrives ${eta(state, m.$1)}', v: TV.xs, muted: true),
                          ])),
                          AppText(fee > 0 ? f.naira(fee) : 'Free', v: TV.sm, weight: FontWeight.w700, color: fee > 0 ? c.text : c.success),
                        ]),
                      );
                    }),
                ],
              ]),
            ),
            const SizedBox(height: 14),
            // Tabs
            Segment<String>(
              key: _tabsKey,
              value: tab,
              onChanged: (v) => setState(() => tab = v),
              options: [const SegOption('desc', 'Description'), const SegOption('specs', 'Specs'), SegOption('reviews', 'Reviews ($reviewsLabel)')],
            ),
            const SizedBox(height: 14),
            if (tab == 'desc')
              CardBox(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Text.rich(TextSpan(style: tvStyle(context, TV.sm).copyWith(height: 21 / 13), children: [
                    TextSpan(text: '${shortDesc(p)} The '),
                    TextSpan(text: p.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                    TextSpan(text: ' from ${p.brand} is one of the most-loved picks in ${catName(p.category)}, with over ${grouped(p.reviews)} verified ratings from AutoBiz shoppers across Nigeria.'),
                  ])),
                  const SizedBox(height: 14),
                  const AppText('Key features', v: TV.title),
                  const SizedBox(height: 8),
                  for (final ft in features[p.category] ?? const <String>[])
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Padding(padding: const EdgeInsets.only(top: 2), child: AppIcon('bi-check-circle-fill', size: 16, color: c.success)),
                        const SizedBox(width: 8),
                        Expanded(child: AppText(ft, v: TV.sm)),
                      ]),
                    ),
                  const SizedBox(height: 10),
                  Notice(p.digital
                      ? 'Your code appears in **My Orders** right after payment. Digital goods can only be paid with your wallet.'
                      : 'Sold by **${p.seller}** and fulfilled by AutoBiz Logistics. Inspect your item at delivery when paying on delivery.'),
                ]),
              )
            else if (tab == 'specs')
              Container(decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(R.lg)), child: Summary(specs))
            else
              CardBox(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(children: [
                    SizedBox(
                      width: 96,
                      child: Column(children: [
                        AppText(p.rating.toStringAsFixed(1), v: TV.display),
                        Stars(p.rating),
                        const SizedBox(height: 4),
                        AppText('${grouped(p.reviews)} ratings', v: TV.xs, muted: true, center: true),
                      ]),
                    ),
                    const SizedBox(width: 16),
                    Expanded(child: Column(children: [
                      for (final b in breakdown)
                        GestureDetector(
                          onTap: () => setState(() => starFilter = starFilter == b.k ? null : b.k),
                          child: Opacity(
                            opacity: starFilter != null && starFilter != b.k ? 0.45 : 1,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2),
                              child: Row(children: [
                                SizedBox(width: 10, child: AppText('${b.k}', v: TV.xs, weight: FontWeight.w600)),
                                const SizedBox(width: 6),
                                const AppIcon('bi-star-fill', size: 10, color: Color(0xFFF59F00)),
                                const SizedBox(width: 6),
                                Expanded(child: ProgressBar(b.count / maxCount, color: const Color(0xFFF59F00), height: 6)),
                                SizedBox(width: 40, child: AppText('${b.count}', v: TV.xs, muted: true, align: TextAlign.right)),
                              ]),
                            ),
                          ),
                        ),
                    ])),
                  ]),
                  const SizedBox(height: 14),
                  Row(children: [
                    Expanded(child: AppText(starFilter != null ? '$starFilter-star only' : 'Most recent', v: TV.sm, weight: FontWeight.w600)),
                    if (starFilter != null) GestureDetector(onTap: () => setState(() => starFilter = null), child: AppText('Show all', v: TV.sm, weight: FontWeight.w700, color: c.primary)),
                  ]),
                  if (shownReviews.isEmpty)
                    EmptyState(icon: 'bi-star', tone: 'warning', title: 'No $starFilter-star reviews in this sample', message: 'Try another rating filter.')
                  else
                    for (final r in shownReviews)
                      Container(
                        margin: const EdgeInsets.only(top: 10),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(border: Border(top: BorderSide(color: c.border))),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [Stars(r.stars.toDouble(), size: 12), const Spacer(), AppText(f.date(r.date), v: TV.xs, muted: true)]),
                          const SizedBox(height: 6),
                          AppText(r.title, weight: FontWeight.w700),
                          const SizedBox(height: 2),
                          AppText(r.body, v: TV.sm, muted: true),
                          const SizedBox(height: 6),
                          Text.rich(TextSpan(style: tvStyle(context, TV.xs, muted: true), children: [
                            TextSpan(text: '${r.name} · ${r.city}${r.variant != null ? ' · ${r.variant}' : ''} · '),
                            TextSpan(text: '✔ Verified purchase', style: TextStyle(color: c.success)),
                          ])),
                          const SizedBox(height: 8),
                          GestureDetector(
                            onTap: () => setState(() => helpful[r.id] = !(helpful[r.id] ?? false)),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.pill), border: Border.all(color: helpful[r.id] == true ? c.primary : c.border)),
                              child: Row(mainAxisSize: MainAxisSize.min, children: [
                                AppIcon('ion:thumbs-up-outline', size: 13, color: helpful[r.id] == true ? c.primary : c.muted),
                                const SizedBox(width: 5),
                                AppText('Helpful (${r.helpful + (helpful[r.id] == true ? 1 : 0)})', v: TV.xs, weight: FontWeight.w600, color: helpful[r.id] == true ? c.primary : c.muted),
                              ]),
                            ),
                          ),
                        ]),
                      ),
                ]),
              ),
            // Seller
            if (stats != null) ...[
              const SizedBox(height: 14),
              CardBox(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(children: [
                    Avatar(p.seller.split(RegExp(r'\s+')).take(2).map((w) => w[0]).join().toUpperCase(), size: 48),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [Flexible(child: AppText(p.seller, weight: FontWeight.w700, maxLines: 1)), const SizedBox(width: 4), AppIcon('bi-patch-check-fill', size: 15, color: c.primary)]),
                      AppText('${stats!.years} yr${stats!.years > 1 ? 's' : ''} on AutoBiz · ${stats!.followers}k followers', v: TV.xs, muted: true),
                    ])),
                    Btn(following ? 'Following' : 'Follow', size: BtnSize.sm, variant: following ? BtnVariant.soft : BtnVariant.primary, icon: following ? 'bi-check-lg' : 'bi-plus-lg', onPressed: toggleFollow),
                  ]),
                  Summary([SRow('Seller rating', '${stats!.rating} ★'), SRow('Order fulfilment', '${stats!.score}%'), SRow('Products listed', '${stats!.items}')], margin: const EdgeInsets.only(top: 12)),
                  const SizedBox(height: 12),
                  Btn('Visit store', variant: BtnVariant.outline, icon: 'bi-shop', onPressed: () => context.go(loc('/shop', {'seller': p.seller}))),
                ]),
              ),
            ],
          ]),
        ),
        // Related
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 22, 16, 10),
          child: Row(children: [
            const Expanded(child: AppText('You may also like', v: TV.h3)),
            GestureDetector(onTap: () => context.go(loc('/shop', {'cat': p.category})), child: AppText('See more', v: TV.sm, weight: FontWeight.w700, color: c.primary)),
          ]),
        ),
        HScroll(gap: 12, children: [for (final x in related) ProductCard(x, width: 168)]),
      ],
    );
  }
}

extension _EndEditing on TextField {
  /// Run [fn] when the field loses focus (RN onEndEditing).
  Widget withEndEditing(VoidCallback fn) => Focus(
        onFocusChange: (has) { if (!has) fn(); },
        child: this,
      );
}
