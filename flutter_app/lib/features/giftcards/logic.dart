/// Gift card exchange — rates, quotes and the simulated trade review.
/// Ported from mobile_app/src/features/giftcards/logic.ts.
library;

import 'dart:math' as math;

import '../../core/format.dart' as f;
import '../../data/catalog.dart';
import '../../store/app_store.dart';
import '../../ui/overlay.dart';

const buyIds = ['amazon', 'apple', 'steam', 'google', 'playstation', 'netflix'];

class Brand {
  final String id, name, icon;
  final int color;
  const Brand(this.id, this.name, this.icon, this.color);
}

const _extra = {'netflix': Brand('netflix', 'Netflix', 'bi-play-btn-fill', 0xFFE50914)};

Brand brand(String id) {
  final g = giftcardById(id);
  if (g != null) return Brand(g.id, g.name, g.icon, g.color);
  return _extra[id] ?? Brand(id, id, 'bi-gift', 0xFFE64980);
}

const flags = {'USA': 'us', 'UK': 'gb', 'Canada': 'ca', 'Australia': 'au', 'Germany': 'de', 'Euro': 'eu'};
const adj = {'USA': 0, 'UK': -15, 'Canada': -40, 'Australia': -55, 'Germany': -35, 'Euro': -25, 'Global': -10};
const double bonusMin = 500;
const double bonusRate = 10;
const int processMs = 6000;
const int doneMs = 14000;
const double buyRate = usdRate;

const typeInfoMap = {
  'Physical': ('bi-credit-card', 'Upload clear photos of the card (front & back)'),
  'E-code': ('bi-upc-scan', 'Paste the digital code — no photos needed'),
  'Cash receipt': ('bi-receipt', 'Photos of the card + purchase receipt'),
  'No receipt': ('bi-credit-card-2-back', 'Physical card without a receipt'),
};
(String, String) typeInfo(String t) => typeInfoMap[t] ?? typeInfoMap['Physical']!;

const statusTone = {'Pending': 'warning', 'Processing': 'primary', 'Completed': 'success', 'Failed': 'danger'};

double rateFor(GiftCardBrand c, String country, String type) => (c.types[type] ?? 0) + (adj[country] ?? 0);
double maxRate(GiftCardBrand c) => [for (final co in c.countries) for (final t in c.types.keys) rateFor(c, co, t)].reduce(math.max);
double topRate() => giftcards.map(maxRate).reduce(math.max);

class Quote {
  final double base, bonus, rate, naira;
  const Quote(this.base, this.bonus, this.rate, this.naira);
}

Quote quote(GiftCardBrand c, String country, String type, double totalUsd) {
  final base = rateFor(c, country, type);
  final bonus = totalUsd >= bonusMin ? bonusRate : 0.0;
  final rate = base + bonus;
  return Quote(base, bonus, rate, (totalUsd * rate).roundToDouble());
}

String maskCode(String s) => s.length <= 6 ? s : '${s.substring(0, 4)}••••${s.substring(s.length - 4)}';
String cleanCode(String s) => s.replaceAll(RegExp('[^A-Za-z0-9]'), '');

/// Rate shown as "₦1,210" style integer
String rateStr(double r) => f.numFmt(r);

/// Whole-number dollars without ".0"
String dollars(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : f.numFmt(v);

final _rand = math.Random();
/// Buy-side codes: 4×4 chars, alphabet × 31 (so "9" never appears, as on web).
String genBuyCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return List.generate(4, (_) => List.generate(4, (_) => a[(_rand.nextDouble() * 31).floor()]).join()).join('-');
}

int tradeProgress(Trade t) =>
    t.status == 'Completed' || t.status == 'Failed' ? 100 : math.min(95, ((f.now() - t.createdAt) / doneMs * 100).round());

Trade? tradeById(String id) {
  for (final t in store.trades) { if (t.id == id) return t; }
  return null;
}

/// Simulated review of sell trades. Runs every second from main.dart.
void tickTrades() {
  final trades = store.trades;
  if (trades.isEmpty) return;
  final now = f.now();
  var changed = false;
  final completed = <Trade>[];
  final failed = <Trade>[];
  for (final t in trades) {
    if (t.side != 'sell' || t.status == 'Completed' || t.status == 'Failed') continue;
    final age = now - t.createdAt;
    if (age >= processMs && t.status == 'Pending') {
      t.status = 'Processing';
      t.timeline = [...t.timeline, TradeEvent('Processing', math.min(now, t.createdAt + processMs))];
      changed = true;
    }
    if (age >= doneMs) {
      final at = math.min(now, t.createdAt + doneMs);
      if (t.failReason != null) {
        t.status = 'Failed';
        t.reason = t.failReason;
        t.timeline = [...t.timeline, TradeEvent('Failed', at)];
        failed.add(t);
      } else {
        final credit = !t.credited;
        t.status = 'Completed';
        t.credited = true;
        t.timeline = [...t.timeline, TradeEvent('Completed', at)];
        if (credit) completed.add(t);
      }
      changed = true;
    }
  }
  if (!changed) return;
  // persist BEFORE crediting so a trade can never be paid twice
  store.commit();

  for (final t in completed) {
    final tx = store.credit(t.naira, TxInput(type: 'giftcard', title: '${t.cardName} Card Sold', subtitle: '${f.usd(t.usd)} · ${t.type}', icon: 'bi-gift', tone: 'pink'));
    store.mutate(() => t.txId = tx.id);
    store.notify(icon: 'bi-gift', tone: 'pink', title: 'Gift card trade completed', body: '${f.naira(t.naira)} from your ${t.cardName} ${f.usd(t.usd)} trade has been credited.');
  }
  if (completed.length == 1) {
    toast('**${completed[0].cardName} trade completed**\n${f.naira(completed[0].naira)} credited to your wallet', duration: 5000);
  } else if (completed.length > 1) {
    toast('**${completed.length} trades completed**\n${f.naira(completed.fold<double>(0, (a, t) => a + t.naira))} credited to your wallet', duration: 5000);
  }
  for (final t in failed) {
    store.notify(icon: 'bi-x-octagon', tone: 'danger', title: 'Gift card trade declined', body: '${t.cardName} ${f.usd(t.usd)}: ${t.reason}');
    toast('**${t.cardName} trade declined**\n${t.reason}', type: ToastType.error, duration: 6000);
  }
}
