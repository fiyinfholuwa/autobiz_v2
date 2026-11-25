import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../features/cards/card_visual.dart';
import '../../features/cards/constants.dart';
import '../../features/cards/info_panels.dart';
import '../../features/cards/sheets.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _revealSecs = 30;

/// Route: /cards (tab) — USD virtual cards. Ported from mobile_app/src/app/(tabs)/cards.tsx.
class CardsScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const CardsScreen({super.key, this.q = const {}});
  @override
  State<CardsScreen> createState() => _CardsScreenState();
}

class _CardsScreenState extends State<CardsScreen> {
  final _scroll = ScrollController();
  bool flipped = false;
  int revealLeft = 0;
  String filter = 'all';
  Timer? _tick, _createT;
  String? _lastCardId, _lastStatus;
  late int _seenReveal = CardsUI.revealRequest.value;

  @override
  void initState() {
    super.initState();
    CardsUI.selectedId.addListener(_onSelect);
    CardsUI.revealRequest.addListener(_onRevealRequest);
    _handleCreate();
  }

  @override
  void didUpdateWidget(CardsScreen old) {
    super.didUpdateWidget(old);
    if (widget.q['create'] != old.q['create']) _handleCreate();
  }

  @override
  void dispose() {
    CardsUI.selectedId.removeListener(_onSelect);
    CardsUI.revealRequest.removeListener(_onRevealRequest);
    _tick?.cancel();
    _createT?.cancel();
    _scroll.dispose();
    super.dispose();
  }

  // ?create=1 deep link
  void _handleCreate() {
    if (widget.q['create'] != '1') return;
    _createT?.cancel();
    _createT = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      context.go('/cards');
      startCreate();
    });
  }

  void _onSelect() { if (mounted) setState(() {}); }

  // reveal requested from the create flow
  void _onRevealRequest() {
    if (CardsUI.revealRequest.value == _seenReveal) return;
    _seenReveal = CardsUI.revealRequest.value;
    Future.delayed(const Duration(milliseconds: 400), () { if (mounted) _openReveal(); });
  }

  void _setReveal(int secs) {
    _tick?.cancel();
    setState(() => revealLeft = secs);
    if (secs <= 0) return;
    _tick = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      if (revealLeft <= 1) {
        t.cancel();
        toast('Card details hidden for your security', type: ToastType.info);
        setState(() => revealLeft = 0);
      } else {
        setState(() => revealLeft--);
      }
    });
  }

  Future<void> _openReveal() async {
    final ok = await showSheet<bool>(const RevealPinSheet());
    if (ok == true && mounted) _setReveal(_revealSecs);
  }

  VirtualCard? _current(List<VirtualCard> cards) {
    if (cards.isEmpty) return null;
    for (final x in cards) { if (x.id == CardsUI.selectedId.value) return x; }
    return cards.first;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final card = s.authed ? _current(s.cards) : null;

    // hide details silently on card switch / freeze / terminate
    if (card?.id != _lastCardId) {
      _lastCardId = card?.id;
      if (revealLeft > 0 || flipped) WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted) { _setReveal(0); setState(() => flipped = false); } });
    }
    if (card?.status != _lastStatus) {
      _lastStatus = card?.status;
      if (card?.status == 'frozen' && revealLeft > 0) WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted) _setReveal(0); });
    }

    final header = _Header();

    if (card == null) {
      return AppScreen(header: header, bottomInset: tabBarSpace, children: const [_EmptyHero(), SizedBox(height: 14), InfoPanels()]);
    }

    final theme = themeFor(card);
    final frozen = card.status == 'frozen';
    final spent = monthSpent(card);
    final spentPct = card.limit > 0 ? spent / card.limit : 0.0;
    final total = r2(s.cards.fold<double>(0, (a, x) => a + x.balance));
    final holder = card.name.isNotEmpty ? card.name : s.user.fullName;
    final tag = cardTag(card);
    final revealed = revealLeft > 0;
    final txns = card.txns.where((t) => filter == 'all' ? true : filter == 'purchase' ? t.kind == 'purchase' : filter == 'topup' ? t.kind != 'purchase' : t.status == 'declined').toList();

    void toggleFreeze() {
      if (frozen) {
        updateCard(card.id, (x) => x.status = 'active');
        toast('**${card.label}** unfrozen and ready to use.');
        store.notify(icon: 'bi-sun', tone: 'cyan', title: 'Card unfrozen', body: '${card.label} ($tag)');
      } else {
        updateCard(card.id, (x) => x.status = 'frozen');
        toast('**${card.label}** frozen. All payments are paused.', type: ToastType.info);
        store.notify(icon: 'bi-snow2', tone: 'cyan', title: 'Card frozen', body: '${card.label} ($tag)');
      }
    }

    Future<void> statement() async {
      await shareText('autobiz-card-${last4(card.number)}-statement.csv', statementCsv(card));
      toast('Statement downloaded');
    }

    final actions = <(String, String, String, VoidCallback, bool)>[
      ('Fund', 'bi-plus-lg', 'success', () => frozen ? toast('Unfreeze this card to fund it', type: ToastType.warning) : showSheet(FundCardSheet(card.id)), frozen),
      ('Withdraw', 'bi-arrow-down-left', 'primary', () => frozen ? toast('Unfreeze this card to withdraw', type: ToastType.warning) : showSheet(WithdrawCardSheet(card.id)), frozen || card.balance <= 0),
      (frozen ? 'Unfreeze' : 'Freeze', frozen ? 'bi-sun' : 'bi-snow2', 'cyan', toggleFreeze, false),
      ('Limit', 'bi-sliders', 'warning', () => showSheet(LimitSheet(card.id)), false),
      ('Rename', 'bi-pencil', 'violet', () => showSheet(RenameSheet(card.id)), false),
      ('Flip card', 'bi-arrow-repeat', 'orange', () => setState(() => flipped = !flipped), false),
      ('Statement', 'bi-file-earmark-text', 'pink', statement, false),
      ('Terminate', 'bi-trash', 'danger', () => showSheet(TerminateSheet(card.id, onTerminated: () { _setReveal(0); CardsUI.select(null); })), false),
    ];

    return AppScreen(
      header: header,
      bottomInset: tabBarSpace,
      padded: false,
      controller: _scroll,
      children: [
        // Summary
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText('My cards (${s.cards.length}/$maxCards)', v: TV.label, muted: true),
              AppText('Total balance ${f.usd(total)}', v: TV.h2, tabular: true),
            ])),
            StatusPill(frozen ? 'frozen' : 'active', label: frozen ? 'Frozen' : 'Active'),
          ]),
        ),

        // Selector
        HScroll(
          gap: 10,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          children: [
            for (final x in s.cards) CardThumb(card: x, selected: x.id == card.id, onTap: () => CardsUI.select(x.id)),
            if (s.cards.length < maxCards)
              Semantics(
                button: true, label: 'New card',
                child: GestureDetector(
                  onTap: startCreate,
                  child: Container(
                    width: 128, height: 80,
                    decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(14), border: Border.all(color: c.primary300, width: 1.5)),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      AppIcon('bi-plus-lg', size: 20, color: c.primary),
                      const SizedBox(height: 4),
                      AppText('New card', size: 12, weight: FontWeight.w700, color: c.primary),
                    ]),
                  ),
                ),
              ),
          ],
        ),

        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            // Card
            FlipCard(
              flipped: flipped,
              onToggle: () => setState(() => flipped = !flipped),
              face: CardFaceData(brand: card.brand, theme: theme, label: card.label, balance: card.balance, number: card.number, holder: holder, expiry: card.expiry, cvv: card.cvv, revealed: revealed, frozen: frozen),
            ),
            const SizedBox(height: 8),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              AppIcon('bi-arrow-repeat', size: 11, color: c.muted),
              const SizedBox(width: 4),
              const AppText('Tap the card to flip it', v: TV.xs, muted: true),
            ]),
            const SizedBox(height: 14),

            // Balance panel
            CardBox(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const AppText('Available balance', v: TV.xs, muted: true),
                Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Expanded(child: FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: AppText(f.usd(card.balance), v: TV.display, tabular: true))),
                  Padding(padding: const EdgeInsets.only(bottom: 6), child: AppText('≈ ${f.naira(card.balance * sellRate)}', v: TV.sm, muted: true, tabular: true)),
                ]),
                const SizedBox(height: 2),
                AppText('${brandName(card.brand)} · $tag · Created ${f.date(card.createdAt)}', v: TV.xs, muted: true),
                if (frozen) const Padding(padding: EdgeInsets.only(top: 12), child: Notice('This card is frozen. Payments, funding and withdrawals are paused until you unfreeze it.', tone: 'cyan', icon: 'bi-snow2')),
                const SizedBox(height: 14),
                Row(children: [
                  const Expanded(child: AppText('Monthly spend', v: TV.sm, weight: FontWeight.w600)),
                  AppText('${f.usd(spent)} / ${f.usd(card.limit)}', v: TV.sm, muted: true, tabular: true),
                ]),
                const SizedBox(height: 6),
                ProgressBar(spentPct, color: spentPct > 0.85 ? c.danger : c.primary),
                const SizedBox(height: 14),
                Row(children: [
                  if (!revealed) ...[Expanded(child: Btn('Reveal details', icon: 'bi-eye', variant: BtnVariant.soft, onPressed: _openReveal)), const SizedBox(width: 10)],
                  Expanded(child: Btn('Test payment', icon: 'bi-bag-check', variant: BtnVariant.outline, onPressed: () => showSheet(SimulateSheet(card.id, onSent: () {
                    setState(() => filter = 'all');
                    Future.delayed(const Duration(milliseconds: 250), () { if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 400), curve: Curves.easeOut); });
                  })))),
                ]),
              ]),
            ),

            // Revealed details
            if (revealed) ...[
              const SizedBox(height: 14),
              CardBox(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(children: [
                    const Expanded(child: AppText('Card details', v: TV.h3)),
                    AppText('Hides in ${revealLeft}s', v: TV.xs, muted: true),
                    const SizedBox(width: 8),
                    Btn('Hide', size: BtnSize.sm, variant: BtnVariant.outline, onPressed: () => _setReveal(0)),
                  ]),
                  const SizedBox(height: 10),
                  ProgressBar(revealLeft / _revealSecs, height: 4),
                  const SizedBox(height: 6),
                  for (final (i, row) in [
                    ('Card number', groupNumber(card.number), card.number, 'Card number copied'),
                    ('Expiry', card.expiry, card.expiry, 'Expiry date copied'),
                    ('CVV', card.cvv, card.cvv, 'CVV copied'),
                    ('Name on card', holder.toUpperCase(), holder.toUpperCase(), 'Name copied'),
                  ].indexed)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(border: i > 0 ? Border(top: BorderSide(color: c.border)) : null),
                      child: Row(children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          AppText(row.$1, v: TV.xs, muted: true),
                          AppText(row.$2, weight: FontWeight.w700, tabular: true, selectable: true),
                        ])),
                        IconBtn('bi-copy', size: 34, bg: c.surface2, tooltip: 'Copy ${row.$1}', onPressed: () => copyText(row.$3, row.$4)),
                      ]),
                    ),
                ]),
              ),
            ],
            const SizedBox(height: 14),

            // Actions
            CardBox(
              child: LayoutBuilder(builder: (context, cons) {
                final w = cons.maxWidth / 4;
                return Wrap(runSpacing: 16, children: [
                  for (final a in actions)
                    SizedBox(
                      width: w,
                      child: Semantics(
                        button: true, label: a.$1,
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () { tapHaptic(); a.$4(); },
                          child: Opacity(
                            opacity: a.$5 ? 0.4 : 1,
                            child: Column(children: [
                              IconTile(a.$2, tone: a.$3, size: 46),
                              const SizedBox(height: 6),
                              AppText(a.$1, size: 11, weight: FontWeight.w600, center: true, maxLines: 1),
                            ]),
                          ),
                        ),
                      ),
                    ),
                ]);
              }),
            ),
            const SizedBox(height: 14),

            // Transactions
            CardBox(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const AppText('Card transactions', v: TV.h3),
                const SizedBox(height: 2),
                AppText('${card.label} · $tag', v: TV.xs, muted: true),
                const SizedBox(height: 12),
                Segment<String>(
                  small: true,
                  value: filter,
                  onChanged: (v) => setState(() => filter = v),
                  options: const [SegOption('all', 'All'), SegOption('purchase', 'Payments'), SegOption('topup', 'Top-ups'), SegOption('declined', 'Declined')],
                ),
                const SizedBox(height: 6),
                if (txns.isEmpty)
                  const EmptyState(icon: 'bi-receipt', title: 'No transactions here', message: 'Payments made with this card will show up here.')
                else
                  for (final (i, t) in txns.indexed) _CardTxRow(t: t, first: i == 0),
              ]),
            ),
            const SizedBox(height: 14),
            const InfoPanels(),
          ]),
        ),
      ],
    );
  }
}

class _Header extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      color: c.bg,
      padding: EdgeInsets.fromLTRB(16, MediaQuery.paddingOf(context).top + 8, 16, 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AppText('Virtual Cards', v: TV.h1),
            SizedBox(height: 2),
            AppText('USD cards for Netflix, Spotify, AWS, AliExpress, Apple & any online merchant.', v: TV.xs, muted: true),
          ])),
          const SizedBox(width: 10),
          Btn('New card', icon: 'bi-plus-lg', size: BtnSize.sm, onPressed: startCreate),
        ]),
        const SizedBox(height: 10),
        const Pill('\$1 = ₦1,580', icon: 'bi-arrow-left-right'),
      ]),
    );
  }
}

class _CardTxRow extends StatelessWidget {
  final CardTx t;
  final bool first;
  const _CardTxRow({required this.t, required this.first});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final m = t.merchant != null ? merchants[t.merchant] : null;
    final muted = t.status == 'declined' || t.status == 'reversed';
    final Widget left = t.kind == 'purchase'
        ? (m != null ? BrandTile(color: m.bg, fg: m.fg, icon: m.icon, size: 40) : const IconTile('bi-globe', tone: 'neutral', size: 40))
        : IconTile(t.direction == 'in' ? 'bi-arrow-down-left' : 'bi-arrow-up-right', tone: t.direction == 'in' ? 'success' : 'primary', size: 40);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 11),
      decoration: BoxDecoration(border: first ? null : Border(top: BorderSide(color: c.border))),
      child: Row(children: [
        left,
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          AppText(t.title.isNotEmpty ? t.title : (m?.name ?? 'Online payment'), weight: FontWeight.w600, maxLines: 1),
          AppText('${t.note.isNotEmpty ? t.note : (m?.cat ?? '')} · ${f.ago(t.date)}', v: TV.xs, muted: true, maxLines: 1),
        ])),
        const SizedBox(width: 10),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          AppText('${t.direction == 'in' ? '+' : '−'}${f.usd(t.amount)}', weight: FontWeight.w700, tabular: true, strike: muted, color: muted ? c.muted : t.direction == 'in' ? c.success : c.text),
          const SizedBox(height: 4),
          t.status == 'pending' ? const StatusPill('pending', label: 'Pending…') : StatusPill(t.status),
        ]),
      ]),
    );
  }
}

class _EmptyHero extends StatelessWidget {
  const _EmptyHero();
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    const steps = [
      ('bi-palette', 'violet', 'Design it', 'Pick Visa or Mastercard and a card design you love.'),
      ('bi-wallet2', 'primary', 'Fund in Naira', 'Top up from your wallet at ₦1,580/\$1.'),
      ('bi-bag-check', 'success', 'Pay anywhere', 'Use it on Netflix, AWS, AliExpress, Apple & more.'),
    ];
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Container(
        padding: const EdgeInsets.all(20),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.xxl), gradient: const LinearGradient(colors: [Color(0xFF1E2A78), Color(0xFF0B1230)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          LayoutBuilder(builder: (context, cons) {
            final w = cons.maxWidth * 0.86;
            return SizedBox(
              height: w / 1.586 + 30,
              child: Stack(children: [
                Positioned(
                  top: 0, right: 0, width: w,
                  child: Opacity(opacity: 0.9, child: Transform.rotate(angle: 6 * 3.14159 / 180, child: StaticCard(CardFaceData(brand: 'mastercard', theme: themes[1], label: 'Subscriptions', balance: 49.99, number: '5399000000001234', holder: 'AutoBiz User')))),
                ),
                Positioned(
                  top: 22, left: 0, width: w,
                  child: Transform.rotate(angle: -4 * 3.14159 / 180, child: StaticCard(CardFaceData(brand: 'visa', theme: themes[0], label: 'Shopping', balance: 250, number: '4539580000004821', holder: 'AutoBiz User'))),
                ),
              ]),
            );
          }),
          const SizedBox(height: 14),
          const Pill('Ready in 30 seconds', icon: 'bi-lightning-charge-fill', tone: 'success', solid: true),
          const SizedBox(height: 10),
          const AppText('Get your USD virtual card', v: TV.h1, color: Colors.white),
          const SizedBox(height: 6),
          AppText('Pay for subscriptions, ads, cloud services and shopping worldwide — fund it straight from your Naira wallet.', v: TV.sm, color: Colors.white.withValues(alpha: 0.8)),
          const SizedBox(height: 14),
          for (final p in const ['Visa or Mastercard, 6 beautiful designs', 'Freeze, set limits & withdraw anytime', 'Only \$2 to create · 1% funding fee'])
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(children: [
                const AppIcon('bi-check-circle-fill', size: 16, color: Color(0xFF63E6BE)),
                const SizedBox(width: 8),
                Expanded(child: AppText(p, v: TV.sm, color: Colors.white)),
              ]),
            ),
          const SizedBox(height: 10),
          const Btn('Create my card', icon: 'bi-credit-card-2-front', size: BtnSize.lg, full: true, onPressed: startCreate),
        ]),
      ),
      const SizedBox(height: 14),
      CardBox(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const AppText('How it works', v: TV.h3),
          const SizedBox(height: 6),
          for (final (i, st) in steps.indexed)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(border: i > 0 ? Border(top: BorderSide(color: c.border)) : null),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                IconTile(st.$1, tone: st.$2, size: 40),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  AppText('${i + 1}. ${st.$3}', weight: FontWeight.w700),
                  AppText(st.$4, v: TV.sm, muted: true),
                ])),
              ]),
            ),
        ]),
      ),
    ]);
  }
}
