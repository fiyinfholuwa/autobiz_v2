import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../data/catalog.dart';
import '../../features/esim/components.dart';
import '../../features/esim/logic.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /esim  (q: tab=buy|mine|how, country)
class EsimScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const EsimScreen({super.key, this.q = const {}});
  @override
  State<EsimScreen> createState() => _EsimScreenState();
}

const _tabs = ['buy', 'mine', 'how'];

class _EsimScreenState extends State<EsimScreen> {
  late String tab = _tabs.contains(widget.q['tab']) ? widget.q['tab']! : 'buy';
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    final code = widget.q['country'];
    if (code != null && countryByCode(code) != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted) context.push('/esim/$code'); });
    }
  }

  @override
  void didUpdateWidget(EsimScreen old) {
    super.didUpdateWidget(old);
    final t = widget.q['tab'];
    if (t != null && t != old.q['tab'] && _tabs.contains(t)) setState(() => tab = t);
  }

  @override
  void dispose() { _scroll.dispose(); super.dispose(); }

  void goto(String t) {
    setState(() => tab = t);
    if (_scroll.hasClients) _scroll.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    final count = s.esims.where((e) => !e.archived).length;
    return AppScreen(
      controller: _scroll,
      header: const AppHeader(title: 'Travel eSIM', subtitle: 'Instant mobile data in 120+ countries'),
      children: [
        Segment<String>(value: tab, onChanged: goto, options: [
          const SegOption('buy', 'Buy eSIM'),
          SegOption('mine', 'My eSIMs', badge: count > 0 ? count : null),
          const SegOption('how', 'How it works'),
        ]),
        const SizedBox(height: 16),
        if (tab == 'buy') const _BuyTab() else if (tab == 'mine') _MineTab(goto: goto) else _HowTab(goto: goto),
      ],
    );
  }
}

/* ---------------- Buy ---------------- */
class _BuyTab extends StatefulWidget {
  const _BuyTab();
  @override
  State<_BuyTab> createState() => _BuyTabState();
}

class _BuyTabState extends State<_BuyTab> {
  String q = '', region = 'all', sort = 'popular';
  bool loading = false;
  Timer? _t;

  @override
  void dispose() { _t?.cancel(); super.dispose(); }

  void open(EsimCountry c) => context.push('/esim/${c.code}');

  void pickRegion(String r) {
    setState(() { region = r; loading = true; });
    _t?.cancel();
    _t = Timer(const Duration(milliseconds: 600), () { if (mounted) setState(() => loading = false); });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final results = searchCountries(q);
    var list = esimCountries.where((x) => region == 'all' || x.region == region).toList();
    if (sort == 'price') list.sort((a, b) => minFrom(a).compareTo(minFrom(b)));
    if (sort == 'name') list.sort((a, b) => a.name.compareTo(b.name));

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.xl), gradient: LinearGradient(colors: [c.primary700, const Color(0xFF0F3F3A)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
        child: Stack(children: [
          const Positioned(right: -30, top: -20, child: Opacity(opacity: 0.12, child: AppIcon('bi-globe2', size: 170, color: Colors.white))),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Pill('Instant delivery · Pay in Naira', icon: 'bi-lightning-charge-fill', tone: 'success', solid: true),
              const SizedBox(height: 12),
              const AppText('Where are you travelling to?', v: TV.h2, color: Colors.white),
              const SizedBox(height: 4),
              const AppText('Search a country or region and get a data plan that works the moment you land.', v: TV.sm, color: Color(0xCCFFFFFF)),
              const SizedBox(height: 16),
              AppTextField(
                icon: 'bi-search', placeholder: 'Search a country, e.g. Ghana', value: q, autocorrect: false,
                onChanged: (v) => setState(() => q = v),
                suffix: q.isNotEmpty ? GestureDetector(onTap: () => setState(() => q = ''), child: AppIcon('bi-x-circle-fill', size: 18, color: c.muted)) : null,
              ),
              if (q.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(R.lg)),
                  child: results.isEmpty
                      ? Padding(padding: const EdgeInsets.symmetric(vertical: 14), child: AppText('No destination matches “$q”. Try the Global pack.', v: TV.sm, muted: true))
                      : Column(children: [
                          for (final r in results)
                            InkWell(
                              onTap: () => open(r),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 11),
                                child: Row(children: [
                                  CountryArt.of(r, size: 30),
                                  const SizedBox(width: 12),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    AppText(r.name, weight: FontWeight.w600),
                                    AppText('${regionName(r.region)} · ${r.speed}', v: TV.xs, muted: true),
                                  ])),
                                  AppText('from \$${minFrom(r).toStringAsFixed(2)}', v: TV.sm, weight: FontWeight.w700, color: c.primary),
                                ]),
                              ),
                            ),
                        ]),
                ),
              const SizedBox(height: 14),
              Wrap(spacing: 14, runSpacing: 6, children: [
                for (final t in ['Keep your Nigerian WhatsApp number', 'Hotspot allowed', 'From \$${globalMin().toStringAsFixed(2)}'])
                  Row(mainAxisSize: MainAxisSize.min, children: [
                    const AppIcon('bi-check-circle-fill', size: 14, color: Color(0xFFA9F5DC)),
                    const SizedBox(width: 5),
                    AppText(t, v: TV.xs, color: Colors.white),
                  ]),
              ]),
            ]),
          ),
        ]),
      ),
      const SizedBox(height: 22),
      Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const AppText('Popular destinations', v: TV.h3),
          AppText('Prices include VAT · ₦ at ${f.naira(1580)}/\$', v: TV.xs, muted: true),
        ])),
        SizedBox(
          width: 150,
          child: SelectField<String>(value: sort, onChanged: (v) => setState(() => sort = v), title: 'Sort destinations', options: const [
            SelectOption('popular', 'Most popular'), SelectOption('price', 'Lowest price'), SelectOption('name', 'A – Z'),
          ]),
        ),
      ]),
      const SizedBox(height: 10),
      Transform.translate(
        offset: const Offset(-16, 0),
        child: SizedBox(
          width: MediaQuery.sizeOf(context).width,
          child: HScroll(children: [
            for (final r in esimRegions) AppChip(r.name, icon: r.id == 'global' ? 'bi-globe2' : null, active: region == r.id, onTap: () => pickRegion(r.id)),
          ]),
        ),
      ),
      const SizedBox(height: 12),
      if (loading)
        Wrap(spacing: 12, runSpacing: 12, children: [
          for (var i = 0; i < 8; i++) SizedBox(width: (MediaQuery.sizeOf(context).width - 44) / 2, child: const Skeleton(h: 150, r: 20)),
        ])
      else if (list.isNotEmpty)
        Column(children: [
          for (var i = 0; i < list.length; i += 2)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: IntrinsicHeight(
                child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Expanded(child: CountryTile(country: list[i], onTap: () => open(list[i]))),
                  const SizedBox(width: 12),
                  Expanded(child: i + 1 < list.length ? CountryTile(country: list[i + 1], onTap: () => open(list[i + 1])) : const SizedBox.shrink()),
                ]),
              ),
            ),
        ])
      else
        const EmptyState(icon: 'bi-globe2', title: 'No destinations in this region yet'),
    ]);
  }
}

/* ---------------- Mine ---------------- */
const _filters = ['All', 'Active', 'Not installed', 'Expired', 'Archived'];

class _MineTab extends StatefulWidget {
  final void Function(String) goto;
  const _MineTab({required this.goto});
  @override
  State<_MineTab> createState() => _MineTabState();
}

class _MineTabState extends State<_MineTab> {
  String filter = 'All';
  Timer? _tick;
  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 30), (_) { if (mounted) setState(() {}); });
  }
  @override
  void dispose() { _tick?.cancel(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    if (!s.authed) {
      return CardBox(
        child: EmptyState(
          icon: 'bi-person-lock', title: 'Sign in to see your eSIMs', message: 'Your purchased eSIMs, QR codes and data usage live in your account.', action: 'Log in',
          onAction: () => requireLogin(title: 'Log in to view your eSIMs', next: '/esim?tab=mine'),
        ),
      );
    }
    final esims = s.esims;
    final live = esims.where((e) => !e.archived).toList();
    final active = live.where((e) => computeStatus(e) == 'Active').length;
    final ready = live.where((e) => computeStatus(e) == 'Not installed').length;
    final countries = esims.map((e) => e.code).toSet().length;
    final spent = esims.fold<double>(0, (a, e) => a + e.price + e.topups.fold<double>(0, (x, t) => x + t.price));
    final shown = filter == 'All' ? live : filter == 'Archived' ? esims.where((e) => e.archived).toList() : live.where((e) => computeStatus(e) == filter).toList();

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        Expanded(child: StatTile(label: 'Active', value: '$active', icon: 'bi-sim', tone: 'success')),
        const SizedBox(width: 10),
        Expanded(child: StatTile(label: 'Ready to install', value: '$ready', icon: 'bi-qr-code', tone: 'violet')),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: StatTile(label: 'Countries', value: '$countries', icon: 'bi-globe2', tone: 'cyan')),
        const SizedBox(width: 10),
        Expanded(child: StatTile(label: 'Total spent', value: f.naira(spent), icon: 'bi-wallet2')),
      ]),
      const SizedBox(height: 20),
      Row(children: [
        const Expanded(child: AppText('My eSIMs', v: TV.h3)),
        Btn('Buy new eSIM', icon: 'bi-plus-lg', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: () => widget.goto('buy')),
      ]),
      const SizedBox(height: 10),
      Transform.translate(
        offset: const Offset(-16, 0),
        child: SizedBox(width: MediaQuery.sizeOf(context).width, child: HScroll(children: [for (final x in _filters) AppChip(x, active: filter == x, onTap: () => setState(() => filter = x))])),
      ),
      const SizedBox(height: 14),
      if (esims.isEmpty)
        CardBox(child: EmptyState(icon: 'bi-sim', tone: 'violet', title: 'No eSIMs yet', message: 'Buy a travel eSIM and stay connected the moment you land.', action: 'Find a destination', onAction: () => widget.goto('buy')))
      else if (shown.isEmpty)
        CardBox(child: EmptyState(icon: 'bi-funnel', title: 'No eSIMs here', message: 'Nothing matches this filter.', action: 'Show all', onAction: () => setState(() => filter = 'All')))
      else
        for (final e in shown) Padding(padding: const EdgeInsets.only(bottom: 14), child: EsimCard(e, key: ValueKey(e.id))),
    ]);
  }
}

/* ---------------- How it works ---------------- */
const _steps = [
  ('Pick a destination', 'Search a country or choose a regional pack for multi-country trips.', 'violet', 'bi-geo-alt'),
  ('Pay in Naira', 'Choose a plan and pay from your AutoBiz wallet. No dollar card needed.', 'primary', 'bi-wallet2'),
  ('Scan the QR code', 'Install on Wi‑Fi before you fly. It takes under 2 minutes.', 'cyan', 'bi-qr-code'),
  ('Land & connect', 'Turn on roaming for the eSIM when you arrive. Validity starts on first connection.', 'success', 'bi-airplane'),
];
const _faq = [
  ('Which phones support eSIM?', 'Most phones from 2019 onwards: iPhone XS/XR and newer, Samsung Galaxy S20 and newer, Z Fold/Flip, Google Pixel 4 and newer, and many Xiaomi, Oppo and Huawei flagships. Most Tecno, Infinix and itel models do **not** support eSIM yet. Your phone must also be **carrier-unlocked**.'),
  ('Can I keep my Nigerian SIM active?', 'Yes. eSIM works alongside your physical SIM (dual SIM). Keep your Nigerian line for calls, SMS and bank OTPs, and use the eSIM for data.'),
  ('When does my plan start?', 'Validity starts when the eSIM first connects to a supported network in your destination — not when you buy or install it. Install within 180 days of purchase.'),
  ('Can I make calls or send SMS?', 'These are data-only eSIMs. Use WhatsApp, FaceTime, Telegram or Zoom for calls and messages.'),
  ('What if I run out of data?', 'Open **My eSIMs** and tap **Top up**. New data is added instantly to the same eSIM — no new QR code needed.'),
  ('Can I reuse or transfer the QR code?', 'Each QR code can be installed only once. If you delete the eSIM from your phone, contact support for a replacement before your trip.'),
  ('Refunds', "Unused eSIMs that haven't been installed can be refunded to your wallet within 7 days of purchase."),
];

class _HowTab extends StatefulWidget {
  final void Function(String) goto;
  const _HowTab({required this.goto});
  @override
  State<_HowTab> createState() => _HowTabState();
}

class _HowTabState extends State<_HowTab> {
  int openIdx = 0;
  String device = '';
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (var i = 0; i < _steps.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: CardBox(
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              IconTile(_steps[i].$4, tone: _steps[i].$3, size: 46),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppText('0${i + 1}', v: TV.xs, weight: FontWeight.w700, muted: true),
                AppText(_steps[i].$1, weight: FontWeight.w700),
                const SizedBox(height: 2),
                AppText(_steps[i].$2, v: TV.sm, muted: true),
              ])),
            ]),
          ),
        ),
      const SizedBox(height: 10),
      const AppText('Frequently asked questions', v: TV.h3),
      const SizedBox(height: 12),
      CardBox(
        padding: EdgeInsets.zero,
        child: Column(children: [
          for (var i = 0; i < _faq.length; i++)
            InkWell(
              onTap: () => setState(() => openIdx = openIdx == i ? -1 : i),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(border: i > 0 ? Border(top: BorderSide(color: c.border)) : null),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(children: [
                    Expanded(child: AppText(_faq[i].$1, weight: FontWeight.w600)),
                    AppIcon(openIdx == i ? 'bi-chevron-up' : 'bi-chevron-down', size: 16, color: c.muted),
                  ]),
                  if (openIdx == i) Padding(padding: const EdgeInsets.only(top: 8), child: RichAppText(_faq[i].$2, v: TV.sm, muted: true)),
                ]),
              ),
            ),
        ]),
      ),
      const SizedBox(height: 12),
      CardBox(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const AppText('Is my phone compatible?', v: TV.h3),
          const AppText('Pick your model to check eSIM support', v: TV.xs, muted: true),
          const SizedBox(height: 12),
          DeviceCheck(value: device, onChanged: (v) => setState(() => device = v)),
          const SizedBox(height: 10),
          const RichAppText('Quick test: dial *#06#. If you see an **EID** number, your phone supports eSIM.', v: TV.xs, muted: true),
        ]),
      ),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.xl), gradient: LinearGradient(colors: [c.violet, c.primary], begin: Alignment.topLeft, end: Alignment.bottomRight)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const AppText('Ready to travel?', v: TV.h3, color: Colors.white),
          const SizedBox(height: 4),
          const AppText('Buy now, install at home on Wi‑Fi, and your plan only starts when you connect abroad.', v: TV.sm, color: Color(0xD9FFFFFF)),
          const SizedBox(height: 14),
          Btn('Find a plan', variant: BtnVariant.dark, iconRight: 'bi-arrow-right', onPressed: () => widget.goto('buy')),
        ]),
      ),
    ]);
  }
}
