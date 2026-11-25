/// Formatting helpers — mirrors mobile_app/src/lib/format.ts (AB.fmt on the web).
library;

import 'dart:math' as math;

String _group(String intStr) => intStr.replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');

/// Number with thousands separators. dp null → 0–2 decimals (trailing zeros trimmed).
String numFmt(num? n, [int? dp]) {
  final v = (n ?? 0).toDouble();
  final neg = v < 0;
  final abs = v.abs();
  String s;
  if (dp == null) {
    final r = (abs * 100).round() / 100;
    final parts = r.toStringAsFixed(2).split('.');
    final d = parts[1];
    s = _group(parts[0]) + (d == '00' ? '' : '.${d.replaceFirst(RegExp(r'0$'), '')}');
  } else {
    final parts = abs.toStringAsFixed(dp).split('.');
    s = _group(parts[0]) + (parts.length > 1 ? '.${parts[1]}' : '');
  }
  return (neg ? '-' : '') + s;
}

String naira(num? n, [int? dp]) {
  final v = (n ?? 0).toDouble();
  return '${v < 0 ? '-₦' : '₦'}${numFmt(v.abs(), dp)}';
}

String usd(num? n) {
  final v = (n ?? 0).toDouble();
  return '${v < 0 ? '-\$' : '\$'}${numFmt(v.abs(), 2)}';
}

/// ₦12k / ₦1.2m
String nairaCompact(num n) {
  final v = n.toDouble();
  if (v >= 1e6) return '₦${((v / 1e5).round() / 10).toString().replaceFirst(RegExp(r'\.0$'), '')}m';
  if (v >= 1e3) return '₦${(v / 1e3).round()}k';
  return '₦${v.round()}';
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const daysLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

String _pad(int n) => n.toString().padLeft(2, '0');
DateTime _d(int ms) => DateTime.fromMillisecondsSinceEpoch(ms);
int _wd(DateTime d) => d.weekday % 7; // 0 = Sunday like JS

int now() => DateTime.now().millisecondsSinceEpoch;

/// "25 Nov 2026"
String date(int ms) { final x = _d(ms); return '${x.day} ${months[x.month - 1]} ${x.year}'; }
/// "14:05"
String time(int ms) { final x = _d(ms); return '${_pad(x.hour)}:${_pad(x.minute)}'; }
/// "25 Nov 2026, 14:05"
String datetime(int ms) => '${date(ms)}, ${time(ms)}';
/// "Wed, 3 Dec"
String shortDay(int ms) { final x = _d(ms); return '${days[_wd(x)]}, ${x.day} ${months[x.month - 1]}'; }
/// "Wed, 3 Dec 2026"
String longDay(int ms) => '${shortDay(ms)} ${_d(ms).year}';
/// "Nov 2026"
String monthYear(int ms) { final x = _d(ms); return '${months[x.month - 1]} ${x.year}'; }
/// minutes-from-midnight → "07:35"
String hhmm(int mins) => '${_pad((mins ~/ 60) % 24)}:${_pad(mins % 60)}';
/// minutes → "2h 05m"
String dur(int mins) => '${mins ~/ 60}h ${_pad(mins % 60)}m';
/// "YYYY-MM-DD" (local)
String isoDay(int ms) { final x = _d(ms); return '${x.year}-${_pad(x.month)}-${_pad(x.day)}'; }
/// parse "YYYY-MM-DD" as local midnight
int parseDay(String s) {
  final p = s.split('-').map((e) => int.tryParse(e) ?? 1).toList();
  return DateTime(p[0], p.length > 1 ? p[1] : 1, p.length > 2 ? p[2] : 1).millisecondsSinceEpoch;
}
int startOfDay([int? ms]) { final x = _d(ms ?? now()); return DateTime(x.year, x.month, x.day).millisecondsSinceEpoch; }
int addDays(int ms, int n) { final x = _d(ms); return DateTime(x.year, x.month, x.day + n, x.hour, x.minute, x.second, x.millisecond).millisecondsSinceEpoch; }

String ago(int ms) {
  final s = ((now() - ms) / 1000).floor();
  if (s < 60) return 'just now';
  if (s < 3600) return '${s ~/ 60}m ago';
  if (s < 86400) return '${s ~/ 3600}h ago';
  if (s < 604800) return '${s ~/ 86400}d ago';
  return date(ms);
}

/// Today / Yesterday / "Wed, 3 Dec 2026"
String dayHeading(int ms) {
  final t = startOfDay();
  final s = startOfDay(ms);
  if (s == t) return 'Today';
  if (s == addDays(t, -1)) return 'Yesterday';
  return longDay(ms);
}

final _rnd = math.Random();
String _b36(int n) => n.toRadixString(36).toUpperCase();

/// Unique-ish reference, e.g. "TXM3K9AB12"
String ref([String p = 'AB']) {
  final r = List.generate(4, (_) => '0123456789abcdefghijklmnopqrstuvwxyz'[_rnd.nextInt(36)]).join().toUpperCase();
  return '$p${_b36(now())}$r';
}

String initials(String? a, [String? b]) {
  String f(String? s) => (s ?? '').trim().isEmpty ? '' : (s ?? '').trim()[0].toUpperCase();
  return f(a) + f(b);
}

/// initials from a phrase's first 2 alphanumeric words
String phraseInitials(String s) =>
    s.split(RegExp(r'[^A-Za-z0-9]+')).where((w) => w.isNotEmpty).take(2).map((w) => w[0].toUpperCase()).join();

String titleCase(String s) => s.toLowerCase().replaceAllMapped(RegExp(r'\b\w'), (m) => m[0]!.toUpperCase());

/// "7821443609" → "7821 4436 09"
String groupDigits(String s, [int size = 4]) {
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && i % size == 0) b.write(' ');
    b.write(s[i]);
  }
  return b.toString();
}

String capitalize(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
