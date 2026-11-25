import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../core/validators.dart';
import '../../data/catalog.dart';
import '../../features/giftcards/components.dart';
import '../../features/giftcards/logic.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /giftcards  (q: tab=sell|buy|rates|trades, card, country, type, face, step, brand)
class GiftcardsScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const GiftcardsScreen({super.key, this.q = const {}});
  @override
  State<GiftcardsScreen> createState() => _GiftcardsScreenState();
}

const _tabs = ['sell', 'buy', 'rates', 'trades'];

class _Img { final String path, name; final int kb; const _Img(this.path, this.name, this.kb); }

class _Sell {
  int step = 1;
  String? card, country, type;
  String face = '';
  int qty = 1;
  List<_Img> images = [];
  List<String> codes = [''];
  String note = '', q = '';
  bool agree = false;
}

GiftCardBrand? _gc(String? id) => id == null ? null : giftcardById(id);

class _GiftcardsScreenState extends State<GiftcardsScreen> {
  String tab = 'sell';
  _Sell sell = _Sell();
  String? buyBrand;
  double? buyFace;
  int buyKey = 0;
  final _scroll = ScrollController();
  final loadAt = f.now() - 3 * 60000;
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _applyParams(widget.q);
    _tick = Timer.periodic(const Duration(seconds: 30), (_) { if (mounted) setState(() {}); });
  }

  @override
  void didUpdateWidget(GiftcardsScreen old) {
    super.didUpdateWidget(old);
    if (widget.q.toString() != old.q.toString()) setState(() => _applyParams(widget.q));
  }

  @override
  void dispose() { _tick?.cancel(); _scroll.dispose(); super.dispose(); }

  void _applyParams(Map<String, String> q) {
    if (_tabs.contains(q['tab'])) tab = q['tab']!;
    if (q['card'] != null && _gc(q['card']) != null) {
      _openSell(q['card']!, country: q['country'], type: q['type'], face: q['face'], step: int.tryParse(q['step'] ?? '') ?? 2, scroll: false);
    }
    if (q['brand'] != null) {
      buyBrand = q['brand'];
      buyFace = double.tryParse(q['face'] ?? '');
      buyKey++;
      tab = 'buy';
    }
  }

  void goto(String t) {
    setState(() => tab = t);
    if (_scroll.hasClients) _scroll.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
  }

  void _openSell(String cardId, {String? country, String? type, String? face, int step = 2, bool scroll = true}) {
    final card = _gc(cardId);
    if (card == null) return;
    final types = card.types.keys.toList();
    sell = _Sell()
      ..card = cardId
      ..country = country ?? card.countries.first
      ..type = type ?? (types.length == 1 ? types.first : null)
      ..face = face ?? ''
      ..step = step;
    if (scroll) { goto('sell'); } else { tab = 'sell'; }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    final c = context.c;
    final trades = s.trades;
    final earned = trades.where((t) => t.side == 'sell' && t.status == 'Completed').fold<double>(0, (a, t) => a + t.naira);
    return AppScreen(
      controller: _scroll,
      header: const AppHeader(title: 'Gift Card Exchange', subtitle: 'Sell cards for Naira · buy e-gift cards'),
      children: [
        Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.xl), gradient: const LinearGradient(colors: [Color(0xFFE64980), Color(0xFF7048E8)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
          child: Stack(children: [
            const Positioned(right: -24, bottom: -30, child: Opacity(opacity: 0.14, child: AppIcon('bi-gift', size: 160, color: Colors.white))),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Pill('Rates updated ${f.ago(loadAt)}', icon: 'bi-graph-up', tone: 'success', solid: true),
                const SizedBox(height: 10),
                const AppText('Trade gift cards at top rates', v: TV.h2, color: Colors.white),
                const SizedBox(height: 4),
                const AppText('Sell Apple, Steam, Amazon & 9 more cards for Naira — or buy digital gift cards delivered instantly to your email.', v: TV.sm, color: Color(0xD9FFFFFF)),
                const SizedBox(height: 16),
                Row(children: [
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const AppText('Top rate today', v: TV.xs, color: Color(0xBFFFFFFF)),
                    AppText('₦${rateStr(topRate())}/\$', v: TV.h2, color: Colors.white),
                  ]),
                  if (s.authed) ...[
                    const SizedBox(width: 24),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const AppText("You've earned", v: TV.xs, color: Color(0xBFFFFFFF)),
                      AppText(f.naira(earned), v: TV.h2, color: Colors.white),
                    ]),
                  ],
                ]),
                const SizedBox(height: 14),
                Wrap(spacing: 12, runSpacing: 6, children: [
                  for (final (i, t) in const [('bi-clock', 'Paid in 5–15 min'), ('bi-graph-up', 'Best rates'), ('bi-headset', '24/7 support'), ('bi-shield-check', 'Bank-grade security')])
                    Row(mainAxisSize: MainAxisSize.min, children: [AppIcon(i, size: 13, color: Colors.white), const SizedBox(width: 5), AppText(t, v: TV.xs, color: Colors.white)]),
                ]),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 16),
        Segment<String>(value: tab, onChanged: goto, small: true, options: [
          const SegOption('sell', 'Sell'), const SegOption('buy', 'Buy'), const SegOption('rates', 'Rates'),
          SegOption('trades', 'My trades', badge: s.authed && trades.isNotEmpty ? trades.length : null),
        ]),
        const SizedBox(height: 16),
        if (tab == 'sell')
          _SellTab(s: sell, onChanged: () => setState(() {}), onReset: () => setState(() => sell = _Sell()), onDone: () => goto('trades'))
        else if (tab == 'buy')
          _BuyTab(key: ValueKey('buy$buyKey'), presetBrand: buyBrand, presetFace: buyFace)
        else if (tab == 'rates')
          _RatesTab(onSell: (id, co, ty, face) => setState(() => _openSell(id, country: co, type: ty, face: face, step: 3)))
        else
          _TradesTab(onSell: () { setState(() => sell = _Sell()); goto('sell'); }),
        const SizedBox(height: 8),
        if (tab == 'sell') ...[
          const SizedBox(height: 8),
          CardBox(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const AppText('How it works', v: TV.h3),
            const SizedBox(height: 10),
            for (final (n, t, d) in const [('1', 'Pick your card', 'Brand, country and card type'), ('2', 'Upload or paste code', 'Clear photos or the e-code'), ('3', 'Get paid in Naira', 'Credited to your wallet in minutes')])
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(children: [
                  Container(width: 28, height: 28, decoration: BoxDecoration(color: c.pinkSoft, shape: BoxShape.circle), child: Center(child: AppText(n, v: TV.sm, weight: FontWeight.w700, color: c.pink))),
                  const SizedBox(width: 12),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [AppText(t, weight: FontWeight.w600), AppText(d, v: TV.xs, muted: true)]),
                ]),
              ),
          ])),
        ],
      ],
    );
  }
}

/* ====================================================================== SELL */
const _stepLabels = ['Card', 'Type', 'Amount', 'Proof', 'Review'];

class _SellTab extends StatefulWidget {
  final _Sell s;
  final VoidCallback onChanged, onReset, onDone;
  const _SellTab({required this.s, required this.onChanged, required this.onReset, required this.onDone});
  @override
  State<_SellTab> createState() => _SellTabState();
}

class _SellTabState extends State<_SellTab> {
  Map<String, String?> err = {};
  _Sell get s => widget.s;
  void set(void Function() fn) { fn(); widget.onChanged(); setState(() {}); }

  double get faceN => double.tryParse(s.face) ?? 0;
  double get usdTotal => faceN * s.qty;
  bool get isCode => s.type == 'E-code';

  void pickCard(GiftCardBrand g) {
    final types = g.types.keys.toList();
    set(() {
      if (g.id != s.card) {
        s.card = g.id; s.country = g.countries.first; s.type = types.length == 1 ? types.first : null;
        s.face = ''; s.qty = 1; s.codes = ['']; s.images = [];
      }
      s.step = 2;
    });
    err = {};
  }

  bool validate(int step) {
    final e = <String, String?>{};
    final card = _gc(s.card);
    if (step == 1 && card == null) { e['card'] = 'Select a gift card to continue'; toast(e['card']!, type: ToastType.warning); }
    if (step == 2 && s.type == null) e['type'] = 'Choose a card type';
    if (step == 3 && card != null) {
      final min = card.range[0], max = card.range[1];
      if (s.face.isEmpty) { e['face'] = 'Enter the card value'; }
      else if (faceN < min) { e['face'] = 'Minimum is \$${dollars(min)} per card'; }
      else if (faceN > max) { e['face'] = 'Maximum is \$${dollars(max)} per card'; }
      else if (faceN != faceN.roundToDouble()) { e['face'] = 'Enter a whole dollar amount'; }
    }
    if (step == 4) {
      if (isCode) {
        final seen = <String>{};
        for (var i = 0; i < s.codes.length; i++) {
          final code = s.codes[i];
          final cl = cleanCode(code).toUpperCase();
          if (cl.length < 10 || !RegExp(r'^[A-Za-z0-9\- ]+$').hasMatch(code)) { e['code$i'] = 'Enter a valid code (at least 10 letters/numbers)'; }
          else if (seen.contains(cl)) { e['code$i'] = 'This code is duplicated'; }
          seen.add(cl);
        }
      } else if (s.images.isEmpty) {
        e['images'] = 'Add at least one photo of your card';
      }
    }
    if (step == 5 && !s.agree) e['agree'] = 'Please confirm to continue';
    setState(() => err = e);
    return !e.values.any((x) => x != null);
  }

  void next() {
    if (!validate(s.step)) return;
    if (s.step == 4 && isCode) s.codes = s.codes.map((x) => x.toUpperCase()).toList();
    if (s.step < 5) { set(() => s.step++); } else { submit(); }
  }

  Future<void> submit() async {
    final card = _gc(s.card);
    if (card == null || s.country == null || s.type == null) return;
    final q = quote(card, s.country!, s.type!, usdTotal);
    final ok = await confirmPay(PayOpts(
      title: 'Confirm trade', amount: q.naira, amountLabel: "You'll receive", skipBalanceCheck: true, cta: 'Submit trade',
      rows: [SRow('Card', '${card.name} · ${s.country}'), SRow('Type', s.type!), SRow('Value', '${s.qty} × \$${dollars(faceN)}'), SRow('Rate', '₦${rateStr(q.rate)}/\$')],
      note: 'Your wallet is credited automatically once the card is verified (usually 5–15 min).',
    ));
    if (!ok) return;
    final now = f.now();
    final codes = isCode ? s.codes.map((x) => x.toUpperCase().trim()).toList() : <String>[];
    final t = Trade(
      id: f.ref('GC'), side: 'sell', card: card.id, cardName: card.name, country: s.country!, type: s.type!, face: faceN, qty: s.qty, usd: usdTotal,
      rate: q.rate, bonus: q.bonus, naira: q.naira, status: 'Pending', images: isCode ? 0 : s.images.length, codes: codes.map(maskCode).toList(), note: s.note.trim(),
      createdAt: now, timeline: [TradeEvent('Pending', now)], credited: false,
      failReason: isCode && codes.any((x) => RegExp(r'^USED', caseSensitive: false).hasMatch(x)) ? 'This code has already been redeemed. Please contact the card issuer or your seller.' : null,
    );
    store.mutate(() => store.trades = [t, ...store.trades]);
    store.notify(icon: 'bi-gift', tone: 'pink', title: 'Trade submitted', body: '${card.name} \$${dollars(usdTotal)} is being reviewed. Expected payout ${f.naira(q.naira)}.');
    widget.onReset();
    if (!mounted) return;
    final router = GoRouter.of(context);
    success(SuccessOpts(
      title: 'Trade submitted',
      message: "We're verifying your ${card.name} card. You'll be paid **${f.naira(q.naira)}** once it's confirmed.",
      rows: [SRow('Trade ID', t.id), SRow('Card', '${card.name} · ${t.type}'), SRow('Value', f.usd(usdTotal)), const SRow('Status', 'Pending')],
      actions: [SuccessAction('Track trade', () { widget.onDone(); Future.delayed(const Duration(milliseconds: 350), () => router.push('/giftcards/trade/${Uri.encodeComponent(t.id)}')); }, icon: 'bi-activity')],
    ));
  }

  Future<void> pickImages(bool camera) async {
    final left = 5 - s.images.length;
    if (left <= 0) { toast('You can upload a maximum of 5 images', type: ToastType.warning); return; }
    final picker = ImagePicker();
    List<XFile> files;
    try {
      if (camera) {
        final x = await picker.pickImage(source: ImageSource.camera, imageQuality: 70);
        files = x == null ? [] : [x];
      } else if (left == 1) {
        final x = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
        files = x == null ? [] : [x];
      } else {
        files = await picker.pickMultiImage(imageQuality: 70, limit: left);
      }
    } catch (_) {
      toast(camera ? 'Camera permission is needed to snap your card' : 'Photo access is needed to upload your card', type: ToastType.warning);
      return;
    }
    if (files.isEmpty) return;
    final add = <_Img>[];
    for (final a in files) {
      final name = a.name.isNotEmpty ? a.name : 'card-${f.now()}.jpg';
      if (!RegExp(r'\.(png|jpe?g|webp|gif|heic|heif)$', caseSensitive: false).hasMatch(name) && a.mimeType != null && !RegExp(r'image/(png|jpe?g|webp|gif|heic|heif)', caseSensitive: false).hasMatch(a.mimeType!)) {
        toast("**$name** isn't a supported image (JPG, PNG, WEBP)", type: ToastType.error);
        continue;
      }
      final size = await File(a.path).length();
      if (size > 5 * 1024 * 1024) { toast('**$name** is larger than 5MB', type: ToastType.error); continue; }
      add.add(_Img(a.path, name, (size / 1024).round()));
    }
    if (s.images.length + add.length > 5) toast('You can upload a maximum of 5 images', type: ToastType.warning);
    if (!mounted) return;
    set(() => s.images = [...s.images, ...add].take(5).toList());
    err['images'] = null;
  }

  Widget _err(String? e) => e == null ? const SizedBox.shrink() : Padding(padding: const EdgeInsets.only(top: 8), child: AppText(e, v: TV.xs, color: context.c.danger));

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final card = _gc(s.card);
    final q = card != null && s.country != null && s.type != null ? quote(card, s.country!, s.type!, usdTotal) : null;
    final w = MediaQuery.sizeOf(context).width;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      // stepper
      Row(children: [
        for (var i = 0; i < _stepLabels.length; i++)
          Expanded(child: Builder(builder: (_) {
            final n = i + 1, done = n < s.step, cur = n == s.step;
            return GestureDetector(
              onTap: done ? () => set(() => s.step = n) : null,
              child: Semantics(
                label: 'Step $n ${_stepLabels[i]}',
                child: Column(children: [
                  Container(
                    width: 28, height: 28,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: done ? c.success : cur ? c.primary : c.surface2),
                    child: Center(child: done ? const AppIcon('bi-check-lg', size: 15, color: Colors.white) : AppText('$n', size: 12, weight: FontWeight.w700, color: cur ? Colors.white : c.muted)),
                  ),
                  const SizedBox(height: 4),
                  AppText(_stepLabels[i], size: 10, weight: cur ? FontWeight.w700 : FontWeight.w500, color: cur ? c.text : c.muted),
                ]),
              ),
            );
          })),
      ]),
      const SizedBox(height: 16),

      if (s.step == 1) ...[
        const AppText('Which card are you selling?', v: TV.h3),
        AppText('${giftcards.length} cards accepted · best rates in Nigeria', v: TV.xs, muted: true),
        const SizedBox(height: 12),
        AppTextField(icon: 'bi-search', placeholder: 'Search gift cards', value: s.q, onChanged: (v) => set(() => s.q = v)),
        const SizedBox(height: 12),
        Builder(builder: (_) {
          final qq = s.q.trim().toLowerCase();
          final list = giftcards.where((g) => qq.isEmpty || g.name.toLowerCase().contains(qq) || g.countries.any((co) => co.toLowerCase().contains(qq))).toList();
          if (list.isEmpty) return EmptyState(icon: 'bi-search', title: 'No cards match “${s.q}”', action: 'Clear search', onAction: () => set(() => s.q = ''));
          return Wrap(spacing: 10, runSpacing: 10, children: [
            for (final g in list)
              SizedBox(
                width: (w - 52) / 3,
                child: OptionCard(
                  selected: s.card == g.id,
                  onTap: () => pickCard(g),
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
                  child: Stack(children: [
                    Column(children: [
                      Center(child: CardTile(g.id, size: 46)),
                      const SizedBox(height: 8),
                      AppText(g.name, v: TV.xs, weight: FontWeight.w700, center: true, maxLines: 1),
                      AppText('Up to ₦${rateStr(maxRate(g))}/\$', size: 10, muted: true, center: true),
                    ]),
                    if (g.hot) Positioned(top: 0, left: 0, child: AppIcon('bi-fire', size: 14, color: c.orange)),
                  ]),
                ),
              ),
          ]);
        }),
        _err(err['card']),
      ],

      if (s.step == 2 && card != null) ...[
        Row(children: [
          CardTile(card.id, size: 48),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AppText(card.name, v: TV.h3),
            AppText('Accepted \$${dollars(card.range[0])} – \$${dollars(card.range[1])} per card', v: TV.xs, muted: true),
          ]),
        ]),
        const SizedBox(height: 14),
        const AppText('Card country / currency', weight: FontWeight.w600),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final co in card.countries)
            OptionCard(
              selected: s.country == co,
              onTap: () => set(() => s.country = co),
              padding: const EdgeInsets.fromLTRB(12, 10, 30, 10),
              child: Row(mainAxisSize: MainAxisSize.min, children: [CountryFlag(co, size: 22), const SizedBox(width: 8), AppText(co, weight: FontWeight.w600)]),
            ),
        ]),
        const SizedBox(height: 16),
        const AppText('Card type', weight: FontWeight.w600),
        const SizedBox(height: 8),
        for (final t in card.types.keys)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OptionCard(
              selected: s.type == t,
              onTap: () { set(() => s.type = t); err = {}; },
              child: Row(children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: t == 'E-code' ? c.violetSoft : c.pinkSoft),
                  child: Center(child: AppIcon(typeInfo(t).$1, size: 20, color: t == 'E-code' ? c.violet : c.pink)),
                ),
                const SizedBox(width: 12),
                Expanded(child: Padding(
                  padding: const EdgeInsets.only(right: 20),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [AppText(t, weight: FontWeight.w700), AppText(typeInfo(t).$2, v: TV.xs, muted: true)]),
                )),
                AppText('₦${rateStr(rateFor(card, s.country!, t))}/\$', weight: FontWeight.w700, color: c.primary),
              ]),
            ),
          ),
        _err(err['type']),
      ],

      if (s.step == 3 && card != null && q != null) ...[
        const AppText('How much is the card worth?', v: TV.h3),
        AppText('${card.name} · ${s.country} · ${s.type} — accepted \$${dollars(card.range[0])}–\$${dollars(card.range[1])} per card', v: TV.xs, muted: true),
        const SizedBox(height: 12),
        AppTextField(
          label: 'Value per card (USD)', prefix: '\$', big: true, keyboardType: const TextInputType.numberWithOptions(decimal: true), value: s.face, placeholder: '0', error: err['face'],
          inputFormatters: [AppTextField.decimal],
          onChanged: (v) { set(() => s.face = v); err = {}; },
        ),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final v in [10, 25, 50, 100, 200, 500, 1000].where((v) => v >= card.range[0] && v <= card.range[1]))
            AppChip('\$$v', active: faceN == v, onTap: () { set(() => s.face = '$v'); err = {}; }),
        ]),
        const SizedBox(height: 16),
        Row(children: [
          const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AppText('Number of cards', weight: FontWeight.w600),
            AppText('Same value & type, up to 10', v: TV.xs, muted: true),
          ])),
          QtyStepper(value: s.qty, min: 1, max: 10, onChanged: (v) => set(() {
            final n = v.clamp(1, 10);
            s.qty = n;
            s.codes = List.generate(n, (i) => i < s.codes.length ? s.codes[i] : '');
          })),
        ]),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.lg), gradient: LinearGradient(colors: [c.primary700, const Color(0xFF0F3F3A)])),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const AppText("You'll receive", v: TV.label, color: Color(0xB3FFFFFF)),
                AppText(f.naira(q.naira), v: TV.h1, color: Colors.white, tabular: true),
              ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                const AppText('Rate', v: TV.label, color: Color(0xB3FFFFFF)),
                AppText('₦${rateStr(q.rate)}/\$', v: TV.h3, color: Colors.white),
              ]),
            ]),
            const SizedBox(height: 8),
            RichAppText('${s.qty} × \$${dollars(faceN)} = **\$${dollars(usdTotal)}** × ₦${rateStr(q.base)}${q.bonus > 0 ? ' + ₦${dollars(bonusRate)} bonus' : ''}', v: TV.xs, color: const Color(0xCCFFFFFF)),
            const SizedBox(height: 8),
            if (q.bonus > 0)
              Pill('Bonus unlocked · +${f.naira(usdTotal * bonusRate)}', tone: 'success', solid: true, icon: 'bi-stars')
            else if (usdTotal > 0)
              RichAppText('Add **\$${dollars(bonusMin - usdTotal)}** more to earn **+₦${dollars(bonusRate)}/\$** bonus', v: TV.xs, color: const Color(0xFFA9F5DC))
            else
              AppText('Trades of \$${dollars(bonusMin)}+ earn a +₦${dollars(bonusRate)}/\$ bonus', v: TV.xs, color: const Color(0xFFA9F5DC)),
          ]),
        ),
      ],

      if (s.step == 4 && card != null) ...[
        if (isCode) ...[
          const AppText('Enter your e-code(s)', v: TV.h3),
          const AppText('Copy the code exactly as it appears in your email or app.', v: TV.xs, muted: true),
          const SizedBox(height: 12),
          for (var i = 0; i < s.codes.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: AppTextField(
                key: ValueKey('code$i'),
                label: 'Card ${s.qty > 1 ? '${i + 1} ' : ''}code (\$${dollars(faceN)})', placeholder: 'e.g. XXXX-XXXX-XXXX-XXXX',
                textCapitalization: TextCapitalization.characters, autocorrect: false, value: s.codes[i], error: err['code$i'],
                onChanged: (v) { s.codes[i] = v.toUpperCase(); widget.onChanged(); setState(() => err['code$i'] = null); },
              ),
            ),
          const RichAppText('Demo: codes starting with **USED** are declined so you can see a failed trade.', v: TV.xs, muted: true),
        ] else ...[
          const AppText('Upload card photos', v: TV.h3),
          const AppText('Clear photos of the full card with the scratched PIN visible. JPG, PNG or WEBP · max 5MB each · up to 5 images.', v: TV.xs, muted: true),
          const SizedBox(height: 12),
          InkWell(
            onTap: () => pickImages(false),
            borderRadius: BorderRadius.circular(R.lg),
            child: Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.lg), border: Border.all(color: err['images'] != null ? c.danger : c.primary300, width: 1.5), color: c.primarySoft),
              child: Column(children: [
                AppIcon('bi-cloud-upload', size: 30, color: c.primary),
                const SizedBox(height: 6),
                const AppText('Choose from gallery', weight: FontWeight.w700),
                AppText('${s.images.length}/5 added', v: TV.xs, muted: true),
              ]),
            ),
          ),
          const SizedBox(height: 10),
          Btn('Take a photo', icon: 'bi-camera', variant: BtnVariant.outline, onPressed: () => pickImages(true)),
          _err(err['images']),
          if (s.images.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(spacing: 10, runSpacing: 10, children: [
              for (var i = 0; i < s.images.length; i++)
                SizedBox(
                  width: 96,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Stack(children: [
                      ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(File(s.images[i].path), width: 96, height: 96, fit: BoxFit.cover)),
                      Positioned(top: 4, right: 4, child: IconBtn('bi-x-lg', size: 26, bg: const Color(0x99000000), color: Colors.white, tooltip: 'Remove image', onPressed: () => set(() => s.images = [...s.images]..removeAt(i)))),
                    ]),
                    AppText('${s.images[i].name}${s.images[i].kb > 0 ? ' · ${s.images[i].kb}KB' : ''}', size: 10, muted: true, maxLines: 1),
                  ]),
                ),
            ]),
          ],
        ],
        const SizedBox(height: 16),
        AppTextField(label: 'Note for our team (optional)', multiline: true, maxLength: 240, placeholder: 'e.g. Card bought at Walmart, receipt attached', value: s.note, onChanged: (v) { s.note = v; widget.onChanged(); }),
      ],

      if (s.step == 5 && card != null && q != null) ...[
        const AppText('Review your trade', v: TV.h3),
        const AppText('Please confirm the details. Incorrect information may delay payment.', v: TV.xs, muted: true),
        const SizedBox(height: 12),
        CardBox(child: Row(children: [
          CardTile(card.id, size: 44),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [AppText(card.name, weight: FontWeight.w700), AppText('${s.country} · ${s.type}', v: TV.xs, muted: true)])),
          Btn('Change', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: () => set(() => s.step = 1)),
        ])),
        const SizedBox(height: 12),
        Summary([
          SRow('Card value', '${s.qty} × \$${dollars(faceN)} = \$${dollars(usdTotal)}'),
          SRow('Rate', Text.rich(TextSpan(style: tvStyle(context, TV.sm, weight: FontWeight.w600), children: [
            TextSpan(text: '₦${rateStr(q.base)}/\$'),
            if (q.bonus > 0) TextSpan(text: ' +₦${dollars(bonusRate)} bonus', style: TextStyle(color: c.success, fontWeight: FontWeight.w700)),
          ]))),
          isCode ? SRow('E-codes', s.codes.map((x) => maskCode(x.toUpperCase())).join('\n')) : SRow('Photos', '${s.images.length} image${s.images.length == 1 ? '' : 's'}'),
          if (s.note.trim().isNotEmpty) SRow('Note', s.note.trim()),
        ], total: ("You'll receive", AppText(f.naira(q.naira), v: TV.h2, color: c.success))),
        const SizedBox(height: 14),
        AppCheckbox(checked: s.agree, error: err['agree'], label: "I confirm this card was obtained legitimately and hasn't been used or shared.", onChanged: (v) { set(() => s.agree = v); err = {}; }),
      ],

      // trade summary
      if (card != null && s.step > 1 && s.step < 5) ...[
        const SizedBox(height: 16),
        CardBox(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const AppText('Trade summary', v: TV.label, muted: true),
          const SizedBox(height: 8),
          Row(children: [
            CardTile(card.id, size: 36),
            const SizedBox(width: 10),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [AppText(card.name, weight: FontWeight.w700), AppText('${s.country ?? '—'} · ${s.type ?? 'Select type'}', v: TV.xs, muted: true)]),
          ]),
          const SizedBox(height: 10),
          Summary([
            SRow('Card value', faceN > 0 ? '${s.qty} × \$${dollars(faceN)}' : '—'),
            SRow('Rate', q != null && s.type != null ? '₦${rateStr(q.base)}/\$' : '—'),
            if (q != null && q.bonus > 0) SRow('Bonus', '+₦${dollars(bonusRate)}/\$'),
          ], total: ("You'll receive", AppText(f.naira(q != null && faceN > 0 ? q.naira : 0), v: TV.h3, color: c.success))),
        ])),
      ],

      const SizedBox(height: 16),
      Row(children: [
        if (s.step > 1) ...[
          Expanded(child: Btn('Back', variant: BtnVariant.outline, icon: 'bi-arrow-left', onPressed: () { err = {}; set(() => s.step--); })),
          const SizedBox(width: 10),
        ],
        if (s.step > 1 || card != null)
          Expanded(flex: 2, child: Btn(s.step == 5 ? 'Submit trade' : 'Continue', icon: s.step == 5 ? 'bi-send' : null, iconRight: s.step < 5 ? 'bi-arrow-right' : null, onPressed: next)),
      ]),
    ]);
  }
}

/* ====================================================================== BUY */
const _buyFaces = [10.0, 25.0, 50.0, 100.0, 200.0];

class _BuyTab extends StatefulWidget {
  final String? presetBrand;
  final double? presetFace;
  const _BuyTab({super.key, this.presetBrand, this.presetFace});
  @override
  State<_BuyTab> createState() => _BuyTabState();
}

class _BuyTabState extends State<_BuyTab> {
  late String b = widget.presetBrand != null && buyIds.contains(widget.presetBrand) ? widget.presetBrand! : 'amazon';
  late double face = widget.presetFace != null && _buyFaces.contains(widget.presetFace) ? widget.presetFace! : 25;
  int qty = 1;
  late String email = store.user.email;
  String? emailErr;

  Future<void> buy() async {
    final br = brand(b);
    final base = face * qty * buyRate;
    final fee = (base * 0.01).round().toDouble() < 150 ? 150.0 : (base * 0.01).roundToDouble();
    final total = base + fee;
    if (!isEmail(email)) { setState(() => emailErr = 'Enter a valid email address'); return; }
    final ok = await confirmPay(PayOpts(
      title: 'Buy ${br.name} gift card', amount: total, cta: 'Pay & get code',
      rows: [SRow('Card', '${br.name} · $qty × \$${dollars(face)}'), SRow('Rate', '₦${rateStr(buyRate)}/\$'), SRow('Fee', f.naira(fee)), SRow('Deliver to', email)],
    ));
    if (!ok) return;
    final tx = store.debit(total, TxInput(type: 'giftcard', title: '${br.name} Gift Card', subtitle: '$qty × \$${dollars(face)} · e-code', icon: 'bi-gift', tone: 'pink'));
    if (tx == null) { toast('Insufficient wallet balance', type: ToastType.error); return; }
    final codes = List.generate(qty, (_) => genBuyCode());
    final now = f.now();
    final t = Trade(
      id: f.ref('GB'), side: 'buy', card: b, cardName: br.name, country: 'USA', type: 'E-code', face: face, qty: qty, usd: face * qty, rate: buyRate, bonus: 0, fee: fee,
      naira: total, status: 'Completed', codes: codes, email: email, createdAt: now, timeline: [TradeEvent('Pending', now), TradeEvent('Processing', now), TradeEvent('Completed', now)], txId: tx.id,
    );
    store.mutate(() => store.trades = [t, ...store.trades]);
    store.notify(icon: 'bi-gift', tone: 'pink', title: 'Gift card delivered', body: 'Your ${br.name} \$${dollars(face * qty)} code was sent to $email.');
    success(SuccessOpts(
      title: 'Gift card ready',
      message: 'Your code${qty > 1 ? 's were' : ' was'} also sent to **$email**.',
      rows: [SRow('Card', '${br.name} · \$${dollars(face * qty)}'), SRow('Paid', f.naira(total, 2)), SRow('Reference', tx.id)],
      extra: CodesBlock(codes),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    final br = brand(b);
    final col = Color(br.color);
    final base = face * qty * buyRate;
    final fee = (base * 0.01).roundToDouble() < 150 ? 150.0 : (base * 0.01).roundToDouble();
    final total = base + fee;
    final w = MediaQuery.sizeOf(context).width;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const AppText('Choose a gift card', v: TV.h3),
      const AppText('Digital codes, delivered instantly by email and saved in My trades.', v: TV.xs, muted: true),
      const SizedBox(height: 12),
      Wrap(spacing: 10, runSpacing: 10, children: [
        for (final id in buyIds)
          SizedBox(
            width: (w - 52) / 3,
            child: OptionCard(
              selected: b == id,
              onTap: () => setState(() => b = id),
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
              child: Column(children: [
                CardTile(id, size: 44),
                const SizedBox(height: 8),
                AppText(brand(id).name, v: TV.xs, weight: FontWeight.w700, maxLines: 1),
                const AppText('Digital · instant', size: 10, muted: true),
              ]),
            ),
          ),
      ]),
      const SizedBox(height: 18),
      AspectRatio(
        aspectRatio: 1.7,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.xl), gradient: LinearGradient(colors: [col, shade(col)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              AppIcon(br.icon, size: 30, color: Colors.white),
              const Spacer(),
              Pill(qty > 1 ? '$qty cards' : 'e-Gift card', tone: 'neutral'),
            ]),
            const Spacer(),
            AppText(br.name, v: TV.h2, color: Colors.white),
            AppText('Value \$${dollars(face)}', v: TV.sm, color: const Color(0xD9FFFFFF)),
          ]),
        ),
      ),
      const SizedBox(height: 18),
      const AppText('Card value (USD)', weight: FontWeight.w600),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 8, children: [for (final v in _buyFaces) AppChip('\$${dollars(v)}', active: face == v, onTap: () => setState(() => face = v))]),
      const SizedBox(height: 16),
      Row(children: [
        const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [AppText('Quantity', weight: FontWeight.w600), AppText('Max 5 cards per order', v: TV.xs, muted: true)])),
        QtyStepper(value: qty, min: 1, max: 5, onChanged: (v) => setState(() => qty = v.clamp(1, 5))),
      ]),
      const SizedBox(height: 16),
      AppTextField(
        label: 'Delivery email', keyboardType: TextInputType.emailAddress, placeholder: 'you@example.com', value: email, error: emailErr, autocorrect: false,
        hint: "We'll send the code here. It's also shown on your receipt.",
        onChanged: (v) => setState(() { email = v; emailErr = null; }),
      ),
      const SizedBox(height: 16),
      Summary([SRow('$qty × \$${dollars(face)} @ ₦${rateStr(buyRate)}/\$', f.naira(base)), SRow('Service fee', f.naira(fee))], total: ('Total', f.naira(total))),
      const SizedBox(height: 14),
      Btn('Buy for ${f.naira(total)}', icon: 'bi-bag-check', size: BtnSize.lg, full: true, onPressed: buy),
      const SizedBox(height: 6),
      AppText('Paid from your Naira wallet · ${f.naira(s.spendable, 2)}', v: TV.xs, muted: true, center: true),
    ]);
  }
}

/* ====================================================================== RATES */
class _RatesTab extends StatefulWidget {
  final void Function(String id, String country, String type, String? face) onSell;
  const _RatesTab({required this.onSell});
  @override
  State<_RatesTab> createState() => _RatesTabState();
}

class _RatesTabState extends State<_RatesTab> {
  String type = 'All', q = '';
  late String cid = giftcards.first.id;
  late String co = giftcards.first.countries.first;
  late String ty = giftcards.first.types.keys.first;
  String amt = '100';

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final rows = [for (final g in giftcards) for (final co in g.countries) for (final t in g.types.keys) (g: g, co: co, t: t, rate: rateFor(g, co, t))];
    final types = ['All', ...{for (final g in giftcards) ...g.types.keys}];
    final qq = q.trim().toLowerCase();
    final shown = rows.where((r) => (type == 'All' || r.t == type) && (qq.isEmpty || r.g.name.toLowerCase().contains(qq) || r.co.toLowerCase().contains(qq))).toList();

    final card = _gc(cid)!;
    final a = double.tryParse(amt) ?? 0;
    final cq = quote(card, co, ty, a);
    final out = a > 0 && (a < card.range[0] || a > card.range[1] * 10);

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      CardBox(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const AppText('Rate calculator', v: TV.h3),
        const SizedBox(height: 12),
        SelectField<String>(
          label: 'Gift card', value: cid, searchable: true,
          options: [for (final g in giftcards) SelectOption(g.id, g.name, leading: CardTile(g.id, size: 28))],
          onChanged: (v) { final g = _gc(v)!; setState(() { cid = v; co = g.countries.first; ty = g.types.keys.first; }); },
        ),
        const SizedBox(height: 10),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: SelectField<String>(label: 'Country', value: co, options: [for (final x in card.countries) SelectOption(x, x)], onChanged: (v) => setState(() => co = v))),
          const SizedBox(width: 10),
          Expanded(child: SelectField<String>(label: 'Type', value: ty, options: [for (final x in card.types.keys) SelectOption(x, x)], onChanged: (v) => setState(() => ty = v))),
        ]),
        const SizedBox(height: 10),
        AppTextField(label: 'Amount (USD)', prefix: '\$', keyboardType: const TextInputType.numberWithOptions(decimal: true), value: amt, inputFormatters: [AppTextField.decimal], onChanged: (v) => setState(() => amt = v)),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const AppText('Rate', v: TV.xs, muted: true), AppText('₦${rateStr(cq.rate)}/\$', v: TV.h3)])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [const AppText("You'll receive", v: TV.xs, muted: true), AppText(f.naira(cq.naira), v: TV.h2, color: c.success)]),
        ]),
        const SizedBox(height: 6),
        AppText(
          out ? '${card.name} accepts \$${dollars(card.range[0])}–\$${dollars(card.range[1])} per card' : cq.bonus > 0 ? 'Includes +₦${dollars(bonusRate)}/\$ bonus' : 'Bonus +₦${dollars(bonusRate)}/\$ from \$${dollars(bonusMin)}',
          v: TV.xs, color: out ? c.danger : c.muted,
        ),
        const SizedBox(height: 12),
        Btn('Sell this card', iconRight: 'bi-arrow-right', variant: BtnVariant.soft, onPressed: () => widget.onSell(cid, co, ty, a == a.roundToDouble() && a >= card.range[0] && a <= card.range[1] ? dollars(a) : null)),
      ])),
      const SizedBox(height: 20),
      const AppText("Today's rates", v: TV.h3),
      AppText('₦ per \$1 · +₦${dollars(bonusRate)}/\$ bonus on trades of \$${dollars(bonusMin)}+', v: TV.xs, muted: true),
      const SizedBox(height: 10),
      AppTextField(icon: 'bi-search', placeholder: 'Search brand or country', value: q, onChanged: (v) => setState(() => q = v)),
      const SizedBox(height: 10),
      Transform.translate(
        offset: const Offset(-16, 0),
        child: SizedBox(width: MediaQuery.sizeOf(context).width, child: HScroll(children: [for (final t in types) AppChip(t, active: type == t, onTap: () => setState(() => type = t))])),
      ),
      const SizedBox(height: 12),
      CardBox(
        padding: EdgeInsets.zero,
        child: shown.isEmpty
            ? const EmptyState(icon: 'bi-search', title: 'No rates found', message: 'Try another brand or country')
            : Column(children: [
                for (var i = 0; i < shown.length; i++)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(border: i > 0 ? Border(top: BorderSide(color: c.border)) : null),
                    child: Row(children: [
                      CardTile(shown[i].g.id, size: 38),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Flexible(child: AppText(shown[i].g.name, weight: FontWeight.w600, maxLines: 1)),
                          if (shown[i].g.hot) ...[const SizedBox(width: 4), AppIcon('bi-fire', size: 13, color: c.orange)],
                        ]),
                        Row(children: [CountryFlag(shown[i].co, size: 14), const SizedBox(width: 6), Flexible(child: AppText('${shown[i].co} · ${shown[i].t}', v: TV.xs, muted: true, maxLines: 1))]),
                      ])),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        AppText('₦${rateStr(shown[i].rate)}', weight: FontWeight.w700),
                        AppText('\$100 gets ${f.naira(shown[i].rate * 100)}', size: 10, muted: true),
                      ]),
                      const SizedBox(width: 10),
                      Btn('Sell', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: () => widget.onSell(shown[i].g.id, shown[i].co, shown[i].t, null)),
                    ]),
                  ),
              ]),
      ),
    ]);
  }
}

/* ====================================================================== TRADES */
const _tFilters = ['All', 'Pending', 'Processing', 'Completed', 'Failed', 'Bought'];

class _TradesTab extends StatefulWidget {
  final VoidCallback onSell;
  const _TradesTab({required this.onSell});
  @override
  State<_TradesTab> createState() => _TradesTabState();
}

class _TradesTabState extends State<_TradesTab> {
  String fl = 'All';
  Timer? _t;
  @override
  void initState() {
    super.initState();
    _t = Timer.periodic(const Duration(seconds: 1), (_) { if (mounted) setState(() {}); });
  }
  @override
  void dispose() { _t?.cancel(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    if (!s.authed) {
      return CardBox(child: EmptyState(icon: 'bi-person-lock', title: 'Sign in to see your trades', message: 'Track gift card sales and purchases from your account.', action: 'Log in', onAction: () => requireLogin(title: 'Log in to view your trades', next: '/giftcards?tab=trades')));
    }
    final trades = s.trades;
    final sold = trades.where((t) => t.side == 'sell').toList();
    final bought = trades.where((t) => t.side == 'buy').toList();
    final earned = sold.where((t) => t.status == 'Completed').fold<double>(0, (a, t) => a + t.naira);
    int count(String k) => k == 'All' ? trades.length : k == 'Bought' ? bought.length : sold.where((t) => t.status == k).length;
    final shown = fl == 'All' ? trades : fl == 'Bought' ? bought : sold.where((t) => t.status == fl).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const AppText('My trades', v: TV.h3),
          AppText('${sold.length} sold · ${bought.length} bought · ${f.naira(earned)} earned', v: TV.xs, muted: true),
        ])),
        Btn('New trade', icon: 'bi-plus-lg', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: widget.onSell),
      ]),
      const SizedBox(height: 10),
      Transform.translate(
        offset: const Offset(-16, 0),
        child: SizedBox(width: MediaQuery.sizeOf(context).width, child: HScroll(children: [for (final k in _tFilters) AppChip(k, count: count(k), active: fl == k, onTap: () => setState(() => fl = k))])),
      ),
      const SizedBox(height: 12),
      CardBox(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: trades.isEmpty
            ? EmptyState(icon: 'bi-gift', tone: 'pink', title: 'No trades yet', message: 'Sell your first gift card and get paid in minutes.', action: 'Sell a gift card', onAction: widget.onSell)
            : shown.isEmpty
                ? EmptyState(icon: 'bi-funnel', title: 'No ${fl.toLowerCase()} trades', message: 'Try another filter.', action: 'Show all trades', onAction: () => setState(() => fl = 'All'))
                : Column(children: [for (final t in shown) TradeRow(t, key: ValueKey(t.id))]),
      ),
    ]);
  }
}
