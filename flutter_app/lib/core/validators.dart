/// Validators — ported from mobile_app/src/lib/validators.ts.
library;

bool isEmail(String s) => RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$').hasMatch(s.trim());
String normPhone(String s) => s.replaceAll(RegExp(r'[\s()-]'), '');
/// Accepts 0803…, +234803…, 234803…
bool isPhone(String s) => RegExp(r'^(\+?234|0)[789][01]\d{8}$').hasMatch(normPhone(s));
/// Strict 11-digit local format
bool isLocalPhone(String s) => RegExp(r'^0[789][01]\d{8}$').hasMatch(s.replaceAll(RegExp(r'\s'), ''));
String toLocalPhone(String s) => normPhone(s).replaceFirst(RegExp(r'^\+?234'), '0');
String digitsOnly(String s) => s.replaceAll(RegExp(r'\D'), '');

class Strength {
  final int score;
  final String label;
  /// tone key: danger | warning | cyan | success
  final String tone;
  final bool len, upper, digit, symbol;
  const Strength(this.score, this.label, this.tone, this.len, this.upper, this.digit, this.symbol);
}

Strength passwordStrength(String p) {
  final len = p.length >= 8, upper = RegExp('[A-Z]').hasMatch(p), digit = RegExp(r'\d').hasMatch(p), symbol = RegExp('[^A-Za-z0-9]').hasMatch(p);
  var score = p.isEmpty ? 0 : [len, upper, digit, symbol].where((x) => x).length;
  if (p.length >= 12 && score >= 3) score = 4;
  const map = [['Too weak', 'danger'], ['Weak', 'danger'], ['Fair', 'warning'], ['Good', 'cyan'], ['Strong', 'success']];
  return Strength(score, map[score][0], map[score][1], len, upper, digit, symbol);
}

const weakPins = ['0000', '1111', '1234', '4321', '2222', '9999', '1212'];
bool isSequentialOrRepeated(String pin) =>
    RegExp(r'^(\d)\1+$').hasMatch(pin) || '0123456789'.contains(pin) || '9876543210'.contains(pin);
