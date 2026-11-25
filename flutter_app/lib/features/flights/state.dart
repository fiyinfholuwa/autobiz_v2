/// Session state for search → results → booking (not persisted, like the web page state).
/// Port of mobile_app/src/features/flights/{state,pricing,search}.ts.
library;

import 'package:flutter/foundation.dart';

import '../../core/random.dart';
import '../../store/app_store.dart';
import '../../ui/overlay.dart';
import 'engine.dart';

class Leg {
  String from, to, date;
  Leg({this.from = '', this.to = '', this.date = ''});
  Leg copy() => Leg(from: from, to: to, date: date);
}

class SearchForm {
  /// oneway | round | multi
  String trip;
  List<Leg> legs; // always 2
  String ret;
  Pax pax;
  String cabin;
  SearchForm({required this.trip, required this.legs, required this.ret, required this.pax, required this.cabin});
  SearchForm copy() => SearchForm(trip: trip, legs: legs.map((l) => l.copy()).toList(), ret: ret, pax: pax, cabin: cabin);
}

SearchForm defaultForm() {
  final t1 = plusDays(today(), 1);
  return SearchForm(trip: 'oneway', legs: [Leg(from: 'LOS', date: t1), Leg(date: plusDays(t1, 3))], ret: plusDays(t1, 7), pax: const Pax(), cabin: 'Economy');
}

class ActiveSearch {
  final String trip;
  final List<Leg> legs;
  final Pax pax;
  final String cabin;
  ActiveSearch({required this.trip, required this.legs, required this.pax, required this.cabin});
  ActiveSearch withLegs(List<Leg> l) => ActiveSearch(trip: trip, legs: l, pax: pax, cabin: cabin);
}

class DraftLeg { final String from, to, date; final Flight flight; DraftLeg(this.from, this.to, this.date, this.flight); }

class BookingDraft {
  int step = 0, maxStep = 0;
  final String trip, cabin;
  final Pax pax;
  final List<DraftLeg> legs;
  final List<Passenger> travellers;
  String email, phone;
  Map<String, ({String seat, double price})> seats = {};
  int seatLeg = 0, seatPax = 0;
  bool seatsSkipped = false;
  int bags = 0;
  bool insurance = false, priority = false, agree = false;
  BookingDraft({required this.trip, required this.cabin, required this.pax, required this.legs, required this.travellers, required this.email, required this.phone});
}

class FlightsState extends ChangeNotifier {
  SearchForm form = defaultForm();
  ActiveSearch? search;
  int legIdx = 0;
  List<Flight> picks = [];
  BookingDraft? booking;

  void changed() => notifyListeners();
  void update(void Function() fn) { fn(); notifyListeners(); }
}

final flights = FlightsState();

/// Freeze the form into an active search (round trip → 2 legs).
ActiveSearch buildSearch(SearchForm f) {
  final l0 = f.legs[0];
  final legs = f.trip == 'round'
      ? [l0.copy(), Leg(from: l0.to, to: l0.from, date: f.ret)]
      : f.trip == 'multi'
          ? [f.legs[0].copy(), f.legs[1].copy()]
          : [l0.copy()];
  return ActiveSearch(trip: f.trip, legs: legs, pax: f.pax, cabin: f.cabin);
}

BookingDraft startBooking(ActiveSearch search, List<Flight> picks) {
  final u = store.user;
  final travellers = <Passenger>[];
  void add(String type, int n, String name) {
    for (var i = 1; i <= n; i++) { travellers.add(Passenger(type: type, label: '$name $i', expiry: '')); }
  }
  add('adult', search.pax.adults, 'Adult');
  add('child', search.pax.children, 'Child');
  add('infant', search.pax.infants, 'Infant');
  return BookingDraft(
    trip: search.trip, cabin: search.cabin, pax: search.pax,
    legs: [for (var i = 0; i < search.legs.length; i++) DraftLeg(search.legs[i].from, search.legs[i].to, picks[i].date, picks[i])],
    travellers: travellers, email: u.email, phone: u.phone,
  );
}

/* ---------------- Pricing ---------------- */
double bagPrice(bool intl) => intl ? 48000 : 12000;
double insPrice(bool intl) => intl ? 14500 : 2500;
const double prioPrice = 3500;

class Totals {
  final bool intl, refundable;
  final List<PaxFare> legFares;
  final double fare, taxes, base, seats, bags, insurance, priority, total;
  final int travellers, seated;
  Totals(this.intl, this.legFares, this.fare, this.taxes, this.base, this.seats, this.bags, this.insurance, this.priority, this.total, this.refundable, this.travellers, this.seated);
}

Totals bookingTotals(BookingDraft b) {
  final intl = b.legs.any((l) => !l.flight.domestic);
  final legFares = b.legs.map((l) => paxFare(fareFor(l.flight, b.cabin), b.pax)).toList();
  final fare = legFares.fold<double>(0, (a, x) => a + x.total);
  final taxes = round100(fare * 0.18);
  final base = fare - taxes;
  final seats = b.seats.values.fold<double>(0, (a, s) => a + s.price);
  final bags = b.bags * bagPrice(intl) * b.legs.length;
  final travellers = b.pax.total, seated = b.pax.seated;
  final insurance = b.insurance ? insPrice(intl) * travellers : 0.0;
  final priority = b.priority ? prioPrice * seated * b.legs.length : 0.0;
  final total = fare + seats + bags + insurance + priority;
  final refundable = b.legs.every((l) => refundableFor(l.flight, b.cabin));
  return Totals(intl, legFares, fare, taxes, base, seats, bags, insurance, priority, total, refundable, travellers, seated);
}

String routeString(List<({String from, String to})> legs, String trip) {
  if (trip == 'round') return '${legs[0].from} ⇄ ${legs[0].to}';
  return [...legs.map((l) => l.from), legs.last.to].join(' → ');
}
List<({String from, String to})> draftRoute(BookingDraft b) => b.legs.map((l) => (from: l.from, to: l.to)).toList();
List<({String from, String to})> bookingRoute(Booking b) => b.legs.map((l) => (from: l.from, to: l.to)).toList();

/* ---------------- Search validation ---------------- */
Map<String, String> validateSearch(SearchForm f) {
  final e = <String, String>{};
  final t = today();
  final max = plusDays(t, 330);
  final n = f.trip == 'multi' ? 2 : 1;
  for (var i = 0; i < n; i++) {
    final l = f.legs[i];
    if (l.from.isEmpty) e['from$i'] = 'Choose a departure airport';
    if (l.to.isEmpty) {
      e['to$i'] = 'Choose a destination airport';
    } else if (l.from == l.to) {
      e['to$i'] = 'Destination must differ from origin';
    }
    if (l.date.isEmpty) {
      e['date$i'] = 'Pick a departure date';
    } else if (l.date.compareTo(t) < 0) {
      e['date$i'] = "Date can't be in the past";
    } else if (l.date.compareTo(max) > 0) {
      e['date$i'] = 'Bookings open 330 days ahead';
    }
  }
  if (f.trip == 'round') {
    if (f.ret.isEmpty) {
      e['ret'] = 'Pick a return date';
    } else if (f.ret.compareTo(f.legs[0].date) < 0) {
      e['ret'] = 'Return must be on/after departure';
    }
  }
  if (f.trip == 'multi' && !e.containsKey('date1') && f.legs[1].date.compareTo(f.legs[0].date) < 0) e['date1'] = 'Flight 2 must be on/after flight 1';
  return e;
}

/// Validates and freezes the search. Returns errors (empty → caller navigates to results).
Map<String, String> runSearch(SearchForm f) {
  final e = validateSearch(f);
  if (e.isNotEmpty) { toast('Please fix the highlighted fields', type: ToastType.warning); return e; }
  flights.update(() { flights.search = buildSearch(f); flights.legIdx = 0; flights.picks = []; flights.booking = null; });
  return {};
}
