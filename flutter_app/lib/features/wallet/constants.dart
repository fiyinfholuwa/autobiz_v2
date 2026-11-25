/// Wallet constants & helpers — ported from mobile_app/src/features/wallet/{constants,receipt}.ts.
library;

import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../data/catalog.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const double buyRate = usdRate;
const double sellRate = usdRate - 30;

const banks = <(String, int)>[
  ('Access Bank', 0xFFF47B20), ('Ecobank', 0xFF004C97), ('Fidelity Bank', 0xFF1B3C87),
  ('First Bank', 0xFF003B65), ('FCMB', 0xFF5C2D91), ('GTBank', 0xFFE04F1A),
  ('Jaiz Bank', 0xFF0A6B3A), ('Keystone Bank', 0xFF004B8D), ('Kuda MFB', 0xFF40196D),
  ('Moniepoint MFB', 0xFF0357EE), ('OPay', 0xFF1DCF9F), ('PalmPay', 0xFF6C2BD9),
  ('Polaris Bank', 0xFF7B2481), ('Providus Bank', 0xFFE5A823), ('Stanbic IBTC', 0xFF0033A1),
  ('Sterling Bank', 0xFFD81F26), ('UBA', 0xFFD42E12), ('Union Bank', 0xFF00A3E0),
  ('Wema Bank', 0xFF7B1C6D), ('Zenith Bank', 0xFFE30613),
];

Color bankColor(String name) {
  for (final b in banks) { if (b.$1 == name) return Color(b.$2); }
  return const Color(0xFF2348FF);
}

String bankAbbr(String name) {
  final words = name.replaceFirst(RegExp(r' (Bank|MFB)$'), '').split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
  final s = words.map((w) => w[0]).join();
  return (s.length > 3 ? s.substring(0, 3) : s).toUpperCase();
}

const accountNames = ['CHINEDU OKEKE', 'AISHA BELLO', 'TUNDE ADEYEMI', 'NGOZI EZE', 'IBRAHIM MUSA', 'FUNKE ADEBAYO', 'EMEKA OBI', 'BLESSING UDO', 'YUSUF LAWAL', 'KEMI BALOGUN'];
const knownUsers = {'chinedu': 'Chinedu Okeke', 'aisha': 'Aisha Bello', 'tunde': 'Tunde Adeyemi', 'ngozi': 'Ngozi Eze', 'emeka': 'Emeka Obi', 'kemi': 'Kemi Balogun'};
String nameFor(String seed) => accountNames[hash31(seed) % accountNames.length];

class TierLimit {
  final double daily, single, maxBal;
  final String? next;
  const TierLimit(this.daily, this.single, this.maxBal, this.next);
  bool get unlimited => maxBal.isInfinite;
}

const tierLimits = {
  'Tier 1': TierLimit(50000, 20000, 300000, 'Tier 2'),
  'Tier 2': TierLimit(200000, 100000, 500000, 'Tier 3'),
  'Tier 3': TierLimit(5000000, 2000000, double.infinity, null),
};
TierLimit tierLimit(String? tier) => tierLimits[tier ?? 'Tier 1'] ?? tierLimits['Tier 1']!;

double usedToday() {
  final t = f.startOfDay();
  return store.transactions.where((x) => x.date >= t && x.direction == 'out' && x.status != 'failed').fold(0.0, (a, x) => a + x.amount);
}

/// Returns an error message if x breaks the tier's single/daily limit.
String? checkLimit(double x) {
  final l = tierLimit(store.user.tier);
  final used = usedToday();
  if (x > l.single) return 'Single transaction limit for ${store.user.tier} is ${f.naira(l.single)}';
  if (used + x > l.daily) return 'This exceeds your daily limit (${f.naira(l.daily - used < 0 ? 0 : l.daily - used)} left today)';
  return null;
}

double withdrawFee(double a) => a <= 50000 ? 25 : 50;

/// Wallet receipt (web: mkReceipt) — appends Reference + Date, single "Copy receipt" action.
void walletReceipt(String title, String message, List<SRow> rows, Tx tx) {
  final all = [...rows, SRow('Reference', tx.ref ?? tx.id), SRow('Date', f.datetime(tx.date))];
  success(SuccessOpts(
    title: title,
    message: message,
    rows: all,
    actions: [SuccessAction('Copy receipt', () => copyText(receiptText(title, all), 'Receipt copied'), icon: 'bi-copy', keepOpen: true)],
  ));
}
