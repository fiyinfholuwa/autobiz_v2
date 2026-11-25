/// eSIM pricing, status and purchase logic — ported from mobile_app/src/features/esim/logic.ts.
library;

import 'dart:math' as math;

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../data/catalog.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const int day = 86400000;
const double rate = usdRate;

class Plan {
  final EsimPlanTemplate t;
  final double usd;
  final double ngn;
  final String label;
  const Plan(this.t, this.usd, this.ngn, this.label);
  double get gb => t.gb;
  int get days => t.days;
  bool get popular => t.popular;
  bool get unlimited => t.unlimited;
  String get data => t.data;
}

double usdPrice(EsimCountry c, EsimPlanTemplate t) => math.max(0.99, (c.from * t.mult * 10).round() / 10 - 0.01);

List<Plan> plansFor(EsimCountry c) => esimPlanTemplates.map((t) {
      final u = usdPrice(c, t);
      return Plan(t, double.parse(u.toStringAsFixed(2)), (u * rate).roundToDouble(), t.unlimited ? 'Unlimited' : t.data);
    }).toList();

double minFrom(EsimCountry c) => plansFor(c).map((p) => p.usd).reduce(math.min);
double globalMin() => esimCountries.map(minFrom).reduce(math.min);

EsimCountry? countryByCode(String code) {
  for (final c in esimCountries) { if (c.code == code) return c; }
  return null;
}

String regionName(String id) {
  for (final r in esimRegions) { if (r.id == id) return r.name; }
  return id;
}

String _norm(String s) {
  const from = 'àáâãäåèéêëìíîïòóôõöùúûüýÿñç';
  const to = 'aaaaaaeeeeiiiiooooouuuuyync';
  final b = StringBuffer();
  for (final ch in s.toLowerCase().split('')) {
    final i = from.indexOf(ch);
    b.write(i >= 0 ? to[i] : ch);
  }
  return b.toString();
}

List<EsimCountry> searchCountries(String q) {
  final n = _norm(q.trim());
  if (n.isEmpty) return [];
  final l = esimCountries.where((c) => _norm(c.name).contains(n) || c.code.toLowerCase() == n || _norm(regionName(c.region)).contains(n)).toList();
  int idx(EsimCountry c) { final i = _norm(c.name).indexOf(n); return i < 0 ? 99 : i; }
  l.sort((a, b) { final d = idx(a) - idx(b); return d != 0 ? d : a.name.compareTo(b.name); });
  return l.take(8).toList();
}

const devices = <(String, List<(String, bool)>)>[
  ('Apple', [('iPhone 16 / 16 Pro', true), ('iPhone 15 / 15 Pro', true), ('iPhone 14 / 14 Pro', true), ('iPhone 13 series', true), ('iPhone 12 series', true), ('iPhone 11 series', true), ('iPhone XS / XR', true), ('iPhone X', false), ('iPhone 8 / 8 Plus', false)]),
  ('Samsung', [('Galaxy S24 / S23 series', true), ('Galaxy S22 / S21 / S20', true), ('Galaxy Z Fold / Z Flip', true), ('Galaxy A55 / A54', true), ('Galaxy A15 / A05', false), ('Galaxy Note 20', true)]),
  ('Google', [('Pixel 9 / 8 / 7', true), ('Pixel 6 / 5 / 4', true), ('Pixel 3a', false)]),
  ('Others', [('Tecno Camon 30 / Spark 20', false), ('Infinix Note 40 / Hot 40', false), ('itel A70 / S23', false), ('Xiaomi 14 / 13 Pro', true), ('Redmi Note 13', false), ('Huawei P40 / Mate 40', true), ('Oppo Find X5 / X6', true), ('Motorola Razr 40', true)]),
];

List<SelectOption<String>> get deviceOptions => [for (final g in devices) for (final d in g.$2) SelectOption(d.$1, d.$1, sub: g.$1)];

bool? deviceOk(String m) {
  for (final g in devices) { for (final d in g.$2) { if (d.$1 == m) return d.$2; } }
  return null;
}

String computeStatus(Esim e) {
  final now = f.now();
  if (e.status == 'Active' && e.expiresAt != null && now > e.expiresAt!) return 'Expired';
  if (e.status == 'Not installed' && now > e.purchasedAt + 180 * day) return 'Expired';
  return e.status;
}

double usedGb(Esim e) {
  if (computeStatus(e) != 'Active' || e.activatedAt == null) return 0;
  final frac = math.min(1.0, (f.now() - e.activatedAt!) / (e.days * day));
  final last4 = e.iccid.length >= 4 ? e.iccid.substring(e.iccid.length - 4) : e.iccid;
  final seed = ((int.tryParse(last4) ?? 0) % 30) / 100;
  final used = (e.gb >= 999 ? 2 : e.gb) * math.min(0.97, 0.04 + seed * 0.5 + frac * 0.85);
  return (used * 100).round() / 100;
}

({String smdp, String act}) lpaParts(String code) {
  final p = code.split(r'$');
  return (smdp: p.length > 1 ? p[1] : '', act: p.length > 2 ? p[2] : '');
}

String last4(String s) => s.length >= 4 ? s.substring(s.length - 4) : s;

/// Format a GB number like JS (no trailing ".0").
String gbStr(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : '$v';

Esim? esimById(String id) {
  for (final e in store.esims) { if (e.id == id) return e; }
  return null;
}

void activate(String id) {
  final e = esimById(id);
  if (e == null) return;
  final now = f.now();
  final expiresAt = now + e.days * day;
  store.mutate(() { e.status = 'Active'; e.activatedAt = now; e.expiresAt = expiresAt; });
  toast('**${e.country}** eSIM is active until ${f.date(expiresAt)}');
  store.notify(icon: 'bi-sim', tone: 'success', title: 'eSIM activated', body: '${e.country} · ${e.data}. Validity ends ${f.date(expiresAt)}.');
}

List<Esim> finishPurchase(EsimCountry c, Plan p, int qty, Tx tx, void Function(String id) onMine) {
  final now = f.now();
  final list = List.generate(qty, (i) => Esim(
        id: 'ES${now.toRadixString(36).toUpperCase()}$i${rndCode(3)}',
        iccid: '89234${rndDigits(15)}',
        country: c.name, code: c.code, regional: c.regional, icon: c.icon,
        plan: '${p.label} · ${p.days} days', data: p.label, gb: p.gb, days: p.days,
        price: p.ngn, usd: p.usd, status: 'Not installed', purchasedAt: now,
        txId: tx.id,
        activationCode: 'LPA:1\$smdp.autobiz.io\$${rndCode(4)}-${rndCode(4)}-${rndCode(4)}-${rndCode(4)}',
      ));
  store.mutate(() => store.esims = [...list, ...store.esims]);
  store.notify(icon: 'bi-sim', tone: 'violet', title: '${c.name} eSIM ready', body: '${p.label} · ${p.days} days. Install it before you travel.');
  success(SuccessOpts(
    title: 'Your eSIM is ready!',
    message: "${qty > 1 ? '$qty eSIMs for ' : ''}${c.name} · ${p.label} · ${p.days} days. Scan the QR with the phone you'll travel with.",
    rows: [SRow('Amount paid', f.naira(p.ngn * qty, 2)), SRow('ICCID', list[0].iccid), SRow('Reference', tx.id)],
    actions: [
      SuccessAction('Install now', () => onMine(list[0].id), icon: 'bi-qr-code'),
      SuccessAction('My eSIMs', () => onMine(''), variant: BtnVariant.outline),
    ],
  ));
  return list;
}

void finishTopup(Esim e, Plan p, Tx tx) {
  final now = f.now();
  final expired = computeStatus(e) == 'Expired';
  store.mutate(() {
    e.topups = [...e.topups, EsimTopup(data: p.label, gb: p.gb, days: p.days, price: p.ngn, at: now)];
    if (expired) {
      e.status = 'Active';
      e.activatedAt = now;
      e.expiresAt = now + p.days * day;
      e.days = p.days;
      e.gb = p.gb;
      e.data = p.label;
    } else {
      if (p.unlimited || e.gb >= 999) {
        e.gb = 999;
        e.data = 'Unlimited';
      } else {
        e.gb = e.gb + p.gb;
        e.data = '${gbStr(e.gb)} GB';
      }
      e.days = e.days + p.days;
      if (e.expiresAt != null) e.expiresAt = e.expiresAt! + p.days * day;
    }
    e.plan = '${e.data} · ${e.days} days';
  });
  store.notify(icon: 'bi-sim', tone: 'violet', title: 'eSIM topped up', body: '${p.label} added to your ${e.country} eSIM.');
  success(SuccessOpts(
    title: 'Top-up successful',
    message: '${p.label} · ${p.days} days added to your ${e.country} eSIM. No reinstall needed.',
    rows: [
      SRow('Amount paid', f.naira(p.ngn, 2)),
      SRow('New allowance', e.data),
      SRow('Validity', e.expiresAt != null ? 'Until ${f.date(e.expiresAt!)}' : '${e.days} days from activation'),
      SRow('Reference', tx.id),
    ],
  ));
}
