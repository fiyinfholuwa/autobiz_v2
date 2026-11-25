import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../data/catalog.dart';
import '../../features/flights/components.dart';
import '../../features/flights/engine.dart';
import '../../features/flights/state.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _popular = [('LOS', 'ABV'), ('LOS', 'DXB'), ('ABV', 'LHR'), ('LOS', 'ACC'), ('LOS', 'PHC'), ('LOS', 'JFK'), ('ABV', 'KAN')];
const _trending = [
  ('LOS', 'DXB', [Color(0xFFC8102E), Color(0xFF7A0A1D)], 'bi-buildings'),
  ('ABV', 'LHR', [Color(0xFF1E3A8A), Color(0xFF0B1A4D)], 'bi-bank'),
  ('LOS', 'ACC', [Color(0xFF0E7490), Color(0xFF0B4F6C)], 'bi-tree'),
  ('LOS', 'ABV', [Color(0xFF15803D), Color(0xFF0B4F2C)], 'bi-geo'),
  ('LOS', 'JFK', [Color(0xFF7048E8), Color(0xFF3B1FA6)], 'bi-building'),
  ('LOS', 'IST', [Color(0xFFDC2626), Color(0xFF7F1D1D)], 'bi-moon-stars'),
];

/// Route: /flights (q: from, to, view=trips)
class FlightsScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const FlightsScreen({super.key, this.q = const {}});
  @override
  State<FlightsScreen> createState() => _FlightsScreenState();
}

class _FlightsScreenState extends State<FlightsScreen> {
  late String view = widget.q['view'] == 'trips' ? 'trips' : 'search';

  @override
  void initState() {
    super.initState();
    _applyParams();
  }

  @override
  void didUpdateWidget(FlightsScreen old) {
    super.didUpdateWidget(old);
    if (old.q.toString() != widget.q.toString()) {
      if (widget.q['view'] != null) setState(() => view = widget.q['view'] == 'trips' ? 'trips' : 'search');
      _applyParams();
    }
  }

  void _applyParams() {
    final from = widget.q['from']?.toUpperCase(), to = widget.q['to']?.toUpperCase();
    if (from != null && airportByCode(from) != null) {
      flights.update(() {
        flights.form.legs[0].from = from;
        if (to != null && airportByCode(to) != null) flights.form.legs[0].to = to;
      });
      if (to != null && airportByCode(to) != null) {
        Future.delayed(const Duration(milliseconds: 50), () {
          if (!mounted) return;
          if (runSearch(flights.form).isEmpty) context.push('/flights/results');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    final t = today();
    final upcoming = s.bookings.where((b) => b.status != 'Cancelled' && b.legs.last.date.compareTo(t) >= 0).length;
    return AppScreen(
      header: const AppHeader(title: 'Flight Booking', subtitle: 'Search local & international flights'),
      children: [
        Segment<String>(
          value: view,
          onChanged: (v) => setState(() => view = v),
          options: [const SegOption('search', 'Search flights', icon: 'bi-search'), SegOption('trips', 'My trips', icon: 'bi-airplane', badge: upcoming > 0 ? upcoming : null)],
        ),
        const SizedBox(height: 16),
        if (view == 'search') const _SearchView() else _TripsView(onSearch: () => setState(() => view = 'search')),
        const SizedBox(height: 8),
        const AppText('Pay straight from your wallet · Instant e-ticket', v: TV.xs, muted: true, center: true),
      ],
    );
  }
}

/* ====================== Search ====================== */
class _SearchView extends StatefulWidget {
  const _SearchView();
  @override
  State<_SearchView> createState() => _SearchViewState();
}

class _SearchViewState extends State<_SearchView> {
  Map<String, String> errs = {};

  void _clear(String k) { if (errs.containsKey(k)) setState(() => errs.remove(k)); }

  void _setLeg(int i, {String? from, String? to, String? date}) {
    flights.update(() {
      final fm = flights.form;
      final l = fm.legs[i];
      if (from != null) l.from = from;
      if (to != null) l.to = to;
      if (date != null) {
        l.date = date;
        if (i == 0) {
          if (fm.ret.isNotEmpty && fm.ret.compareTo(date) < 0) fm.ret = plusDays(date, 3);
          if (fm.legs[1].date.isNotEmpty && fm.legs[1].date.compareTo(date) < 0) fm.legs[1].date = plusDays(date, 2);
        }
      }
    });
  }

  void _setTrip(String trip) {
    final tomorrow = plusDays(today(), 1);
    flights.update(() {
      final n = flights.form;
      n.trip = trip;
      if (trip == 'round' && (n.ret.isEmpty || n.ret.compareTo(n.legs[0].date) < 0)) n.ret = plusDays(n.legs[0].date.isNotEmpty ? n.legs[0].date : tomorrow, 7);
      if (trip == 'multi') {
        if (n.legs[1].from.isEmpty) n.legs[1].from = n.legs[0].to;
        if (n.legs[1].date.isEmpty || n.legs[1].date.compareTo(n.legs[0].date) < 0) n.legs[1].date = plusDays(n.legs[0].date.isNotEmpty ? n.legs[0].date : tomorrow, 3);
      }
    });
  }

  void _go(SearchForm fm) {
    final e = runSearch(fm);
    setState(() => errs = e);
    if (e.isEmpty) context.push('/flights/results');
  }

  void _quick(String a, String b, [String? date]) {
    final t = today();
    final fm = flights.form;
    final d = date ?? (fm.legs[0].date.isNotEmpty && fm.legs[0].date.compareTo(t) >= 0 ? fm.legs[0].date : plusDays(t, 1));
    flights.update(() {
      if (fm.trip == 'multi') fm.trip = 'oneway';
      fm.legs[0] = Leg(from: a, to: b, date: d);
      if (fm.trip == 'round' && (fm.ret.isEmpty || fm.ret.compareTo(d) < 0)) fm.ret = plusDays(d, 7);
    });
    _go(fm);
  }

  Widget _legRow(int i) {
    final c = context.c;
    final fm = flights.form;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (i == 1) const Padding(padding: EdgeInsets.only(bottom: 10), child: AppText('Flight 2', v: TV.label, muted: true)),
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: AirportField(label: i == 1 ? 'From (flight 2)' : 'From', icon: 'bi-geo-alt', value: fm.legs[i].from, error: errs['from$i'], onChanged: (v) { _setLeg(i, from: v); _clear('from$i'); })),
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 26, 8, 0),
          child: Semantics(
            label: 'Swap airports', button: true,
            child: Material(
              color: c.primary, shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: () => _setLeg(i, from: fm.legs[i].to, to: fm.legs[i].from),
                child: const SizedBox(width: 36, height: 36, child: Center(child: AppIcon('bi-arrow-left-right', size: 16, color: Colors.white))),
              ),
            ),
          ),
        ),
        Expanded(child: AirportField(label: i == 1 ? 'To (flight 2)' : 'To', icon: 'bi-pin-map', value: fm.legs[i].to, error: errs['to$i'], onChanged: (v) { _setLeg(i, to: v); _clear('to$i'); })),
      ]),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final t = today();
    final max = plusDays(t, 330);
    return ListenableBuilder(
      listenable: flights,
      builder: (context, _) {
        final fm = flights.form;
        final travellers = fm.pax.total;
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 46),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.xxl), gradient: LinearGradient(colors: [c.primary300, c.primary700], begin: Alignment.topLeft, end: Alignment.bottomRight)),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppText('Where are you flying next?', v: TV.h2, color: Colors.white),
                SizedBox(height: 4),
                AppText('Compare 12 airlines · Instant e-ticket · Pay in Naira', v: TV.sm, color: Color(0xD9FFFFFF)),
              ])),
              AppIcon('ion:airplane', size: 40, color: Colors.white.withValues(alpha: 0.35)),
            ]),
          ),
          Transform.translate(
            offset: const Offset(0, -28),
            child: CardBox(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Segment<String>(small: true, value: fm.trip, onChanged: _setTrip, options: const [SegOption('oneway', 'One-way'), SegOption('round', 'Round trip'), SegOption('multi', 'Multi-city')]),
                const SizedBox(height: 14),
                _legRow(0),
                const SizedBox(height: 14),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(child: DateField(label: 'Depart', value: fm.legs[0].date, min: t, max: max, error: errs['date0'], onChanged: (v) { _setLeg(0, date: v); _clear('date0'); })),
                  const SizedBox(width: 8),
                  Expanded(
                    child: fm.trip == 'round'
                        ? DateField(label: 'Return', value: fm.ret, min: fm.legs[0].date.isNotEmpty ? fm.legs[0].date : t, max: max, error: errs['ret'], onChanged: (v) { flights.update(() => fm.ret = v); _clear('ret'); })
                        : fm.trip == 'oneway'
                            ? Padding(
                                padding: const EdgeInsets.only(top: 24),
                                child: InkWell(
                                  onTap: () => _setTrip('round'),
                                  borderRadius: BorderRadius.circular(R.md + 2),
                                  child: Container(
                                    height: 50,
                                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.md + 2), border: Border.all(color: c.border, width: 1.5)),
                                    child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                                      AppIcon('bi-plus-lg', size: 16, color: c.primary),
                                      const SizedBox(width: 6),
                                      AppText('Add return', weight: FontWeight.w600, color: c.primary),
                                    ]),
                                  ),
                                ),
                              )
                            : const SizedBox.shrink(),
                  ),
                ]),
                if (fm.trip == 'multi') ...[
                  const SizedBox(height: 14),
                  _legRow(1),
                  const SizedBox(height: 14),
                  DateField(label: 'Depart (flight 2)', value: fm.legs[1].date, min: fm.legs[0].date.isNotEmpty ? fm.legs[0].date : t, max: max, error: errs['date1'], onChanged: (v) { _setLeg(1, date: v); _clear('date1'); }),
                  const SizedBox(height: 8),
                  const AppText('Multi-city supports up to 2 flights.', v: TV.xs, muted: true),
                ],
                const SizedBox(height: 14),
                Material(
                  color: c.surface,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.md + 2), side: BorderSide(color: c.border, width: 1.5)),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(R.md + 2),
                    onTap: () => showSheet(const _PassengersSheet()),
                    child: Container(
                      height: 50, padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: Row(children: [
                        AppIcon('bi-people', size: 18, color: c.muted),
                        const SizedBox(width: 10),
                        Expanded(child: AppText('$travellers Traveller${travellers > 1 ? 's' : ''} · ${cabinOf(fm.cabin).label}', weight: FontWeight.w500)),
                        AppIcon('bi-chevron-down', size: 16, color: c.muted),
                      ]),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Btn('Search flights', icon: 'bi-search', size: BtnSize.lg, full: true, onPressed: () => _go(fm)),
              ]),
            ),
          ),
          const AppText('Popular', v: TV.label, muted: true),
          const SizedBox(height: 8),
          HScroll(padding: EdgeInsets.zero, children: [for (final (a, b) in _popular) AppChip('$a → $b', icon: 'bi-airplane', onTap: () => _quick(a, b))]),
          const SizedBox(height: 22),
          const AppText('Trending destinations', v: TV.h3),
          const AppText('Lowest fares for next week · one-way, economy', v: TV.xs, muted: true),
          const SizedBox(height: 10),
          _TrendingCards(onPick: (a, b) => _quick(a, b, plusDays(t, 7))),
          const SizedBox(height: 18),
          for (final (i, ti, s, tn) in const [
            ('bi-tags', 'Best price guarantee', 'Live fares across local & global carriers.', 'success'),
            ('bi-lightning-charge', 'Instant e-ticket', 'Get your PNR and boarding pass in seconds.', 'violet'),
            ('bi-arrow-counterclockwise', 'Easy refunds', 'Cancel in-app — refunds go straight to your wallet.', 'cyan'),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: CardBox(
                padding: const EdgeInsets.all(14),
                child: Row(children: [
                  IconTile(i, tone: tn, size: 40),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [AppText(ti, weight: FontWeight.w700), AppText(s, v: TV.xs, muted: true)])),
                ]),
              ),
            ),
        ]);
      },
    );
  }
}

class _TrendingCards extends StatelessWidget {
  final void Function(String a, String b) onPick;
  const _TrendingCards({required this.onPick});
  @override
  Widget build(BuildContext context) {
    final d = plusDays(today(), 7);
    return HScroll(
      padding: EdgeInsets.zero,
      gap: 12,
      children: [
        for (final (a, b, g, icon) in _trending)
          GestureDetector(
            onTap: () => onPick(a, b),
            child: Container(
              width: 170, height: 150, padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.xl), gradient: LinearGradient(colors: g, begin: Alignment.topLeft, end: Alignment.bottomRight)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  flagFor(b).isNotEmpty ? FlagImg(flagFor(b), size: 28) : const SizedBox.shrink(),
                  AppIcon(icon, size: 22, color: Colors.white.withValues(alpha: 0.6)),
                ]),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  AppText(cityOf(b), v: TV.h3, color: Colors.white),
                  AppText('from ${cityOf(a)}', v: TV.xs, color: Colors.white.withValues(alpha: 0.8)),
                  const SizedBox(height: 6),
                  AppText(f.naira(cheapest(a, b, d, 'Economy')), weight: FontWeight.w800, color: Colors.white),
                ]),
              ]),
            ),
          ),
      ],
    );
  }
}

class _PassengersSheet extends StatelessWidget {
  const _PassengersSheet();
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return ListenableBuilder(
      listenable: flights,
      builder: (context, _) {
        final fm = flights.form;
        final p = fm.pax;
        final seated = p.seated;
        void setPax(Pax n) {
          flights.update(() => fm.pax = n.infants > n.adults ? n.copyWith(infants: n.adults) : n);
        }
        var note = "Max 9 travellers. Infants travel on an adult's lap.";
        var warn = false;
        if (p.infants >= p.adults && p.infants > 0) { note = 'Each infant must travel with an adult.'; warn = true; }
        else if (seated >= 9) { note = 'Maximum of 9 seated travellers per booking.'; warn = true; }
        Widget row(String label, String sub, int v, int min, bool canInc, ValueChanged<int> fn) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [AppText(label, weight: FontWeight.w700), AppText(sub, v: TV.xs, muted: true)])),
                QtyStepper(value: v, min: min, max: canInc ? v + 1 : v, onChanged: fn),
              ]),
            );
        return AppSheet(
          title: 'Passengers & cabin',
          footer: Btn('Done', full: true, onPressed: () => Navigator.of(context).pop()),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            row('Adults', '12+ years', p.adults, 1, seated < 9, (n) => setPax(p.copyWith(adults: n))),
            row('Children', '2–11 years', p.children, 0, seated < 9, (n) => setPax(p.copyWith(children: n))),
            row('Infants', 'Under 2 · on lap', p.infants, 0, p.infants < p.adults, (n) => setPax(p.copyWith(infants: n))),
            Padding(padding: const EdgeInsets.only(top: 4, bottom: 14), child: AppText(note, v: TV.xs, color: warn ? c.warningText : c.muted)),
            const Padding(padding: EdgeInsets.only(bottom: 8), child: AppText('Cabin', v: TV.label, muted: true)),
            GridView.count(
              crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 2.2,
              children: [
                for (final cb in cabins)
                  OptionCard(
                    selected: fm.cabin == cb.key,
                    onTap: () => flights.update(() => fm.cabin = cb.key),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                      AppIcon(cb.icon, size: 20, color: fm.cabin == cb.key ? c.primary : c.muted),
                      const SizedBox(height: 6),
                      AppText(cb.label, weight: FontWeight.w700, maxLines: 1),
                    ]),
                  ),
              ],
            ),
          ]),
        );
      },
    );
  }
}

/* ====================== Trips ====================== */
class _TripsView extends StatelessWidget {
  final VoidCallback onSearch;
  const _TripsView({required this.onSearch});
  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    if (!s.authed) {
      return EmptyState(icon: 'bi-person-lock', title: 'Log in to see your trips', message: 'Your e-tickets and bookings appear here once you sign in.', action: 'Log in', onAction: () => requireLogin(title: 'Log in to see your trips', next: '/flights?view=trips'));
    }
    return _TripsList(onSearch: onSearch);
  }
}

class _TripsList extends StatefulWidget {
  final VoidCallback onSearch;
  const _TripsList({required this.onSearch});
  @override
  State<_TripsList> createState() => _TripsListState();
}

class _TripsListState extends State<_TripsList> {
  String tab = 'up';
  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    final t = today();
    bool isPast(Booking b) => b.legs.last.date.compareTo(t) < 0;
    final up = s.bookings.where((b) => b.status != 'Cancelled' && !isPast(b)).toList()
      ..sort((a, b) { final d = a.legs[0].date.compareTo(b.legs[0].date); return d != 0 ? d : a.legs[0].flight.dep - b.legs[0].flight.dep; });
    final past = s.bookings.where((b) => b.status == 'Cancelled' || isPast(b)).toList()..sort((a, b) => b.createdAt - a.createdAt);
    final list = tab == 'up' ? up : past;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        AppChip('Upcoming (${up.length})', active: tab == 'up', onTap: () => setState(() => tab = 'up')),
        const SizedBox(width: 8),
        AppChip('Past & cancelled (${past.length})', active: tab == 'past', onTap: () => setState(() => tab = 'past')),
      ]),
      const SizedBox(height: 14),
      if (list.isEmpty)
        EmptyState(
          icon: 'bi-airplane', tone: 'cyan',
          title: tab == 'up' ? 'No upcoming trips' : 'No past trips yet',
          message: tab == 'up' ? 'Book a flight and your e-tickets will show up here.' : 'Completed and cancelled bookings will appear here.',
          action: 'Search flights', onAction: widget.onSearch,
        )
      else
        for (final b in list) _TripCard(b: b, past: isPast(b)),
    ]);
  }
}

class _TripCard extends StatelessWidget {
  final Booking b;
  final bool past;
  const _TripCard({required this.b, required this.past});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final l0 = b.legs[0];
    final route = b.trip == 'round' ? '${cityOf(l0.from)} ⇄ ${cityOf(l0.to)}' : [...b.legs.map((l) => cityOf(l.from)), cityOf(b.legs.last.to)].join(' → ');
    final days = ((f.parseDay(l0.date) - f.startOfDay()) / dayMs).round();
    final countdown = b.status != 'Cancelled' && days >= 0 && days <= 30 ? (days == 0 ? 'Today' : days == 1 ? 'Tomorrow' : 'In $days days') : null;
    final n = b.passengers.length;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: CardBox(
        onTap: () => context.push('/flights/ticket/${b.id}'),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AirlineLogo(l0.flight.airline, size: 42),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: AppText(route, weight: FontWeight.w700, maxLines: 2)),
                const SizedBox(width: 6),
                b.status == 'Cancelled' ? const StatusPill('cancelled', label: 'Cancelled') : past ? const StatusPill('neutral', label: 'Completed') : const StatusPill('success', label: 'Confirmed'),
              ]),
              if (countdown != null) Padding(padding: const EdgeInsets.only(top: 6), child: Pill(countdown, tone: 'cyan', icon: 'bi-clock')),
              const SizedBox(height: 6),
              AppText('${b.legs.map((l) => '${f.shortDay(f.parseDay(l.date))} · ${f.hhmm(l.flight.dep)}').join(' — ')} · ${airlineName(l0.flight.airline)} ${l0.flight.flightNo}', v: TV.xs, muted: true),
              const SizedBox(height: 2),
              AppText('$n traveller${n > 1 ? 's' : ''} · ${cabinOf(b.cabin).label} · ${b.refundable ? 'Refundable' : 'Non-refundable'}${(b.refund ?? 0) > 0 ? ' · Refunded ${f.naira(b.refund)}' : ''}', v: TV.xs, muted: true),
            ])),
          ]),
          Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Container(height: 1, color: c.border)),
          Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText(f.naira(b.total), weight: FontWeight.w800, tabular: true),
              GestureDetector(onTap: () => copyText(b.pnr, 'PNR copied'), child: AppText('PNR ${b.pnr} ⧉', v: TV.xs, weight: FontWeight.w600, color: c.primary)),
            ])),
            if (!past && b.status != 'Cancelled') ...[
              Btn('Cancel', size: BtnSize.sm, variant: BtnVariant.dangerSoft, onPressed: () => showSheet(_CancelSheet(b))),
              const SizedBox(width: 8),
            ],
            Btn('View ticket', size: BtnSize.sm, variant: BtnVariant.soft, icon: 'bi-qr-code', onPressed: () => context.push('/flights/ticket/${b.id}')),
          ]),
        ]),
      ),
    );
  }
}

class _CancelSheet extends StatefulWidget {
  final Booking b;
  const _CancelSheet(this.b);
  @override
  State<_CancelSheet> createState() => _CancelSheetState();
}

class _CancelSheetState extends State<_CancelSheet> {
  bool busy = false;
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final b = widget.b;
    final refund = b.refundable ? (b.total * 0.85).roundToDouble() : b.taxes;
    Future<void> doCancel() async {
      setState(() => busy = true);
      await sleep(1000);
      store.mutate(() { b.status = 'Cancelled'; b.refund = refund; b.cancelledAt = f.now(); });
      if (refund > 0) {
        store.credit(refund, TxInput(type: 'refund', title: 'Flight refund · ${b.pnr}', subtitle: '${b.legs[0].from} → ${b.legs[0].to} cancelled', icon: 'bi-arrow-counterclockwise', tone: 'cyan'));
      }
      store.notify(icon: 'bi-airplane', tone: 'danger', title: 'Booking ${b.pnr} cancelled', body: '${f.naira(refund)} has been refunded to your wallet.');
      if (!context.mounted) return;
      Navigator.of(context).pop();
      Future.delayed(const Duration(milliseconds: 350), () => success(SuccessOpts(
            title: 'Booking cancelled',
            message: '${f.naira(refund, 2)} has been refunded to your wallet.',
            rows: [SRow('PNR', b.pnr), SRow('Refund', f.naira(refund, 2)), SRow('New balance', f.naira(store.balance, 2))],
          )));
    }

    return AppSheet(
      title: 'Cancel booking ${b.pnr}?',
      locked: busy,
      footer: Row(children: [
        Expanded(flex: 10, child: Btn('Keep booking', variant: BtnVariant.outline, disabled: busy, onPressed: () => Navigator.of(context).pop())),
        const SizedBox(width: 10),
        Expanded(flex: 14, child: Btn('Cancel & refund ${f.naira(refund)}', variant: BtnVariant.danger, loading: busy, loadingText: 'Cancelling…', onPressed: doCancel)),
      ]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: b.refundable ? c.successSoft : c.warningSoft, borderRadius: BorderRadius.circular(R.md)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AppText(b.refundable ? 'Refundable fare' : 'Non-refundable fare', weight: FontWeight.w700, color: b.refundable ? c.success : c.warningText),
            const SizedBox(height: 2),
            AppText(b.refundable ? "You'll get 85% of the total paid back to your wallet. A 15% cancellation fee applies." : 'Only airport taxes & fees are refunded. The base fare and add-ons are forfeited.', v: TV.sm, muted: true),
          ]),
        ),
        const SizedBox(height: 12),
        Summary(
          [SRow('Amount paid', f.naira(b.total)), SRow(b.refundable ? 'Cancellation fee (15%)' : 'Non-refundable portion', '−${f.naira(b.total - refund)}', color: c.danger)],
          total: ('Refund to wallet', f.naira(refund)),
        ),
        const SizedBox(height: 12),
        const AppText("This can't be undone. All boarding passes on this booking will be voided.", v: TV.xs, muted: true),
      ]),
    );
  }
}
