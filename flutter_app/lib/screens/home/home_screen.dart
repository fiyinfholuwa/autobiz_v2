import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../data/catalog.dart';
import '../../features/home/charts.dart';
import '../../features/home/data.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /  (Home tab) — ported from mobile_app/src/app/(tabs)/index.tsx
class HomeScreen extends StatelessWidget {
  /// query parameters
  final Map<String, String> q;
  const HomeScreen({super.key, this.q = const {}});
  @override
  Widget build(BuildContext context) {
    final authed = context.select<AppStore, bool>((s) => s.authed);
    return authed ? const _Dashboard() : const _GuestHome();
  }
}

const _tabPaths = {'/', '/shop', '/pay', '/cards', '/more'};

/// Tabs are switched with go(); everything else is pushed on top.
void _goHref(BuildContext context, String href) {
  final path = Uri.parse(href).path;
  if (_tabPaths.contains(path)) {
    context.go(href);
  } else {
    context.push(href);
  }
}

const _quick = [
  ('Airtime', 'bi-phone', 'warning', '/pay?tab=airtime'),
  ('Data', 'bi-wifi', 'primary', '/pay?tab=data'),
  ('Electricity', 'bi-lightning-charge', 'orange', '/pay?tab=electricity'),
  ('Cable TV', 'bi-tv', 'cyan', '/pay?tab=cable'),
  ('eSIM', 'bi-sim', 'violet', '/esim'),
  ('Flights', 'bi-airplane', 'cyan', '/flights'),
  ('USD Card', 'bi-credit-card-2-front', 'success', '/cards'),
  ('Gift Cards', 'bi-gift', 'pink', '/giftcards'),
];

/* =========================== Authed dashboard =========================== */
class _Dashboard extends StatefulWidget {
  const _Dashboard();
  @override
  State<_Dashboard> createState() => _DashboardState();
}

class _DashboardState extends State<_Dashboard> {
  String recentDir = 'all';
  String mode = 'week';

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final user = s.user;
    final txs = s.transactions;
    final hide = s.settings.hideBalance;
    final total = s.balance + (s.usd + s.cards.fold(0.0, (a, x) => a + x.balance)) * usdRate;
    final budget = s.settings.budget > 0 ? s.settings.budget : 300000.0;
    final spent = spentThisMonth(txs);
    final bills = upcomingBills(txs, s.esims);
    final series = chartSeries(txs, mode);
    final exp = expenses(txs);
    final recent = txs.where((t) => recentDir == 'all' || t.direction == recentDir).take(5).toList();
    final hour = DateTime.now().hour;
    final greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    String masked(String v) => hide ? '₦ ••••' : v;

    // Fixed top bar — stays put while the page scrolls
    final header = Container(
      color: c.bg,
      padding: EdgeInsets.fromLTRB(16, MediaQuery.paddingOf(context).top + 8, 16, 10),
      child: Row(children: [
        Semantics(
          button: true, label: 'Profile and settings',
          child: GestureDetector(onTap: () => context.push('/settings'), child: Avatar(f.initials(user.firstName, user.lastName), size: 44, bg: c.primary, color: Colors.white)),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          AppText('$greet 👋', v: TV.xs, muted: true),
          AppText('${user.firstName} ${user.lastName}', v: TV.h3, maxLines: 1),
        ])),
        IconBtn('bi-bag', tooltip: 'Cart', badge: s.cartCount, onPressed: () => context.push('/cart')),
        const SizedBox(width: 8),
        IconBtn('bi-bell', tooltip: 'Notifications', badge: s.unreadCount, onPressed: () => context.push('/notifications')),
      ]),
    );

    return AppScreen(
      header: header,
      bottomInset: tabBarSpace,
      onRefresh: () => sleep(900),
      children: [
        /* Balance hero */
        Container(
          margin: const EdgeInsets.only(top: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(R.xxl),
            gradient: LinearGradient(
              colors: c.dark ? const [Color(0xFF1F5C56), Color(0xFF123A36), Color(0xFF0B2422)] : [c.primary, c.primary700, const Color(0xFF12423D)],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(children: [
            Positioned(right: -40, top: -40, child: _circle(180, 0.07)),
            Positioned(right: 40, bottom: -70, child: _circle(140, 0.05)),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 18),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      const LogoMark(size: 22),
                      const SizedBox(width: 8),
                      const Expanded(child: AppText('Total balance · All Accounts', v: TV.sm, color: Color(0xD9FFFFFF), maxLines: 1)),
                      GestureDetector(
                        onTap: () => store.mutate(() => store.settings.hideBalance = !store.settings.hideBalance),
                        behavior: HitTestBehavior.opaque,
                        child: Row(children: [
                          AppIcon(hide ? 'bi-eye' : 'bi-eye-slash', size: 16, color: Colors.white),
                          const SizedBox(width: 5),
                          AppText(hide ? 'Show' : 'Hide', v: TV.xs, weight: FontWeight.w600, color: Colors.white),
                        ]),
                      ),
                    ]),
                    const SizedBox(height: 8),
                    FittedBox(
                      fit: BoxFit.scaleDown, alignment: Alignment.centerLeft,
                      child: AppText(hide ? '₦ ••••••' : f.naira(total, 2), v: TV.display, size: 34, color: Colors.white, tabular: true, maxLines: 1),
                    ),
                  ]),
                ),
                _AccountCarousel(hide: hide),
                const SizedBox(height: 14),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(children: [
                    for (final a in [
                      ('bi-plus-lg', 'Add money', openFund),
                      ('bi-bank', 'Withdraw', () => context.push('/wallet/withdraw')),
                      ('bi-send', 'Transfer', () => context.push('/wallet/transfer')),
                      ('bi-arrow-left-right', 'Convert', () => context.push('/wallet/convert')),
                    ])
                      Expanded(child: _HeroAction(icon: a.$1, label: a.$2, onTap: a.$3)),
                  ]),
                ),
              ]),
            ),
          ]),
        ),

        /* Quick actions */
        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SectionHeader('Quick actions', action: 'Fund wallet +', onAction: openFund),
            GridView.count(
              crossAxisCount: 4, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 14, childAspectRatio: 0.95,
              children: [
                for (final qa in _quick)
                  InkWell(
                    borderRadius: BorderRadius.circular(R.md),
                    onTap: () => _goHref(context, qa.$4),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      IconTile(qa.$2, tone: qa.$3, size: 48),
                      const SizedBox(height: 6),
                      AppText(qa.$1, size: 11, weight: FontWeight.w600, center: true, maxLines: 1),
                    ]),
                  ),
              ],
            ),
          ]),
        ),

        /* Budget */
        const SizedBox(height: 16),
        CardBox(
          child: Stack(children: [
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              SectionHeader('Monthly budget', subtitle: monthLabel()),
              BudgetGauge(spent: spent, budget: budget),
              const SizedBox(height: 14),
              Row(children: [
                Expanded(child: _miniBox(c.surface2, 'Spent so far', masked(f.naira(spent)), null)),
                const SizedBox(width: 10),
                Expanded(child: _miniBox(c.primarySoft, 'Left to spend', masked(f.naira(budget - spent < 0 ? 0 : budget - spent)), c.primary)),
              ]),
            ]),
            Positioned(
              right: 0, top: 0,
              child: Semantics(button: true, label: 'Edit budget', child: GestureDetector(onTap: () => showSheet(_BudgetSheet(budget: budget)), child: const IconTile('bi-pencil', size: 32))),
            ),
          ]),
        ),

        /* Upcoming bills */
        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            SectionHeader('Upcoming bills', action: 'View all', onAction: () => context.go('/pay')),
            for (var i = 0; i < bills.length; i++) ...[
              if (i > 0) const SizedBox(height: 10),
              _BillRow(b: bills[i], onTap: () => _goHref(context, bills[i].href)),
            ],
          ]),
        ),

        /* Recent transactions */
        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            SectionHeader('Recent transactions', action: 'View all', onAction: () => context.push('/transactions')),
            Segment<String>(small: true, value: recentDir, onChanged: (v) => setState(() => recentDir = v), options: const [SegOption('all', 'All'), SegOption('in', 'Money in'), SegOption('out', 'Money out')]),
            if (recent.isNotEmpty)
              for (final t in recent) TxRow(t)
            else
              const EmptyState(icon: 'bi-receipt', title: 'No transactions yet', message: 'Fund your wallet to get started.', action: 'Fund wallet', onAction: openFund),
          ]),
        ),

        /* Statistics */
        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              const Expanded(child: AppText('Statistics', v: TV.h3)),
              SizedBox(
                width: 190,
                child: SelectField<String>(
                  title: 'Compare', value: mode, onChanged: (v) => setState(() => mode = v),
                  options: const [SelectOption('week', 'Weekly Comparison'), SelectOption('month', 'Monthly Comparison')],
                ),
              ),
            ]),
            const SizedBox(height: 12),
            CompareBars(labels: series.labels, cur: series.cur, prev: series.prev, legend: series.legend),
          ]),
        ),

        /* Expenses */
        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SectionHeader('Expenses breakdown', subtitle: '*Compared to last month'),
            GridView.count(
              crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.45,
              children: [for (final e in exp) _ExpenseTile(e: e, hide: hide)],
            ),
          ]),
        ),
      ],
    );
  }

  Widget _miniBox(Color bg, String label, String value, Color? color) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(R.lg)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          AppText(label, v: TV.xs, muted: true),
          AppText(value, weight: FontWeight.w700, tabular: true, color: color, maxLines: 1),
        ]),
      );
}

Widget _circle(double size, double alpha) => IgnorePointer(
      child: Container(width: size, height: size, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: alpha))),
    );

class _HeroAction extends StatelessWidget {
  final String icon, label;
  final VoidCallback onTap;
  const _HeroAction({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: () { tapHaptic(); onTap(); },
        behavior: HitTestBehavior.opaque,
        child: Column(children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(16)),
            child: Center(child: AppIcon(icon, size: 20, color: Colors.white)),
          ),
          const SizedBox(height: 6),
          AppText(label, v: TV.xs, weight: FontWeight.w600, color: Colors.white, maxLines: 1),
        ]),
      );
}

class _BillRow extends StatelessWidget {
  final UpcomingBill b;
  final VoidCallback onTap;
  const _BillRow({required this.b, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final d = DateTime.fromMillisecondsSinceEpoch(b.due);
    return Material(
      color: c.surface2,
      borderRadius: BorderRadius.circular(R.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(R.lg),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(children: [
            Container(
              width: 52, height: 56,
              decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(14)),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                AppText(f.months[d.month - 1], v: TV.xs, muted: true, weight: FontWeight.w600),
                AppText('${d.day}', v: TV.h2),
              ]),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText(b.provider, v: TV.xs, muted: true),
              AppText(b.name, weight: FontWeight.w700, maxLines: 1),
              AppText('Last charge · ${b.last}', v: TV.xs, muted: true),
            ])),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(R.pill), border: Border.all(color: c.border)),
              child: AppText(b.amount != null ? f.naira(b.amount) : 'Top up', v: TV.sm, weight: FontWeight.w700),
            ),
          ]),
        ),
      ),
    );
  }
}

class _ExpenseTile extends StatelessWidget {
  final Expense e;
  final bool hide;
  const _ExpenseTile({required this.e, required this.hide});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final ch = e.change;
    return Material(
      color: c.surface2,
      borderRadius: BorderRadius.circular(R.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(R.lg),
        onTap: () => context.push(loc('/transactions', {'type': e.cat.type})),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              IconTile(e.cat.icon, tone: e.cat.tone, size: 34),
              const Spacer(),
              if (ch == null)
                AppText('New', v: TV.xs, weight: FontWeight.w700, color: c.primary)
              else ...[
                AppText('${ch.abs()}%*', v: TV.xs, weight: FontWeight.w700, color: ch > 0 ? c.danger : c.success),
                const SizedBox(width: 2),
                AppIcon(ch > 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-left', size: 12, color: ch > 0 ? c.danger : c.success),
              ],
            ]),
            const Spacer(),
            AppText(e.cat.label, v: TV.xs, muted: true, maxLines: 1),
            AppText(hide ? '₦ ••••' : f.naira(e.cur), weight: FontWeight.w700, tabular: true, maxLines: 1),
          ]),
        ),
      ),
    );
  }
}

/* ---------------- Account carousel ---------------- */
class _BrandMark extends StatelessWidget {
  final String brand;
  const _BrandMark(this.brand);
  @override
  Widget build(BuildContext context) {
    if (brand == 'mastercard') {
      return SizedBox(
        width: 35, height: 22,
        child: Stack(children: [
          Container(width: 22, height: 22, decoration: const BoxDecoration(color: Color(0xFFEB001B), shape: BoxShape.circle)),
          Positioned(left: 13, child: Container(width: 22, height: 22, decoration: BoxDecoration(color: const Color(0xFFF79E1B).withValues(alpha: 0.9), shape: BoxShape.circle))),
        ]),
      );
    }
    return const Text('VISA', style: TextStyle(fontFamily: fontFamily, fontWeight: FontWeight.w800, fontStyle: FontStyle.italic, fontSize: 18, letterSpacing: 1, color: Colors.white));
  }
}

class _Slide {
  final String key, type, num, amt, icon, href;
  final List<Color>? grad;
  final String? brand;
  const _Slide(this.key, this.type, this.num, this.amt, this.icon, this.href, [this.grad, this.brand]);
}

class _AccountCarousel extends StatefulWidget {
  final bool hide;
  const _AccountCarousel({required this.hide});
  @override
  State<_AccountCarousel> createState() => _AccountCarouselState();
}

class _AccountCarouselState extends State<_AccountCarousel> {
  PageController? _pc;
  double _fraction = 0;
  int idx = 0;

  @override
  void dispose() { _pc?.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    final hide = widget.hide;
    final slides = <_Slide>[
      _Slide('ngn', 'Naira Wallet', '7821 4436 09', hide ? '₦ ••••' : f.naira(s.balance, 2), 'bi-wallet2', '/wallet'),
      _Slide('usd', 'USD Wallet', 'AutoBiz · USD', hide ? '\$ ••••' : f.usd(s.usd), 'bi-currency-dollar', '/wallet/convert'),
      for (final cd in s.cards)
        _Slide(
          cd.id,
          '${cd.brand == 'mastercard' ? 'Mastercard' : 'Visa'} · ${cd.label.isNotEmpty ? cd.label : cd.name.isNotEmpty ? cd.name : 'Virtual card'}',
          cd.number, hide ? '\$ ••••' : f.usd(cd.balance), 'bi-credit-card-2-front', '/cards',
          cd.gradient.map((x) => Color(x)).toList(), cd.brand,
        ),
    ];
    if (idx >= slides.length) idx = slides.length - 1;
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(children: [
        LayoutBuilder(builder: (context, cons) {
          final w = cons.maxWidth;
          final cw = MediaQuery.sizeOf(context).width - 32 - 36 - 44;
          final fr = ((cw + 10) / w).clamp(0.3, 1.0);
          if (_pc == null || _fraction != fr) {
            _pc?.dispose();
            _fraction = fr;
            _pc = PageController(viewportFraction: fr, initialPage: idx);
          }
          return SizedBox(
            height: 104,
            child: PageView.builder(
              controller: _pc,
              padEnds: false,
              itemCount: slides.length,
              onPageChanged: (i) => setState(() => idx = i),
              itemBuilder: (context, i) => Padding(
                padding: EdgeInsets.only(left: i == 0 ? 18 : 10, right: i == slides.length - 1 ? 18 : 0),
                child: _SlideCard(s: slides[i], onTap: () => _goHref(context, slides[i].href)),
              ),
            ),
          );
        }),
        const SizedBox(height: 10),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          for (var i = 0; i < slides.length; i++)
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 2.5),
              width: i == idx ? 16 : 6, height: 6,
              decoration: BoxDecoration(color: i == idx ? Colors.white : Colors.white.withValues(alpha: 0.4), borderRadius: BorderRadius.circular(3)),
            ),
        ]),
      ]),
    );
  }
}

class _SlideCard extends StatelessWidget {
  final _Slide s;
  final VoidCallback onTap;
  const _SlideCard({required this.s, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final br = BorderRadius.circular(R.lg);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: br,
          gradient: s.grad != null && s.grad!.length > 1 ? LinearGradient(colors: s.grad!, begin: Alignment.topLeft, end: Alignment.bottomRight) : null,
          color: s.grad == null ? Colors.white.withValues(alpha: 0.13) : null,
          border: s.grad == null ? Border.all(color: Colors.white.withValues(alpha: 0.15)) : null,
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const AppText('Account Type', size: 10, color: Color(0xB3FFFFFF)),
              AppText(s.type, v: TV.sm, weight: FontWeight.w700, color: Colors.white, maxLines: 1),
            ])),
            if (s.brand != null) _BrandMark(s.brand!) else AppIcon(s.icon, size: 20, color: Colors.white),
          ]),
          const Spacer(),
          AppText(maskNumber(s.num), v: TV.xs, color: const Color(0xBFFFFFFF), maxLines: 1),
          Row(children: [
            Expanded(child: AppText(s.amt, v: TV.h3, color: Colors.white, tabular: true, maxLines: 1)),
            const AppIcon('bi-arrow-up-right', size: 16, color: Colors.white),
          ]),
        ]),
      ),
    );
  }
}

/* ---------------- Budget sheet ---------------- */
class _BudgetSheet extends StatefulWidget {
  final double budget;
  const _BudgetSheet({required this.budget});
  @override
  State<_BudgetSheet> createState() => _BudgetSheetState();
}

class _BudgetSheetState extends State<_BudgetSheet> {
  late String v = widget.budget.round().toString();
  String? err;

  void _save() {
    final n = double.tryParse(v) ?? 0;
    if (n < 1000) { setState(() => err = 'Enter at least ₦1,000'); return; }
    store.mutate(() => store.settings.budget = n);
    Navigator.of(context).pop();
    toast('Monthly budget updated');
  }

  @override
  Widget build(BuildContext context) => AppSheet(
        title: 'Set monthly budget',
        footer: Btn('Save budget', size: BtnSize.lg, full: true, onPressed: _save),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          AppTextField(
            label: 'Budget for ${f.monthsLong[DateTime.now().month - 1]}', prefix: '₦', big: true, keyboardType: TextInputType.number,
            inputFormatters: [AppTextField.digits], value: v, error: err,
            onChanged: (t) => setState(() { v = t; err = null; }),
          ),
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final p in [100000, 250000, 500000, 1000000])
              AppChip(f.naira(p), active: double.tryParse(v) == p, onTap: () => setState(() { v = '$p'; err = null; })),
          ]),
        ]),
      );
}

/* =========================== Guest home =========================== */
const _guestServices = [
  ('Shop', 'Verified sellers', 'bi-shop', 'primary', '/shop'),
  ('Travel eSIM', '120+ countries', 'bi-sim', 'violet', '/esim'),
  ('Flights', 'Pay in Naira', 'bi-airplane', 'cyan', '/flights'),
  ('Gift cards', 'Top rates', 'bi-gift', 'pink', '/giftcards'),
  ('USD cards', 'Netflix, AWS…', 'bi-credit-card-2-front', 'success', '/cards'),
  ('Airtime & bills', 'Instant, 24/7', 'bi-lightning-charge', 'warning', '/pay'),
];

class _GuestHome extends StatelessWidget {
  const _GuestHome();
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final cartCount = context.select<AppStore, int>((s) => s.cartCount);
    final top = c.dark ? const Color(0xFF1F5C56) : c.primary;
    final heroGrad = c.dark ? const [Color(0xFF1F5C56), Color(0xFF0B2422)] : [c.primary, c.primary700];

    // Fixed top bar — stays put while the page scrolls
    final header = Container(
      color: top,
      padding: EdgeInsets.fromLTRB(20, MediaQuery.paddingOf(context).top + 8, 20, 10),
      child: Row(children: [
        const Logo(size: 34, light: true),
        const Spacer(),
        IconBtn('bi-bag', bg: Colors.white.withValues(alpha: 0.18), color: Colors.white, tooltip: 'Cart', badge: cartCount, onPressed: () => context.push('/cart')),
      ]),
    );

    return AppScreen(
      header: header,
      bottomInset: tabBarSpace,
      padded: false,
      // AppScreen adds 4px top padding; shift up so the hero meets the fixed bar seamlessly.
      child: Transform.translate(
        offset: const Offset(0, -4),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 56),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: heroGrad, begin: Alignment.topCenter, end: Alignment.bottomCenter),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(clipBehavior: Clip.none, children: [
              Positioned(right: -60, top: -30, child: _circle(220, 0.08)),
              Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const SizedBox(height: 12),
                const AppText('Shop, travel & pay\nfrom one wallet.', v: TV.display, color: Colors.white),
                const SizedBox(height: 10),
                const AppText('Airtime, data & bills, travel eSIMs, flights, USD cards and gift card trading — all in Naira.', color: Color(0xD9FFFFFF)),
                const SizedBox(height: 20),
                Row(children: [
                  Expanded(flex: 13, child: Btn('Create free account', variant: BtnVariant.dark, onPressed: () => context.push('/register'))),
                  const SizedBox(width: 10),
                  Expanded(flex: 10, child: Btn('Log in', variant: BtnVariant.light, onPressed: () => context.push('/login'))),
                ]),
              ]),
            ]),
          ),
          Transform.translate(
            offset: const Offset(0, -32),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Container(
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.xl), boxShadow: shadow(c, 2)),
                  child: CardBox(
                    elevated: false,
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      const SectionHeader('Everything on AutoBiz'),
                      GridView.count(
                        crossAxisCount: 3, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 0.92,
                        children: [
                          for (final sv in _guestServices)
                            Material(
                              color: c.surface2,
                              borderRadius: BorderRadius.circular(R.lg),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(R.lg),
                                onTap: () => _goHref(context, sv.$5),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    IconTile(sv.$3, tone: sv.$4, size: 40),
                                    const Spacer(),
                                    AppText(sv.$1, v: TV.sm, weight: FontWeight.w700, maxLines: 1),
                                    AppText(sv.$2, size: 11, muted: true, maxLines: 1),
                                  ]),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ]),
                  ),
                ),
                const SizedBox(height: 16),
                GestureDetector(
                  onTap: () => context.push('/register'),
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(R.xl),
                      gradient: const LinearGradient(colors: [Color(0xFF7048E8), Color(0xFFE64980)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                    ),
                    child: Row(children: [
                      const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        AppText('Welcome offer', v: TV.label, color: Color(0xCCFFFFFF)),
                        SizedBox(height: 4),
                        AppText('Sign up & get ₦1,000 off your first order', v: TV.h3, color: Colors.white),
                      ])),
                      const SizedBox(width: 14),
                      Container(
                        width: 52, height: 52,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.2)),
                        child: const Center(child: AppIcon('bi-gift', size: 26, color: Colors.white)),
                      ),
                    ]),
                  ),
                ),
                const SizedBox(height: 16),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  clipBehavior: Clip.none,
                  child: Row(children: [
                    for (final p in const [
                      ('Fly Lagos → Dubai', 'Emirates fares this week', 'bi-airplane', [Color(0xFFC8102E), Color(0xFF7A0A1D)], '/flights?from=LOS&to=DXB'),
                      ('Travel eSIM from \$0.99', 'No roaming fees', 'bi-sim', [Color(0xFF7048E8), Color(0xFF3B1FA6)], '/esim'),
                      ('Sell gift cards', 'Up to ₦1,210/\$', 'bi-gift', [Color(0xFFF59F00), Color(0xFFE8590C)], '/giftcards'),
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: 12),
                        child: GestureDetector(
                          onTap: () => _goHref(context, p.$5),
                          child: Container(
                            width: 230, height: 120, padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.xl), gradient: LinearGradient(colors: p.$4, begin: Alignment.topLeft, end: Alignment.bottomRight)),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                              AppIcon(p.$3, size: 26, color: Colors.white),
                              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                AppText(p.$1, weight: FontWeight.w700, color: Colors.white),
                                AppText(p.$2, v: TV.xs, color: const Color(0xCCFFFFFF)),
                              ]),
                            ]),
                          ),
                        ),
                      ),
                  ]),
                ),
                const SizedBox(height: 16),
                CardBox(
                  child: Column(children: [
                    for (final r in const [
                      ('bi-shield-check', 'Buyer protection', "Refund if it doesn't arrive"),
                      ('bi-lightning-charge', 'Instant delivery', 'Airtime, data & codes in seconds'),
                      ('bi-lock', 'Secure payments', 'PIN-protected wallet'),
                      ('bi-headset', '24/7 support', 'Chat, call or email'),
                    ])
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(children: [
                          IconTile(r.$1, size: 38),
                          const SizedBox(width: 12),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            AppText(r.$2, weight: FontWeight.w600),
                            AppText(r.$3, v: TV.xs, muted: true),
                          ])),
                        ]),
                      ),
                  ]),
                ),
              ]),
            ),
          ),
        ]),
      ),
    );
  }
}
