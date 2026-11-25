/// Virtual cards — constants, generators and state helpers.
/// Ported from mobile_app/src/features/cards/{constants,actions}.ts (web: app/virtual-cards.html).
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart' as f;
import '../../core/nav.dart';
import '../../core/random.dart';
import '../../data/catalog.dart' as cat;
import '../../store/app_store.dart';
import '../../ui/overlay.dart';

final double rate = cat.usdRate == 0 ? 1580 : cat.usdRate; // ₦/$ when funding
final double sellRate = rate - 40; // ₦/$ when withdrawing / terminating
const double createFee = 2;
const double fundFee = 0.01;
const double minCreate = 5;
const double minFund = 1;
const double maxBal = 10000;
const int maxCards = 5;
const double maxInitial = 2500;
const double defaultLimit = 1000;
double r2(num n) => round2(n);

/* ---------------- Designs ---------------- */
class CardDesign {
  final String id, name;
  final List<Color> colors;
  final List<double> stops;
  const CardDesign(this.id, this.name, this.colors, this.stops);
}

const themes = <CardDesign>[
  CardDesign('midnight', 'Midnight', [Color(0xFF2B3A9E), Color(0xFF141B4D), Color(0xFF0B1230)], [0, 0.55, 1]),
  CardDesign('aurora', 'Aurora', [Color(0xFF7048E8), Color(0xFFB43FB0), Color(0xFFE64980)], [0, 0.55, 1]),
  CardDesign('ocean', 'Ocean', [Color(0xFF15AABF), Color(0xFF1971C2), Color(0xFF2348FF)], [0, 0.55, 1]),
  CardDesign('emerald', 'Emerald', [Color(0xFF20C997), Color(0xFF0CA678), Color(0xFF065A45)], [0, 0.45, 1]),
  CardDesign('sunset', 'Sunset', [Color(0xFFFFA94D), Color(0xFFFD7E14), Color(0xFFE64980)], [0, 0.4, 1]),
  CardDesign('onyx', 'Onyx', [Color(0xFF495057), Color(0xFF212529), Color(0xFF0B0B0F)], [0, 0.5, 1]),
];

CardDesign? themeById(String? id) {
  for (final t in themes) { if (t.id == id) return t; }
  return null;
}

CardDesign themeFor(VirtualCard c) {
  final t = themeById(c.themeId);
  if (t != null) return t;
  final colors = c.gradient.isNotEmpty ? c.gradient.map((e) => Color(e)).toList() : themes[0].colors;
  return CardDesign('custom', 'Custom', colors, colors.length == 3 ? const [0, 0.55, 1] : List.generate(colors.length, (i) => colors.length == 1 ? 0 : i / (colors.length - 1)));
}

/* ---------------- Brands ---------------- */
class BrandInfo { final String name, desc; final Color panel; const BrandInfo(this.name, this.panel, this.desc); }

const brands = <String, BrandInfo>{
  'visa': BrandInfo('Visa', Color(0xFF1A1F71), 'Best for subscriptions, ads & most US merchants'),
  'mastercard': BrandInfo('Mastercard', Color(0xFF111111), 'Great for AliExpress, Amazon & travel bookings'),
};
String brandName(String b) => brands[b]?.name ?? 'Visa';

/* ---------------- Merchants ---------------- */
class Merchant {
  final String name, short, icon, cat;
  final Color bg, fg;
  const Merchant(this.name, this.short, this.icon, this.bg, this.fg, this.cat);
}

const merchants = <String, Merchant>{
  'netflix': Merchant('Netflix', 'Netflix', 'bi-play-btn-fill', Color(0xFFE50914), Colors.white, 'Streaming'),
  'spotify': Merchant('Spotify', 'Spotify', 'bi-spotify', Color(0xFF1DB954), Colors.white, 'Music'),
  'aws': Merchant('Amazon Web Services', 'AWS', 'bi-amazon', Color(0xFF232F3E), Color(0xFFFF9900), 'Cloud'),
  'aliexpress': Merchant('AliExpress', 'AliExpress', 'bi-bag-heart-fill', Color(0xFFFF4747), Colors.white, 'Shopping'),
  'apple': Merchant('Apple.com/bill', 'Apple', 'bi-apple', Color(0xFF1D1D1F), Colors.white, 'Apps'),
  'google': Merchant('Google Workspace', 'Google', 'bi-google', Color(0xFF4285F4), Colors.white, 'Productivity'),
  'amazon': Merchant('Amazon.com', 'Amazon', 'bi-cart-fill', Color(0xFFFF9900), Color(0xFF111111), 'Shopping'),
  'meta': Merchant('Meta Ads', 'Meta Ads', 'bi-meta', Color(0xFF0866FF), Colors.white, 'Advertising'),
  'youtube': Merchant('YouTube Premium', 'YouTube', 'bi-youtube', Color(0xFFFF0033), Colors.white, 'Streaming'),
  'steam': Merchant('Steam', 'Steam', 'bi-steam', Color(0xFF171A21), Color(0xFF66C0F4), 'Gaming'),
  'microsoft': Merchant('Microsoft 365', 'Microsoft', 'bi-microsoft', Color(0xFF0078D4), Colors.white, 'Software'),
  'openai': Merchant('ChatGPT Plus', 'ChatGPT', 'bi-stars', Color(0xFF10A37F), Colors.white, 'AI tools'),
  'udemy': Merchant('Udemy', 'Udemy', 'bi-mortarboard-fill', Color(0xFFA435F0), Colors.white, 'Learning'),
  'airbnb': Merchant('Airbnb', 'Airbnb', 'bi-house-heart-fill', Color(0xFFFF5A5F), Colors.white, 'Travel'),
  'uber': Merchant('Uber', 'Uber', 'bi-car-front-fill', Color(0xFF000000), Colors.white, 'Rides'),
  'playstation': Merchant('PlayStation Store', 'PlayStation', 'bi-playstation', Color(0xFF003791), Colors.white, 'Gaming'),
};
const worksOn = ['netflix', 'spotify', 'aws', 'aliexpress', 'apple', 'google', 'amazon', 'meta', 'youtube', 'openai', 'microsoft', 'steam'];

/// (label, display value, copy value)
const billing = <(String, String, String?)>[
  ('Street', '8 The Green, Suite 7421', null),
  ('City', 'Dover', null),
  ('State', 'Delaware (DE)', 'Delaware'),
  ('ZIP code', '19901', null),
  ('Country', 'United States', null),
];
const billingAll = '8 The Green, Suite 7421, Dover, DE 19901, United States';

const fees = <(String, String)>[
  ('Card creation', '\$2.00'),
  ('Funding fee', '1%'),
  ('Funding rate', '₦1,580/\$'),
  ('Withdrawal rate', '₦1,540/\$'),
  ('Monthly maintenance', 'Free'),
  ('Min. initial funding', '\$5.00'),
  ('Max. card balance', '\$10,000.00'),
  ('Monthly spend limit', 'up to \$5,000'),
  ('Cards per account', '5'),
];

const faq = <(String, String)>[
  ('Where can I use my virtual card?', 'Anywhere online that accepts Visa or Mastercard in USD — Netflix, Spotify, Apple, Google, AWS, AliExpress, Amazon, Meta Ads, and millions more.'),
  ('Why was my payment declined?', "Common reasons: the card is frozen, the balance is lower than the charge, your monthly limit has been reached, or the billing address entered doesn't match the one shown here."),
  ('Can I get my money back to Naira?', 'Yes. Use **Withdraw** to move USD back to your Naira wallet at ₦1,540/\$. Terminating a card also refunds its full balance.'),
  ('Is it safe to save my card on websites?', 'Yes. Your card details are only shown after PIN verification and auto-hide after 30 seconds. You can freeze the card instantly if anything looks wrong.'),
  ('How many cards can I have?', 'Up to 5 active cards — great for separating subscriptions, ads and shopping.'),
];

/* ---------------- Number generation (Luhn) ---------------- */
final _rng = math.Random();

String _luhnCheck(String partial) {
  var sum = 0;
  for (var i = 0; i < partial.length; i++) {
    var d = int.parse(partial[partial.length - 1 - i]);
    if (i % 2 == 0) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return '${(10 - (sum % 10)) % 10}';
}

String genNumber(String brand) {
  T pick<T>(List<T> a) => a[_rng.nextInt(a.length)];
  var p = brand == 'visa' ? '4${pick(['53958', '84718', '16631'])}' : pick(['5399', '5196', '2223']);
  while (p.length < 15) { p += '${_rng.nextInt(10)}'; }
  return p + _luhnCheck(p);
}

const previewNumber = {'visa': '4539580000004821', 'mastercard': '5399000000004821'};

String last4(String n) => n.length <= 4 ? n : n.substring(n.length - 4);
String maskNumber(String n) => '•••• •••• •••• ${last4(n)}';
String groupNumber(String n) => n.replaceAllMapped(RegExp(r'(\d{4})(?=\d)'), (m) => '${m[1]} ');
String cardTag(VirtualCard c) => '•••• ${last4(c.number)}';

/// "12.3.4" → "12.34"-style cleaning used by all amount inputs.
String cleanAmt(String t) {
  var s = t.replaceAll(RegExp(r'[^\d.]'), '');
  final i = s.indexOf('.');
  if (i > -1) s = s.substring(0, i + 1) + s.substring(i + 1).replaceAll('.', '');
  return s;
}
double amt(String s) => double.tryParse(s.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;

/* ---------------- Fees ---------------- */
({double fee, double totalUsd, double naira}) createCost(double amount) {
  final fee = r2(amount * fundFee);
  final totalUsd = r2(amount + createFee + fee);
  return (fee: fee, totalUsd: totalUsd, naira: r2(totalUsd * rate));
}

({double fee, double naira}) fundCost(double a) {
  final fee = r2(a * fundFee);
  return (fee: fee, naira: r2((a + fee) * rate));
}

/// Successful purchases this calendar month.
double monthSpent(VirtualCard c) {
  final now = DateTime.now();
  return r2(c.txns.where((t) {
    if (t.kind != 'purchase' || t.status != 'success') return false;
    final d = DateTime.fromMillisecondsSinceEpoch(t.date);
    return d.month == now.month && d.year == now.year;
  }).fold<double>(0, (a, t) => a + t.amount));
}

/* ---------------- Store helpers ---------------- */
VirtualCard? getCard(String id) {
  for (final c in store.cards) { if (c.id == id) return c; }
  return null;
}

void updateCard(String id, void Function(VirtualCard c) fn) {
  final c = getCard(id);
  if (c == null) return;
  store.mutate(() => fn(c));
}

CardTx addCardTx(String id, {required String kind, required String direction, required String title, String? merchant, required String note, required double amount, required String status}) {
  final t = CardTx(id: f.ref('CT'), kind: kind, direction: direction, title: title, merchant: merchant, note: note, amount: amount, status: status, date: f.now());
  updateCard(id, (c) {
    c.txns.insert(0, t);
    if (c.txns.length > 80) c.txns = c.txns.sublist(0, 80);
  });
  return t;
}

void patchCardTx(String cardId, String txId, {String? status, String? note}) {
  updateCard(cardId, (c) {
    for (final t in c.txns) {
      if (t.id == txId) {
        if (status != null) t.status = status;
        if (note != null) t.note = note;
      }
    }
  });
}

/// Build a new card with seeded demo transactions.
VirtualCard buildCard({required String brand, required CardDesign theme, required String label, required double amount, required String holder}) {
  final now = f.now();
  final d = DateTime.now();
  final expiry = '${d.month.toString().padLeft(2, '0')}/${((d.year + 3) % 100).toString().padLeft(2, '0')}';
  const demo = [
    ('netflix', 1.0, 'reversed', 'Card verification · reversed'),
    ('spotify', 0.0, 'success', r'Card linked · $0 authorization'),
    ('aws', 1.0, 'reversed', 'Account verification hold'),
    ('aliexpress', 12.49, 'declined', 'Declined · billing address mismatch'),
    ('apple', 0.0, 'success', 'Apple ID payment method added'),
  ];
  final txns = <CardTx>[
    CardTx(id: f.ref('CT'), kind: 'topup', direction: 'in', title: 'Initial funding', note: 'From NGN wallet', amount: r2(amount), status: 'success', date: now),
    for (var i = 0; i < demo.length; i++)
      CardTx(id: '${f.ref('CT')}$i', kind: 'purchase', direction: 'out', merchant: demo[i].$1, title: merchants[demo[i].$1]!.name, note: demo[i].$4, amount: demo[i].$2, status: demo[i].$3, date: now - (i + 1) * 3 * 60000),
  ];
  return VirtualCard(
    id: 'VC${now.toRadixString(36).toUpperCase()}',
    name: holder,
    brand: brand,
    number: genNumber(brand),
    expiry: expiry,
    cvv: '${100 + _rng.nextInt(900)}',
    balance: r2(amount),
    status: 'active',
    gradient: theme.colors.map((c) => c.toARGB32()).toList(),
    themeId: theme.id,
    label: label,
    limit: defaultLimit,
    createdAt: now,
    txns: txns,
  );
}

/// CSV statement text.
String statementCsv(VirtualCard c) {
  String q(String v) => '"${v.replaceAll('"', '""')}"';
  final rows = <List<String>>[['Date', 'Description', 'Note', 'Direction', 'Amount (USD)', 'Status']];
  for (final t in c.txns) {
    rows.add([DateTime.fromMillisecondsSinceEpoch(t.date).toUtc().toIso8601String(), t.title, t.note, t.direction, t.amount.toStringAsFixed(2), t.status]);
  }
  return rows.map((r) => r.map(q).join(',')).join('\r\n');
}

/* ---------------- Feature UI state (selection, reveal requests) ---------------- */
class CardsUI {
  static final selectedId = ValueNotifier<String?>(null);
  static final revealRequest = ValueNotifier<int>(0);
  static void select(String? id) => selectedId.value = id;
  static void requestReveal(String id) { selectedId.value = id; revealRequest.value++; }
}

/// Entry point for creating a card (login + 5-card cap).
void startCreate() {
  if (!requireLogin(title: 'Log in to get a USD card', message: 'Create a free account or log in to create your virtual dollar card.')) return;
  if (store.cards.length >= maxCards) { toast('You can have up to 5 cards. Terminate one to create another.', type: ToastType.warning); return; }
  rootContext.push('/cards/create');
}
