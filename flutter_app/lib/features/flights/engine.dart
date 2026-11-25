/// Flights engine — deterministic mock flight generator + fare maths.
/// Port of mobile_app/src/features/flights/engine.ts (itself a port of assets/js/flights.js).
/// Uses the bit-identical cyrb/mulberry32 so the same route+date yields the same flights as the web/RN apps.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../data/catalog.dart';
import '../../store/models.dart';

const int dayMs = 86400000;

class CabinInfo { final String key, label, icon; final double mult; const CabinInfo(this.key, this.label, this.mult, this.icon); }

const cabins = [
  CabinInfo('Economy', 'Economy', 1, 'bi-person'),
  CabinInfo('Premium', 'Premium Economy', 1.65, 'bi-star'),
  CabinInfo('Business', 'Business', 2.9, 'bi-briefcase'),
  CabinInfo('First', 'First', 4.3, 'bi-gem'),
];
CabinInfo cabinOf(String k) => cabins.firstWhere((c) => c.key == k, orElse: () => cabins.first);

const Map<String, List<double>> coord = {
  'LOS': [6.577, 3.321], 'ABV': [9.007, 7.263], 'PHC': [5.015, 6.95], 'KAN': [12.048, 8.524], 'ENU': [6.474, 7.562], 'QOW': [5.427, 7.206],
  'ACC': [5.605, -0.167], 'NBO': [-1.319, 36.928], 'JNB': [-26.139, 28.246], 'DXB': [25.253, 55.366], 'LHR': [51.47, -0.454],
  'JFK': [40.641, -73.778], 'IAH': [29.99, -95.336], 'YYZ': [43.678, -79.625], 'CDG': [49.01, 2.548], 'IST': [41.275, 28.752],
  'DOH': [25.273, 51.608], 'ADD': [8.977, 38.799],
};

const _ng = ['P4', 'W3', 'VK', 'UN', 'IBM'];
const _intl = ['EK', 'BA', 'TK', 'ET', 'QR', 'KQ', 'AF'];
const Map<String, ({String code, String city})> hubs = {
  'EK': (code: 'DXB', city: 'Dubai'), 'QR': (code: 'DOH', city: 'Doha'), 'TK': (code: 'IST', city: 'Istanbul'), 'ET': (code: 'ADD', city: 'Addis Ababa'),
  'KQ': (code: 'NBO', city: 'Nairobi'), 'AF': (code: 'CDG', city: 'Paris'), 'BA': (code: 'LHR', city: 'London'),
};
const Map<String, double> _alF = {'P4': 1, 'W3': 0.97, 'VK': 0.9, 'UN': 0.93, 'IBM': 1.08, 'EK': 1.14, 'BA': 1.2, 'TK': 0.97, 'ET': 0.9, 'QR': 1.12, 'KQ': 0.94, 'AF': 1.1};

const Map<String, String> countryIso = {'Nigeria': 'ng', 'Ghana': 'gh', 'Kenya': 'ke', 'South Africa': 'za', 'UAE': 'ae', 'United Kingdom': 'gb', 'United States': 'us', 'Canada': 'ca', 'France': 'fr', 'Turkey': 'tr'};

String cityOf(String code) {
  final a = airportByCode(code);
  if (a != null) return a.city;
  for (final h in hubs.values) { if (h.code == code) return h.city; }
  return code;
}
String airportName(String code) => airportByCode(code)?.name ?? '${cityOf(code)} Intl';
bool isNigeria(String code) => airportByCode(code)?.country == 'Nigeria';
String airlineName(String code) => airlineByCode(code)?.name ?? code;
Color airlineColor(String code) { final a = airlineByCode(code); return a != null ? Color(a.color) : const Color(0xFF299D91); }
String flagFor(String code) => countryIso[airportByCode(code)?.country ?? ''] ?? '';

double dist(String a, String b) {
  final A = coord[a], B = coord[b];
  if (A == null || B == null) return 3000;
  const r = 6371.0, rad = math.pi / 180;
  final dLat = (B[0] - A[0]) * rad, dLon = (B[1] - A[1]) * rad;
  final h = math.pow(math.sin(dLat / 2), 2) + math.cos(A[0] * rad) * math.cos(B[0] * rad) * math.pow(math.sin(dLon / 2), 2);
  return 2 * r * math.asin(math.sqrt(h));
}

final _cache = <String, List<Flight>>{};

class _Cand { final String al; final String? via; const _Cand(this.al, this.via); }

List<Flight> generateFlights(String from, String to, String date) {
  final key = '$from-$to-$date';
  final hit = _cache[key];
  if (hit != null) return hit;
  final r = mulberry32(cyrb(key));
  int rint(int a, int b) => a + (r() * (b - a + 1)).floor();
  final D = dist(from, to);
  final domestic = isNigeria(from) && isNigeria(to);

  var cands = <_Cand>[];
  if (domestic) {
    cands = _ng.map((al) => _Cand(al, null)).toList();
  } else {
    for (final al in _intl) {
      final hub = hubs[al]!.code;
      if (hub == from || hub == to) {
        cands.add(_Cand(al, null));
      } else if ((dist(from, hub) + dist(hub, to)) / D < 1.6) {
        cands.add(_Cand(al, hub));
      }
    }
    if (isNigeria(from) || isNigeria(to)) {
      if (D < 7000) cands.add(const _Cand('P4', null));
      if (D < 3000) cands.add(const _Cand('W3', null));
    }
    if (cands.isEmpty) cands = _intl.map((al) => _Cand(al, hubs[al]!.code)).toList();
  }

  final n = domestic ? rint(8, 12) : rint(6, 10);
  final dt = f.parseDay(date);
  final days = ((dt - f.startOfDay()) / dayMs).round();
  final wd = DateTime.fromMillisecondsSinceEpoch(dt).weekday % 7;
  final dateF = (days < 3 ? 1.22 : days < 7 ? 1.1 : days < 21 ? 1.0 : 0.93) * (wd == 5 || wd == 0 ? 1.06 : 1.0);
  final offset = rint(0, cands.length - 1);
  final used = <String>{};
  final out = <Flight>[];

  for (var i = 0; i < n; i++) {
    final cand = i < cands.length ? cands[(i + offset) % cands.length] : cands[rint(0, cands.length - 1)];
    var via = cand.via;
    if (domestic) {
      final roll = r();
      if (roll < 0.15) {
        via = from != 'ABV' && to != 'ABV' ? 'ABV' : from != 'LOS' && to != 'LOS' ? 'LOS' : null;
      }
    }
    var dep = rint(66, 264) * 5;
    for (var k = 0; k < 20 && used.contains('${cand.al}$dep'); k++) { dep = rint(66, 264) * 5; }
    used.add('${cand.al}$dep');
    final num = rint(100, 979);
    final lay = via != null ? rint(14, 50) * 5 : 0;
    final pts = via != null ? [from, via, to] : [from, to];
    final segments = <FlightSegment>[];
    var t = dep;
    for (var j = 0; j < pts.length - 1; j++) {
      final mins = ((dist(pts[j], pts[j + 1]) / 790 * 60 + 32) / 5).round() * 5;
      segments.add(FlightSegment(from: pts[j], to: pts[j + 1], fromCity: cityOf(pts[j]), toCity: cityOf(pts[j + 1]), dep: t, arr: t + mins, mins: mins, flightNo: '${cand.al} ${num + j * 2}'));
      t += mins + (j < pts.length - 2 ? lay : 0);
    }
    final arr = segments.last.arr;
    final base = domestic ? 42000 + D * 92 : 185000 + D * 108;
    final peak = (dep >= 360 && dep < 540) || (dep >= 1020 && dep < 1200) ? 1.08 : 1.0;
    final price = round100(base * (_alF[cand.al] ?? 1) * (via != null ? 0.86 : 1) * (0.86 + r() * 0.38) * peak * dateF);
    final refundable = r() < 0.38;
    final seatsLeft = rint(2, 14);
    out.add(Flight(
      id: '${cand.al}$num-$from$to-$date', airline: cand.al, flightNo: '${cand.al} $num', from: from, to: to, date: date,
      dep: dep, arr: arr, duration: arr - dep, stops: via != null ? 1 : 0, via: via != null ? (code: via, city: cityOf(via)) : null,
      segments: segments, layover: lay, price: price, refundable: refundable, seatsLeft: seatsLeft, domestic: domestic,
    ));
  }
  out.sort((a, b) => a.dep.compareTo(b.dep));
  _cache[key] = out;
  return out;
}

double fareFor(Flight fl, String cabin) => round100(fl.price * cabinOf(cabin).mult);
bool refundableFor(Flight fl, String cabin) => fl.refundable || cabin == 'Business' || cabin == 'First';

class Pax {
  final int adults, children, infants;
  const Pax({this.adults = 1, this.children = 0, this.infants = 0});
  Pax copyWith({int? adults, int? children, int? infants}) => Pax(adults: adults ?? this.adults, children: children ?? this.children, infants: infants ?? this.infants);
  int get total => adults + children + infants;
  int get seated => adults + children;
}

class PaxFare { final double adult, child, infant, total; const PaxFare(this.adult, this.child, this.infant, this.total); }
PaxFare paxFare(double fare, Pax pax) {
  final child = round100(fare * 0.75), infant = round100(fare * 0.1);
  return PaxFare(fare, child, infant, fare * pax.adults + child * pax.children + infant * pax.infants);
}

({String hold, String cabinBag}) baggage(Flight fl, String cabin) {
  final hold = fl.domestic
      ? const {'Economy': '1 × 20kg', 'Premium': '1 × 25kg', 'Business': '2 × 30kg', 'First': '2 × 32kg'}[cabin]!
      : const {'Economy': '2 × 23kg', 'Premium': '2 × 23kg', 'Business': '2 × 32kg', 'First': '3 × 32kg'}[cabin]!;
  return (hold: hold, cabinBag: cabin == 'Economy' ? '1 × 7kg' : '2 × 7kg');
}

double cheapest(String from, String to, String date, String cabin) {
  final list = generateFlights(from, to, date);
  return list.map((x) => fareFor(x, cabin)).reduce(math.min);
}

int nextDay(int mins) => mins ~/ 1440;
String today() => f.isoDay(f.now());
String plusDays(String iso, int n) => f.isoDay(f.addDays(f.parseDay(iso), n));

/// Seeded RNG for UI artefacts (gates, seats, barcodes).
double Function() seed(String s) => mulberry32(cyrb(s));

/* ---------------- Seats ---------------- */
class SeatLayout { final List<String> cols; final String aisleAfter; final List<int> rows, extra; final bool wide; const SeatLayout(this.cols, this.aisleAfter, this.rows, this.extra, this.wide); }
List<int> _range(int a, int b) => List.generate(b - a + 1, (i) => a + i);
SeatLayout seatLayout(String cabin) {
  if (cabin == 'Business') return SeatLayout(const ['A', 'C', 'D', 'F'], 'C', _range(3, 8), const [], true);
  if (cabin == 'First') return SeatLayout(const ['A', 'C', 'D', 'F'], 'C', _range(1, 3), const [], true);
  if (cabin == 'Premium') return SeatLayout(const ['A', 'B', 'C', 'D', 'E', 'F'], 'C', _range(9, 13), const [9], false);
  return SeatLayout(const ['A', 'B', 'C', 'D', 'E', 'F'], 'C', _range(12, 32), const [12, 20, 21], false);
}
Set<String> takenSeats(Flight fl, String cabin) {
  final l = seatLayout(cabin);
  final r = seed('${fl.id}|seats');
  final set = <String>{};
  for (final row in l.rows) {
    for (final col in l.cols) { if (r() < 0.4) set.add('$row$col'); }
  }
  return set;
}
double extraLegroomPrice(bool intl) => intl ? 22000 : 6000;

/* ---------------- Gate / boarding ---------------- */
String gateFor(Flight fl) {
  final a = seed('${fl.id}g')(), b = seed('${fl.id}n')();
  return '${'ABCDEF'[(a * 6).floor()]}${1 + (b * 24).floor()}';
}
int boardingTime(Flight fl) => (((fl.dep - (fl.domestic ? 30 : 45)) % 1440) + 1440) % 1440;
