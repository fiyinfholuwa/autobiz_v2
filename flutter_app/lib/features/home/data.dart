/// Dashboard derivations — ported from mobile_app/src/features/home/data.ts (web app/dashboard.html).
library;

import '../../core/format.dart' as f;
import '../../store/models.dart';

const _day = 86400000;

bool _outOk(Tx t) => t.direction == 'out' && t.status == 'success';

double sumOut(List<Tx> txs, int lo, int hi, [List<String>? types]) => txs
    .where((t) => _outOk(t) && t.date >= lo && t.date < hi && (types == null || types.contains(t.type)))
    .fold(0.0, (a, t) => a + t.amount);

int monthStart([int offset = 0]) {
  final d = DateTime.now();
  return DateTime(d.year, d.month + offset, 1).millisecondsSinceEpoch;
}

double spentThisMonth(List<Tx> txs) => sumOut(txs, monthStart(0), monthStart(1));

class UpcomingBill {
  final int due;
  final String provider, name, last, href;
  final double? amount;
  const UpcomingBill({required this.due, required this.provider, required this.name, required this.last, this.amount, required this.href});
}

List<UpcomingBill> upcomingBills(List<Tx> txs, List<Esim> esims) {
  final now = f.now();
  final out = <UpcomingBill>[];
  Tx? cable;
  for (final t in txs) { if (t.type == 'cable' && t.status == 'success') { cable = t; break; } }
  if (cable == null) { for (final t in txs) { if (t.type == 'cable') { cable = t; break; } } }
  if (cable != null) {
    final d = DateTime.fromMillisecondsSinceEpoch(cable.date);
    final due = DateTime(d.year, d.month + 1, d.day, d.hour, d.minute).millisecondsSinceEpoch;
    out.add(UpcomingBill(due: due, provider: 'DStv', name: cable.title, last: f.date(cable.date), amount: cable.amount, href: '/pay?tab=cable'));
  } else {
    out.add(UpcomingBill(due: now + 6 * _day, provider: 'DStv', name: 'DStv Compact', last: '—', amount: 19000, href: '/pay?tab=cable'));
  }
  Tx? elec;
  for (final t in txs) { if (t.type == 'electricity' && t.status == 'success') { elec = t; break; } }
  if (elec != null) {
    out.add(UpcomingBill(due: elec.date + 14 * _day, provider: 'Electricity', name: elec.title, last: f.date(elec.date), amount: elec.amount, href: '/pay?tab=electricity'));
  } else {
    out.add(UpcomingBill(due: now + 9 * _day, provider: 'Electricity', name: 'Prepaid token', last: '—', amount: 10000, href: '/pay?tab=electricity'));
  }
  for (final e in esims) {
    if (e.status == 'Active' && e.expiresAt != null) {
      out.add(UpcomingBill(due: e.expiresAt!, provider: 'eSIM', name: '${e.country} ${e.data}', last: 'Expires', href: '/esim?tab=mine'));
      break;
    }
  }
  out.sort((a, b) => a.due.compareTo(b.due));
  return out.take(2).toList();
}

const _weekCur = [38, 22, 41, 30, 52, 47, 26];
const _weekPrev = [31, 28, 35, 36, 40, 44, 33];
const _monthCur = [180, 240, 210, 305];
const _monthPrev = [160, 220, 260, 280];

class ChartSeries {
  final List<String> labels;
  final List<double> cur, prev;
  final (String, String) legend;
  const ChartSeries(this.labels, this.cur, this.prev, this.legend);
}

ChartSeries chartSeries(List<Tx> txs, String mode) {
  if (mode == 'week') {
    final today = f.startOfDay();
    final labels = <String>[], cur = <double>[], prev = <double>[];
    for (var i = 6; i >= 0; i--) {
      final d = f.addDays(today, -i);
      final k = 6 - i;
      labels.add(f.days[DateTime.fromMillisecondsSinceEpoch(d).weekday % 7]);
      cur.add(_weekCur[k] * 1000 + sumOut(txs, d, f.addDays(d, 1)));
      prev.add(_weekPrev[k] * 1000 + sumOut(txs, f.addDays(d, -7), f.addDays(d, -6)));
    }
    return ChartSeries(labels, cur, prev, ('This week', 'Last week'));
  }
  final ms = monthStart(0), ls = monthStart(-1);
  const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  final cur = [for (var i = 0; i < 4; i++) _monthCur[i] * 1000 + sumOut(txs, ms + i * 7 * _day, ms + (i + 1) * 7 * _day)];
  final prev = [for (var i = 0; i < 4; i++) _monthPrev[i] * 1000 + sumOut(txs, ls + i * 7 * _day, ls + (i + 1) * 7 * _day)];
  return ChartSeries(labels, cur, prev, ('This month', 'Last month'));
}

class ExpenseCat {
  final String label, icon, tone, type;
  final List<String> types;
  final double base;
  const ExpenseCat(this.label, this.icon, this.tone, this.types, this.type, this.base);
}

const expenseCats = [
  ExpenseCat('Shopping', 'bi-bag', 'violet', ['shop'], 'shop', 42000),
  ExpenseCat('Bills & Utilities', 'bi-lightning-charge', 'orange', ['electricity', 'cable', 'education', 'betting'], 'electricity', 31000),
  ExpenseCat('Airtime & Data', 'bi-phone', 'warning', ['airtime', 'data'], 'airtime', 6500),
  ExpenseCat('Travel', 'bi-airplane', 'cyan', ['flight', 'esim'], 'flight', 0),
  ExpenseCat('USD Cards', 'bi-credit-card-2-front', 'success', ['card'], 'card', 12000),
  ExpenseCat('Transfers', 'bi-send', 'primary', ['transfer', 'withdrawal'], 'transfer', 25000),
];

class Expense {
  final ExpenseCat cat;
  final double cur;
  /// % change vs last month; null when last month was 0 ("New")
  final int? change;
  const Expense(this.cat, this.cur, this.change);
}

List<Expense> expenses(List<Tx> txs) => [
      for (final cat in expenseCats)
        () {
          final cur = sumOut(txs, monthStart(0), monthStart(1), cat.types);
          final prev = cat.base + sumOut(txs, monthStart(-1), monthStart(0), cat.types);
          return Expense(cat, cur, prev == 0 ? null : (((cur - prev) / prev) * 100).round());
        }(),
    ];

String monthLabel() { final d = DateTime.now(); return '${f.months[d.month - 1]} ${d.year}'; }

/// "**** 4821" / "**** **** **** 4821" for long digit strings
String maskNumber(String n) {
  final d = n.replaceAll(RegExp(r'\s'), '');
  if (RegExp(r'^\d+$').hasMatch(d) && d.length >= 10) {
    final last = d.substring(d.length - 4);
    return d.length == 10 ? '**** $last' : '**** **** **** $last';
  }
  return n;
}
