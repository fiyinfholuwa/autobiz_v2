import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart' as f;
import '../../features/flights/components.dart';
import '../../features/flights/engine.dart';
import '../../features/flights/state.dart';
import '../../store/models.dart';
import '../../ui/ui.dart';

class _TimeBand { final String id, label, sub, icon; final bool Function(int) test; const _TimeBand(this.id, this.label, this.sub, this.icon, this.test); }

final _times = [
  _TimeBand('early', 'Early', '00–06', 'ion:moon-outline', (m) => m < 360),
  _TimeBand('morning', 'Morning', '06–12', 'ion:partly-sunny-outline', (m) => m >= 360 && m < 720),
  _TimeBand('afternoon', 'Afternoon', '12–18', 'ion:sunny-outline', (m) => m >= 720 && m < 1080),
  _TimeBand('evening', 'Evening', '18–24', 'ion:cloudy-night-outline', (m) => m >= 1080),
];

class _Filters {
  Set<int> stops = {};
  Set<String> times = {}, airlines = {};
  double? maxPrice;
  bool refundable = false;
}

/// Route: /flights/results
class FlightResultsScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const FlightResultsScreen({super.key, this.q = const {}});
  @override
  State<FlightResultsScreen> createState() => _FlightResultsScreenState();
}

class _FlightResultsScreenState extends State<FlightResultsScreen> {
  bool loading = true;
  String sort = 'best';
  _Filters filters = _Filters();
  String _key = '';
  Timer? _t;

  @override
  void initState() {
    super.initState();
    flights.addListener(_onState);
    _onState();
  }

  @override
  void dispose() {
    flights.removeListener(_onState);
    _t?.cancel();
    super.dispose();
  }

  /// Reload (skeleton + reset filters) whenever the active leg changes.
  void _onState() {
    final s = flights.search;
    if (s == null || flights.legIdx >= s.legs.length) { if (mounted) setState(() {}); return; }
    final leg = s.legs[flights.legIdx];
    final key = '${leg.from}-${leg.to}-${leg.date}-${flights.legIdx}';
    if (key != _key) {
      _key = key;
      loading = true;
      filters = _Filters();
      _t?.cancel();
      _t = Timer(const Duration(milliseconds: 900), () { if (mounted) setState(() => loading = false); });
    }
    if (mounted) setState(() {});
  }

  void _back() {
    if (flights.legIdx > 0) {
      flights.update(() { flights.legIdx -= 1; flights.picks = flights.picks.take(flights.legIdx).toList(); });
    } else {
      goBack(context, '/flights');
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final search = flights.search;
    final legIdx = flights.legIdx;
    if (search == null || legIdx >= search.legs.length) {
      return AppScreen(
        header: const AppHeader(title: 'Flights', fallback: '/flights'),
        children: [EmptyState(icon: 'bi-airplane', title: 'Start a new search', message: 'Pick your route and dates to see available flights.', action: 'Search flights', onAction: () => context.go('/flights'))],
      );
    }
    final leg = search.legs[legIdx];
    final picks = flights.picks;
    final cabin = search.cabin;
    final pax = search.pax;
    final travellers = pax.total;
    final all = generateFlights(leg.from, leg.to, leg.date);
    final fares = all.map((x) => fareFor(x, cabin)).toList();
    final minFare = fares.reduce(math.min), maxFare = fares.reduce(math.max);
    final minDur = all.map((x) => x.duration).reduce(math.min);
    double score(Flight x) => fareFor(x, cabin) / minFare + 0.8 * (x.duration / minDur) + 0.25 * x.stops;
    int byCheap(Flight a, Flight b) { final d = fareFor(a, cabin).compareTo(fareFor(b, cabin)); return d != 0 ? d : a.duration - b.duration; }
    int byFast(Flight a, Flight b) { final d = a.duration - b.duration; return d != 0 ? d : fareFor(a, cabin).compareTo(fareFor(b, cabin)); }
    int byBest(Flight a, Flight b) => score(a).compareTo(score(b));
    final cheapestF = ([...all]..sort(byCheap)).first;
    final fastestF = ([...all]..sort(byFast)).first;
    final bestF = ([...all]..sort(byBest)).first;
    ({String label, String tone})? tagFor(Flight x) => x.id == cheapestF.id
        ? (label: 'Cheapest', tone: 'success')
        : x.id == fastestF.id
            ? (label: 'Fastest', tone: 'cyan')
            : x.id == bestF.id
                ? (label: 'Best value', tone: 'primary')
                : null;

    final filtered = all.where((x) {
      final fare = fareFor(x, cabin);
      if (filters.stops.isNotEmpty && !filters.stops.contains(x.stops)) return false;
      if (filters.times.isNotEmpty && !_times.where((t) => filters.times.contains(t.id)).any((t) => t.test(x.dep))) return false;
      if (filters.maxPrice != null && fare > filters.maxPrice!) return false;
      if (filters.airlines.isNotEmpty && !filters.airlines.contains(x.airline)) return false;
      if (filters.refundable && !refundableFor(x, cabin)) return false;
      return true;
    }).toList();
    final list = [...filtered]..sort(sort == 'cheapest' ? byCheap : sort == 'fastest' ? byFast : byBest);
    final activeCount = filters.stops.length + filters.airlines.length + filters.times.length + (filters.refundable ? 1 : 0) + (filters.maxPrice != null && filters.maxPrice! < maxFare ? 1 : 0);

    final multi = search.legs.length > 1;
    final stepLabel = !multi ? 'Select your flight' : search.trip == 'round' ? (legIdx == 0 ? 'Step 1 of 2 · Select outbound' : 'Step 2 of 2 · Select return') : 'Flight ${legIdx + 1} of 2 · Select flight';

    void setLegDate(String date) {
      final legs = search.legs.map((l) => l.copy()).toList();
      legs[legIdx].date = date;
      for (var i = legIdx + 1; i < legs.length; i++) { if (legs[i].date.compareTo(legs[i - 1].date) < 0) legs[i].date = legs[i - 1].date; }
      flights.update(() {
        flights.search = search.withLegs(legs);
        final fm = flights.form;
        if (search.trip == 'round') { fm.legs[0].date = legs[0].date; fm.ret = legs[1].date; }
        else { for (var i = 0; i < legs.length; i++) { fm.legs[i].date = legs[i].date; } }
      });
    }

    void select(Flight x) {
      final newPicks = [...picks.take(legIdx), x];
      if (legIdx < search.legs.length - 1) {
        final legs = search.legs.map((l) => l.copy()).toList();
        if (legs[legIdx + 1].date.compareTo(x.date) < 0) legs[legIdx + 1].date = x.date;
        flights.update(() { flights.picks = newPicks; flights.legIdx = legIdx + 1; flights.search = search.withLegs(legs); });
        toast(search.trip == 'round' ? 'Outbound selected. Now choose your return flight.' : 'Flight 1 selected. Now choose your second flight.');
      } else {
        flights.update(() { flights.picks = newPicks; flights.booking = startBooking(search, newPicks); });
        context.push('/flights/book');
      }
    }

    final minDate = legIdx > 0 ? search.legs[legIdx - 1].date : today();
    final strip = [-3, -2, -1, 0, 1, 2, 3].map((d) {
      final date = plusDays(leg.date, d);
      final disabled = date.compareTo(minDate) < 0;
      return (date: date, disabled: disabled, price: disabled ? 0.0 : cheapest(leg.from, leg.to, date, cabin));
    }).toList();
    final enabled = strip.where((s) => !s.disabled).map((s) => s.price);
    final lowest = enabled.isEmpty ? 0.0 : enabled.reduce(math.min);

    return PopScope(
      canPop: legIdx == 0,
      onPopInvokedWithResult: (didPop, _) { if (!didPop) _back(); },
      child: AppScreen(
        header: AppHeader(
          title: '${cityOf(leg.from)} → ${cityOf(leg.to)}',
          subtitle: '${f.longDay(f.parseDay(leg.date))} · $travellers traveller${travellers > 1 ? 's' : ''} · ${cabinOf(cabin).label}',
          onBack: _back,
          actions: [IconBtn('bi-sliders', tooltip: 'Filters', badge: activeCount > 0 ? activeCount : null, onPressed: () => _openFilters(all, cabin, minFare, maxFare))],
        ),
        children: [
          Row(children: [
            Expanded(child: AppText(stepLabel, v: TV.label, color: c.primary)),
            GestureDetector(onTap: () => context.go('/flights'), child: AppText('Modify search', v: TV.sm, weight: FontWeight.w700, color: c.primary)),
          ]),
          const SizedBox(height: 10),
          for (var i = 0; i < legIdx && i < picks.length; i++)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: c.successSoft, borderRadius: BorderRadius.circular(R.lg)),
              child: Row(children: [
                AppIcon('bi-check-circle-fill', size: 20, color: c.success),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  AppText('${search.trip == 'round' ? 'Outbound' : 'Flight ${i + 1}'} selected · ${f.shortDay(f.parseDay(picks[i].date))}', v: TV.sm, weight: FontWeight.w700, color: c.success),
                  AppText('${picks[i].from} ${f.hhmm(picks[i].dep)} → ${picks[i].to} ${f.hhmm(picks[i].arr)} · ${airlineName(picks[i].airline)} · ${f.naira(fareFor(picks[i], cabin))}', v: TV.xs, muted: true),
                ])),
                const SizedBox(width: 8),
                Btn('Change', size: BtnSize.sm, variant: BtnVariant.outline, onPressed: () => flights.update(() { flights.legIdx = i; flights.picks = picks.take(i).toList(); })),
              ]),
            ),
          SizedBox(
            height: 66,
            child: ListView(
              scrollDirection: Axis.horizontal,
              clipBehavior: Clip.none,
              children: [
                for (final s in strip)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Opacity(
                      opacity: s.disabled ? 0.4 : 1,
                      child: Material(
                        color: s.date == leg.date ? c.primary : c.surface,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.lg), side: BorderSide(color: s.date == leg.date ? c.primary : c.border)),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(R.lg),
                          onTap: s.disabled ? null : () => setLegDate(s.date),
                          child: SizedBox(
                            width: 92,
                            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                              AppText(f.shortDay(f.parseDay(s.date)), v: TV.xs, weight: FontWeight.w600, color: s.date == leg.date ? Colors.white : c.muted),
                              const SizedBox(height: 2),
                              AppText(s.disabled ? '—' : f.naira(s.price), v: TV.sm, weight: FontWeight.w700, tabular: true, color: s.date == leg.date ? Colors.white : s.price == lowest ? c.success : c.text),
                            ]),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (loading) ...[
            Row(children: [AppIcon('ion:airplane', size: 16, color: c.primary), const SizedBox(width: 8), const AppText('Searching 12 airlines…', v: TV.sm, muted: true)]),
            const SizedBox(height: 12),
            for (var i = 0; i < 4; i++)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(R.xl)),
                child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [Skeleton(w: 36, h: 36, r: 10), SizedBox(width: 10), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Skeleton(w: 140), SizedBox(height: 6), Skeleton(w: 80, h: 10)]))]),
                  SizedBox(height: 12),
                  Skeleton(h: 34),
                  SizedBox(height: 12),
                  Skeleton(w: 180, h: 12),
                ]),
              ),
          ] else ...[
            Segment<String>(
              small: true,
              value: sort,
              onChanged: (v) => setState(() => sort = v),
              options: [
                SegOption('cheapest', 'Cheapest · ${f.naira(fareFor(cheapestF, cabin))}'),
                SegOption('fastest', 'Fastest · ${f.dur(fastestF.duration)}'),
                const SegOption('best', 'Best'),
              ],
            ),
            const SizedBox(height: 8),
            AppText('${list.length} flight${list.length == 1 ? '' : 's'} found${list.length != all.length ? ' (of ${all.length})' : ''} · prices per adult, incl. taxes', v: TV.xs, muted: true),
            const SizedBox(height: 12),
            if (list.isEmpty)
              EmptyState(icon: 'bi-funnel', title: 'No flights match your filters', message: 'Try widening your price range or removing a filter.', action: 'Clear filters', onAction: () => setState(() => filters = _Filters()))
            else
              for (final x in list)
                FlightCard(key: ValueKey(x.id), fl: x, cabin: cabin, travellers: travellers, totalFor: paxFare(fareFor(x, cabin), pax).total, tag: tagFor(x), onSelect: () => select(x)),
          ],
        ],
      ),
    );
  }

  void _openFilters(List<Flight> all, String cabin, double minFare, double maxFare) {
    showSheet(_FilterSheet(
      all: all, cabin: cabin, minFare: minFare, maxFare: maxFare, filters: filters,
      onChanged: (nf) => setState(() => filters = nf),
      countFor: (nf) => all.where((x) {
        final fare = fareFor(x, cabin);
        if (nf.stops.isNotEmpty && !nf.stops.contains(x.stops)) return false;
        if (nf.times.isNotEmpty && !_times.where((t) => nf.times.contains(t.id)).any((t) => t.test(x.dep))) return false;
        if (nf.maxPrice != null && fare > nf.maxPrice!) return false;
        if (nf.airlines.isNotEmpty && !nf.airlines.contains(x.airline)) return false;
        if (nf.refundable && !refundableFor(x, cabin)) return false;
        return true;
      }).length,
    ));
  }
}

class _FilterSheet extends StatefulWidget {
  final List<Flight> all;
  final String cabin;
  final double minFare, maxFare;
  final _Filters filters;
  final ValueChanged<_Filters> onChanged;
  final int Function(_Filters) countFor;
  const _FilterSheet({required this.all, required this.cabin, required this.minFare, required this.maxFare, required this.filters, required this.onChanged, required this.countFor});
  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late _Filters fl = widget.filters;

  void _set(void Function(_Filters) fn) {
    final n = _Filters()
      ..stops = {...fl.stops}
      ..times = {...fl.times}
      ..airlines = {...fl.airlines}
      ..maxPrice = fl.maxPrice
      ..refundable = fl.refundable;
    fn(n);
    setState(() => fl = n);
    widget.onChanged(n);
  }

  void _toggle<T>(Set<T> Function(_Filters) pick, T v) => _set((n) { final s = pick(n); if (!s.remove(v)) s.add(v); });

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final all = widget.all, cabin = widget.cabin, minFare = widget.minFare, maxFare = widget.maxFare;
    final stopsPresent = all.map((x) => x.stops).toSet().toList()..sort();
    double minFor(bool Function(Flight) pred) => all.where(pred).map((x) => fareFor(x, cabin)).reduce(math.min);
    final airlinesPresent = all.map((x) => x.airline).toSet().map((a) => (a: a, min: minFor((x) => x.airline == a))).toList()..sort((x, y) => x.min.compareTo(y.min));
    final step = maxFare - minFare > 200000 ? 5000.0 : 1000.0;
    final cur = fl.maxPrice ?? maxFare;
    void setMax(double v) => _set((n) => n.maxPrice = math.max(minFare, math.min(maxFare, v)));
    final presets = [0.25, 0.5, 0.75].map((p) => ((minFare + (maxFare - minFare) * p) / step).ceil() * step).toList();
    final count = widget.countFor(fl);
    Widget pillChip(String label, bool on, VoidCallback onTap) => GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.pill), border: Border.all(color: on ? c.primary : c.border), color: on ? c.primarySoft : c.surface),
            child: AppText(label, v: TV.xs, weight: FontWeight.w600),
          ),
        );
    return AppSheet(
      header: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
        child: Row(children: [
          const Expanded(child: AppText('Filter results', v: TV.h3)),
          GestureDetector(onTap: () { final n = _Filters(); setState(() => fl = n); widget.onChanged(n); }, child: AppText('Reset', weight: FontWeight.w700, color: c.primary)),
        ]),
      ),
      footer: Btn('Show $count flight${count == 1 ? '' : 's'}', full: true, onPressed: () => Navigator.of(context).pop()),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Padding(padding: EdgeInsets.only(bottom: 6), child: AppText('Stops', v: TV.label, muted: true)),
        for (final s in stopsPresent)
          Row(children: [
            Expanded(child: AppCheckbox(checked: fl.stops.contains(s), onChanged: (_) => _toggle<int>((n) => n.stops, s), label: s == 0 ? 'Direct' : '1 stop')),
            AppText(f.naira(minFor((x) => x.stops == s)), v: TV.sm, muted: true, tabular: true),
          ]),
        const Padding(padding: EdgeInsets.only(top: 16, bottom: 8), child: AppText('Departure time', v: TV.label, muted: true)),
        GridView.count(
          crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 2.1,
          children: [
            for (final t in _times)
              OptionCard(
                selected: fl.times.contains(t.id),
                padding: const EdgeInsets.all(10),
                onTap: () => _toggle<String>((n) => n.times, t.id),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  AppIcon(t.icon, size: 18, color: fl.times.contains(t.id) ? c.primary : c.muted),
                  const SizedBox(height: 4),
                  AppText(t.label, weight: FontWeight.w700),
                  AppText(t.sub, v: TV.xs, muted: true),
                ]),
              ),
          ],
        ),
        const Padding(padding: EdgeInsets.only(top: 16, bottom: 8), child: AppText('Max price', v: TV.label, muted: true)),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(R.lg)),
          child: Row(children: [
            IconBtn('bi-dash-lg', size: 36, tooltip: 'Lower max price', onPressed: cur <= minFare ? null : () => setMax(cur - step)),
            Expanded(child: AppText('Up to ${f.naira(cur)}', weight: FontWeight.w700, tabular: true, center: true)),
            IconBtn('bi-plus-lg', size: 36, tooltip: 'Raise max price', onPressed: cur >= maxFare ? null : () => setMax(cur + step)),
          ]),
        ),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final p in presets) pillChip('≤ ${f.naira(p)}', cur == p, () => setMax(p)),
          pillChip('Any price', fl.maxPrice == null, () => _set((n) => n.maxPrice = null)),
        ]),
        const Padding(padding: EdgeInsets.only(top: 16, bottom: 6), child: AppText('Airlines', v: TV.label, muted: true)),
        for (final a in airlinesPresent)
          Row(children: [
            Expanded(
              child: AppCheckbox(
                checked: fl.airlines.contains(a.a),
                onChanged: (_) => _toggle<String>((n) => n.airlines, a.a),
                child: Row(children: [AirlineLogo(a.a, size: 22), const SizedBox(width: 8), Flexible(child: AppText(airlineName(a.a), v: TV.sm, weight: FontWeight.w600))]),
              ),
            ),
            AppText(f.naira(a.min), v: TV.sm, muted: true, tabular: true),
          ]),
        const SizedBox(height: 8),
        SwitchRow(title: 'Refundable fares only', value: fl.refundable, onChanged: (v) => _set((n) => n.refundable = v)),
      ]),
    );
  }
}
