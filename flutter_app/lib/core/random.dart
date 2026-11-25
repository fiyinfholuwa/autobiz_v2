/// Deterministic + random helpers — ported from mobile_app/src/lib/random.ts.
/// All 32-bit math is masked so results match the JS implementation exactly.
library;

import 'dart:math' as math;

const _m32 = 0xFFFFFFFF;
int _u32(int x) => x & _m32;
int _i32(int x) { x &= _m32; return x >= 0x80000000 ? x - 0x100000000 : x; }
int _imul(int a, int b) => _i32(((a & _m32) * (b & _m32)) & _m32);
int _ushr(int x, int n) => _u32(x) >> n;

/// bills/wallet hash: reduce((a*31 + charCode) >>> 0, seed 7)
int hash31(String s) {
  var a = 7;
  for (final c in s.codeUnits) { a = _u32(a * 31 + c); }
  return a;
}
T pickBy<T>(List<T> arr, String s) => arr[hash31(s) % arr.length];

/// FNV-1a 32-bit
int fnv1a(String s) {
  var h = 0x811c9dc5;
  for (final c in s.codeUnits) { h ^= c; h = _u32(_imul(h, 0x01000193)); }
  return _u32(h);
}

/// cyrb-style string hash (flights.js)
int cyrb(String str) {
  var h = _i32(1779033703 ^ str.length);
  for (final c in str.codeUnits) {
    h = _imul(h ^ c, 3432918353);
    h = _i32((h << 13) | _ushr(h, 19));
  }
  h = _imul(h ^ _ushr(h, 16), 2246822507);
  h = _imul(h ^ _ushr(h, 13), 3266489909);
  h = h ^ _ushr(h, 16);
  return _u32(h);
}

/// mulberry32 PRNG → () => [0,1)
double Function() mulberry32(int seed) {
  var a = _i32(seed);
  return () {
    a = _i32(a + 0x6d2b79f5);
    var t = _imul(a ^ _ushr(a, 15), 1 | a);
    t = _i32((t + _imul(t ^ _ushr(t, 7), 61 | t)) ^ t);
    return _u32(t ^ _ushr(t, 14)) / 4294967296;
  };
}

double Function() seeded(String seed) => mulberry32(fnv1a(seed));
double Function() seededCyrb(String seed) => mulberry32(cyrb(seed));

final _r = math.Random();
double rnd() => _r.nextDouble();
int rndInt(int a, int b, [double Function()? r]) => a + ((r ?? rnd)() * (b - a + 1)).floor();
String rndDigits(int n) => List.generate(n, (_) => _r.nextInt(10)).join();
const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
String rndCode(int n, [String alphabet = codeAlphabet, double Function()? r]) =>
    List.generate(n, (_) => alphabet[((r ?? rnd)() * alphabet.length).floor()]).join();

double round2(num n) => (n * 100).round() / 100;
double round100(num n) => ((n / 100).round() * 100).toDouble();
Future<void> sleep(int ms) => Future.delayed(Duration(milliseconds: ms));

const mockNames = ['Chinedu Okeke', 'Aisha Bello', 'Tunde Adeyemi', 'Ngozi Eze', 'Ibrahim Musa', 'Funke Akindele', 'Emeka Obi', 'Blessing Udo', 'Yusuf Lawal', 'Kemi Balogun'];
