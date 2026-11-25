import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../features/flights/components.dart';
import '../../features/flights/engine.dart';
import '../../features/flights/state.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _steps = ['Review', 'Passengers', 'Seats', 'Add-ons', 'Payment'];
const _nationalities = ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'British', 'American', 'Canadian', 'Other'];

int _ageOn(String dob, String on) {
  final b = DateTime.fromMillisecondsSinceEpoch(f.parseDay(dob)), d = DateTime.fromMillisecondsSinceEpoch(f.parseDay(on));
  var a = d.year - b.year;
  if (d.month < b.month || (d.month == b.month && d.day < b.day)) a--;
  return a;
}

String _addMonths(String iso, int n) {
  final d = DateTime.fromMillisecondsSinceEpoch(f.parseDay(iso));
  return f.isoDay(DateTime(d.year, d.month + n, d.day).millisecondsSinceEpoch);
}

/// Route: /flights/book
class FlightBookScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const FlightBookScreen({super.key, this.q = const {}});
  @override
  State<FlightBookScreen> createState() => _FlightBookScreenState();
}

class _FlightBookScreenState extends State<FlightBookScreen> {
  Map<String, String> errs = {};
  bool leaving = false;
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    flights.addListener(_rebuild);
  }

  @override
  void dispose() {
    flights.removeListener(_rebuild);
    _scroll.dispose();
    super.dispose();
  }

  void _rebuild() { if (mounted) setState(() {}); }

  void _setB(void Function(BookingDraft b) fn) {
    final b = flights.booking;
    if (b != null) flights.update(() => fn(b));
  }

  void _goStep(int s) {
    _setB((b) { b.step = s; if (s > b.maxStep) b.maxStep = s; });
    Future.delayed(const Duration(milliseconds: 50), () { if (_scroll.hasClients) _scroll.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut); });
  }

  void _resetToResults() {
    final s = flights.search;
    if (s != null) flights.update(() { flights.booking = null; flights.legIdx = s.legs.length - 1; flights.picks = flights.picks.take(s.legs.length - 1).toList(); });
  }

  Future<void> _confirmLeave() async {
    final ok = await confirmDialog(const ConfirmOpts(title: 'Leave booking?', message: 'Details you entered will be lost.', confirmLabel: 'Leave', tone: 'danger', icon: 'bi-box-arrow-left'));
    if (!ok || !mounted) return;
    leaving = true;
    _resetToResults();
    goBack(context, '/flights/results');
  }

  bool _validatePassengers(BookingDraft b, Totals t) {
    final e = <String, String>{};
    final first = b.legs.first.date, last = b.legs.last.date;
    final nameRe = RegExp(r"^[A-Za-z][A-Za-z' -]*[A-Za-z]$");
    for (var i = 0; i < b.travellers.length; i++) {
      final p = b.travellers[i];
      if (p.title.isEmpty) e['$i.title'] = 'Required';
      for (final k in ['first', 'last']) {
        final v = (k == 'first' ? p.first : p.last).trim();
        if (v.isEmpty) {
          e['$i.$k'] = k == 'first' ? 'Enter first name' : 'Enter last name';
        } else if (!nameRe.hasMatch(v) || v.length < 2) {
          e['$i.$k'] = 'Letters only, min 2 characters';
        }
      }
      if (p.dob.isEmpty) {
        e['$i.dob'] = 'Enter date of birth';
      } else if (p.dob.compareTo(today()) > 0) {
        e['$i.dob'] = "Can't be in the future";
      } else if (p.type == 'adult') {
        final a = _ageOn(p.dob, first);
        if (a < 12) { e['$i.dob'] = 'Adults must be 12+ on travel date'; } else if (a > 110) { e['$i.dob'] = 'Check the year'; }
      } else if (p.type == 'child') {
        final a = _ageOn(p.dob, first);
        if (a < 2 || a > 11) e['$i.dob'] = 'Children must be 2–11 on travel date';
      } else if (_ageOn(p.dob, last) >= 2) {
        e['$i.dob'] = 'Infants must be under 2 for the whole trip';
      }
      if (t.intl) {
        if (!RegExp(r'^[A-Z0-9]{6,9}$').hasMatch(p.passport)) e['$i.passport'] = '6–9 letters/numbers';
        final exp = p.expiry ?? '';
        if (exp.isEmpty) {
          e['$i.expiry'] = 'Enter expiry date';
        } else if (exp.compareTo(_addMonths(last, 6)) < 0) {
          e['$i.expiry'] = 'Must be valid 6 months after travel';
        }
      }
    }
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[a-z]{2,}$', caseSensitive: false).hasMatch(b.email.trim())) e['contact.email'] = 'Enter a valid email address';
    if (!RegExp(r'^(0[789][01]\d{8}|\+?234[789][01]\d{8})$').hasMatch(b.phone.replaceAll(RegExp(r'\s'), ''))) e['contact.phone'] = 'Enter a valid Nigerian phone number';
    setState(() => errs = e);
    if (e.isNotEmpty) { toast('Please complete the traveller details', type: ToastType.warning); return false; }
    return true;
  }

  Future<void> _pay(BookingDraft b, Totals t) async {
    if (!b.agree) {
      setState(() => errs = {'agree': 'You must accept the fare rules to continue.'});
      toast('Please accept the fare rules', type: ToastType.warning);
      return;
    }
    final route = routeString(draftRoute(b), b.trip);
    final dates = b.legs.length > 1 ? '${f.shortDay(f.parseDay(b.legs.first.date))} – ${f.shortDay(f.parseDay(b.legs.last.date))}' : f.shortDay(f.parseDay(b.legs.first.date));
    final ok = await confirmPay(PayOpts(
      title: 'Confirm flight payment', amount: t.total, cta: 'Pay ${f.naira(t.total)}',
      rows: [SRow('Route', route), SRow('Date', dates), SRow('Travellers', '${t.travellers}'), SRow('Cabin', cabinOf(b.cabin).label)],
      note: 'Your e-ticket will be issued instantly.',
    ));
    if (!ok) return;
    var pnr = rndCode(6);
    while (store.bookings.any((x) => x.pnr == pnr)) { pnr = rndCode(6); }
    final tx = store.debit(t.total, TxInput(type: 'flight', title: 'Flight $route', subtitle: '${airlineName(b.legs.first.flight.airline)} · PNR $pnr', icon: 'bi-airplane', tone: 'cyan'));
    if (tx == null) { toast('Insufficient wallet balance', type: ToastType.error); return; }
    final bk = Booking(
      id: f.ref('FL'), pnr: pnr, trip: b.trip, cabin: b.cabin,
      legs: b.legs.map((l) => BookingLeg(from: l.from, to: l.to, date: l.date, flight: l.flight)).toList(),
      passengers: b.travellers.map((p) => Passenger(type: p.type, label: p.label, title: p.title, first: p.first.trim(), last: p.last.trim(), dob: p.dob, passport: p.passport, nationality: p.nationality)).toList(),
      seats: Map.of(b.seats), seatsSkipped: b.seatsSkipped,
      addons: (bags: b.bags, insurance: b.insurance, priority: b.priority), contact: (email: b.email, phone: b.phone),
      fare: t.fare, taxes: t.taxes, total: t.total, refundable: t.refundable, status: 'Confirmed', createdAt: f.now(), txId: tx.id,
    );
    store.mutate(() => store.bookings.insert(0, bk));
    store.notify(icon: 'bi-airplane', tone: 'cyan', title: 'Flight booked · $pnr', body: '$route on $dates is confirmed.');
    leaving = true;
    flights.update(() { flights.booking = null; flights.search = null; flights.picks = []; flights.legIdx = 0; });
    if (!mounted) return;
    final router = GoRouter.of(context);
    router.go(loc('/flights', {'view': 'trips'}));
    Future.delayed(const Duration(milliseconds: 350), () => router.push(loc('/flights/ticket/${bk.id}', {'fresh': '1'})));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final b = flights.booking;
    if (b == null) {
      return AppScreen(
        header: const AppHeader(title: 'Booking', fallback: '/flights'),
        children: [EmptyState(icon: 'bi-airplane', title: 'No flight selected', message: 'Search and select a flight to start booking.', action: 'Search flights', onAction: () => context.go('/flights'))],
      );
    }
    final t = bookingTotals(b);
    void next() {
      if (b.step == 1 && !_validatePassengers(b, t)) return;
      if (b.step == 4) { _pay(b, t); return; }
      _goStep(b.step + 1);
    }
    final ctas = ['Continue to passengers', 'Continue to seats', 'Continue to add-ons', 'Continue to payment', 'Pay ${f.naira(t.total)}'];

    return PopScope(
      canPop: b.step == 0 || leaving,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) { if (!leaving) _resetToResults(); return; }
        _confirmLeave();
      },
      child: AppScreen(
        controller: _scroll,
        header: AppHeader(
          title: _steps[b.step],
          subtitle: routeString(draftRoute(b), b.trip),
          onBack: () => b.step > 0 ? _goStep(b.step - 1) : Navigator.of(context).maybePop(),
        ),
        footer: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          InkWell(
            onTap: () => showSheet(AppSheet(title: 'Price summary', subtitle: cabinOf(b.cabin).label, child: _PriceSummary(b))),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppText('Total · ${t.travellers} traveller${t.travellers > 1 ? 's' : ''}', v: TV.xs, muted: true),
                AppText(f.naira(t.total), v: TV.h3, tabular: true),
              ])),
              AppText('Price details', v: TV.sm, weight: FontWeight.w700, color: c.primary),
              const SizedBox(width: 4),
              AppIcon('bi-chevron-up', size: 14, color: c.primary),
            ]),
          ),
          const SizedBox(height: 10),
          Row(children: [
            if (b.step == 2) ...[
              Expanded(child: Btn('Skip', variant: BtnVariant.outline, onPressed: () {
                _setB((x) { x.seats = {}; x.seatsSkipped = true; });
                toast('Seats will be assigned free at check-in', type: ToastType.info);
                _goStep(3);
              })),
              const SizedBox(width: 10),
            ],
            Expanded(flex: 2, child: Btn(ctas[b.step], icon: b.step == 4 ? 'bi-lock-fill' : null, onPressed: next)),
          ]),
        ]),
        children: [
          _StepBar(step: b.step, maxStep: b.maxStep, onStep: _goStep),
          if (b.step == 0) _ReviewStep(b: b, onChangeFlights: () => Navigator.of(context).maybePop()),
          if (b.step == 1) _PassengersStep(b: b, setB: _setB, errs: errs, clear: (k) { if (errs.containsKey(k)) setState(() => errs.remove(k)); }, intl: t.intl),
          if (b.step == 2) _SeatsStep(b: b, setB: _setB, intl: t.intl),
          if (b.step == 3) _AddonsStep(b: b, setB: _setB, intl: t.intl),
          if (b.step == 4) _PaymentStep(b: b, setB: _setB, total: t.total, errs: errs, clearAgree: () { if (errs.containsKey('agree')) setState(() => errs.remove('agree')); }),
        ],
      ),
    );
  }
}

/* ---------------- Step bar ---------------- */
class _StepBar extends StatelessWidget {
  final int step, maxStep;
  final ValueChanged<int> onStep;
  const _StepBar({required this.step, required this.maxStep, required this.onStep});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(children: [
        for (var i = 0; i < _steps.length; i++) ...[
          if (i > 0) const SizedBox(width: 4),
          Expanded(
            child: GestureDetector(
              onTap: (i < step || i <= maxStep) && i != step ? () => onStep(i) : null,
              child: Column(children: [
                Container(height: 4, decoration: BoxDecoration(color: i <= step ? c.primary : c.border, borderRadius: BorderRadius.circular(2))),
                const SizedBox(height: 5),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  if (i < step) ...[AppIcon('bi-check-lg', size: 11, color: c.primary), const SizedBox(width: 3)],
                  Flexible(child: AppText(_steps[i], size: 10, weight: i == step ? FontWeight.w700 : FontWeight.w600, color: i == step ? c.text : i < step ? c.primary : c.muted, maxLines: 1)),
                ]),
              ]),
            ),
          ),
        ],
      ]),
    );
  }
}

/* ---------------- Price summary ---------------- */
class _PriceSummary extends StatelessWidget {
  final BookingDraft b;
  const _PriceSummary(this.b);
  @override
  Widget build(BuildContext context) {
    final t = bookingTotals(b);
    final rows = <SRow>[];
    for (var i = 0; i < b.legs.length; i++) {
      final pf = t.legFares[i];
      rows.add(SRow('${b.legs[i].from} → ${b.legs[i].to}', ''));
      rows.add(SRow('   Adult × ${b.pax.adults}', f.naira(pf.adult * b.pax.adults)));
      if (b.pax.children > 0) rows.add(SRow('   Child × ${b.pax.children}', f.naira(pf.child * b.pax.children)));
      if (b.pax.infants > 0) rows.add(SRow('   Infant × ${b.pax.infants}', f.naira(pf.infant * b.pax.infants)));
    }
    rows.addAll([SRow('Base fare', f.naira(t.base)), SRow('Taxes & fees (incl.)', f.naira(t.taxes))]);
    if (t.seats > 0) rows.add(SRow('Seat selection', f.naira(t.seats)));
    if (b.bags > 0) rows.add(SRow('Extra bags × ${b.bags}', f.naira(t.bags)));
    if (t.insurance > 0) rows.add(SRow('Travel insurance', f.naira(t.insurance)));
    if (t.priority > 0) rows.add(SRow('Priority boarding', f.naira(t.priority)));
    rows.add(const SRow('Service fee', 'Free'));
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Summary(rows, total: ('Total', f.naira(t.total))),
      const SizedBox(height: 10),
      AppText('Fares are guaranteed once payment is completed. ${t.refundable ? 'Refundable (85%).' : 'Non-refundable (taxes only).'}', v: TV.xs, muted: true),
    ]);
  }
}

/* ---------------- Step 1: Review ---------------- */
class _LegCard extends StatefulWidget {
  final BookingDraft b;
  final int i;
  const _LegCard(this.b, this.i);
  @override
  State<_LegCard> createState() => _LegCardState();
}

class _LegCardState extends State<_LegCard> {
  bool open = false;
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final b = widget.b, i = widget.i;
    final l = b.legs[i];
    final fl = l.flight;
    final label = b.trip == 'round' ? (i == 0 ? 'Outbound' : 'Return') : b.legs.length > 1 ? 'Flight ${i + 1}' : 'Departure';
    final refundable = refundableFor(fl, b.cabin);
    final bag = baggage(fl, b.cabin);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: CardBox(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            AirlineLogo(fl.airline, size: 36),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText('$label · ${f.shortDay(f.parseDay(l.date))}', v: TV.label, color: c.primary),
              AppText('${airlineName(fl.airline)} · ${cabinOf(b.cabin).label}', weight: FontWeight.w700, maxLines: 1),
            ])),
            Pill(refundable ? 'Refundable' : 'Non-refundable', tone: refundable ? 'success' : 'neutral'),
          ]),
          const SizedBox(height: 10),
          TimesLine(fl, big: true),
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () => setState(() => open = !open),
            child: Row(children: [
              AppText('Itinerary details', v: TV.sm, weight: FontWeight.w600, color: c.primary),
              const SizedBox(width: 4),
              AppIcon(open ? 'bi-chevron-up' : 'bi-chevron-down', size: 14, color: c.primary),
            ]),
          ),
          if (open) FlightTimeline(fl, b.cabin),
          const SizedBox(height: 8),
          AppText('${bag.hold} checked · ${bag.cabinBag} cabin', v: TV.xs, muted: true),
        ]),
      ),
    );
  }
}

class _ReviewStep extends StatelessWidget {
  final BookingDraft b;
  final VoidCallback onChangeFlights;
  const _ReviewStep({required this.b, required this.onChangeFlights});
  @override
  Widget build(BuildContext context) {
    final t = bookingTotals(b);
    final rules = <(String, String, String)>[
      ('bi-arrow-counterclockwise', 'Cancellation', t.refundable ? 'Cancel before departure and get 85% of the total paid back to your wallet.' : 'On cancellation only airport taxes & fees are refunded to your wallet.'),
      ('bi-calendar3', 'Date change', 'Allowed up to 24h before departure · ${t.intl ? '₦45,000' : '₦10,000'} fee + fare difference.'),
      ('bi-person', 'Name correction', 'Names must match ${t.intl ? 'passports' : 'a valid government ID'}. Minor corrections only.'),
      ('bi-clock', 'Check-in', 'Online check-in opens 24h before departure. Counter closes ${t.intl ? 60 : 45} min before.'),
      if (t.intl) ('bi-globe2', 'Travel documents', 'Passport valid 6 months beyond travel and any required visas are your responsibility.'),
    ];
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Padding(padding: EdgeInsets.only(bottom: 10), child: AppText('Your itinerary', v: TV.h3)),
      for (var i = 0; i < b.legs.length; i++) _LegCard(b, i),
      const Padding(padding: EdgeInsets.only(top: 6, bottom: 10), child: AppText('Fare rules', v: TV.h3)),
      CardBox(
        child: Column(children: [
          for (var i = 0; i < rules.length; i++) ...[
            if (i > 0) const SizedBox(height: 12),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              IconTile(rules[i].$1, size: 34),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [AppText(rules[i].$2, weight: FontWeight.w700), AppText(rules[i].$3, v: TV.sm, muted: true)])),
            ]),
          ],
        ]),
      ),
      const SizedBox(height: 14),
      Btn('Change flights', variant: BtnVariant.outline, icon: 'bi-arrow-left', onPressed: onChangeFlights),
    ]);
  }
}

/* ---------------- Step 2: Passengers ---------------- */
class _PassengersStep extends StatelessWidget {
  final BookingDraft b;
  final void Function(void Function(BookingDraft)) setB;
  final Map<String, String> errs;
  final ValueChanged<String> clear;
  final bool intl;
  const _PassengersStep({required this.b, required this.setB, required this.errs, required this.clear, required this.intl});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppStore>().user;
    void upd(int i, String k, void Function(Passenger) fn) { setB((x) => fn(x.travellers[i])); clear('$i.$k'); }
    const subs = {'adult': '12+ years', 'child': '2–11 years on travel date', 'infant': 'Under 2 on travel date · travels on lap'};
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const AppText("Who's travelling?", v: TV.h3),
      Padding(padding: const EdgeInsets.only(bottom: 12), child: AppText('Enter names exactly as on ${intl ? 'the passport' : 'a valid ID'}.', v: TV.sm, muted: true)),
      Btn("I'm Adult 1 (${user.firstName})", icon: 'bi-person-circle', variant: BtnVariant.soft, onPressed: () {
        setB((x) { final p = x.travellers[0]; p.first = user.firstName; p.last = user.lastName; if (p.title.isEmpty) p.title = 'Ms'; });
        for (final k in ['first', 'last', 'title']) { clear('0.$k'); }
      }),
      const SizedBox(height: 14),
      for (var i = 0; i < b.travellers.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: CardBox(
            child: Builder(builder: (context) {
              final t = b.travellers[i];
              final titles = t.type == 'adult' ? ['Mr', 'Mrs', 'Ms', 'Dr'] : ['Master', 'Miss'];
              String? e(String k) => errs['$i.$k'];
              return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(children: [
                  IconTile(t.type == 'infant' ? 'mci:baby-face-outline' : t.type == 'child' ? 'mci:human-child' : 'bi-person', size: 36, tone: t.type == 'adult' ? 'primary' : 'violet'),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [AppText(t.label, weight: FontWeight.w700), AppText(subs[t.type]!, v: TV.xs, muted: true)])),
                ]),
                const SizedBox(height: 12),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  SizedBox(width: 110, child: SelectField<String>(label: 'Title', value: t.title.isEmpty ? null : t.title, options: [for (final x in titles) SelectOption(x, x)], onChanged: (v) => upd(i, 'title', (p) => p.title = v), error: e('title'))),
                  const SizedBox(width: 10),
                  Expanded(child: DateField(label: 'Date of birth', value: t.dob, max: today(), error: e('dob'), onChanged: (v) => upd(i, 'dob', (p) => p.dob = v))),
                ]),
                const SizedBox(height: 12),
                AppTextField(label: 'First name', placeholder: 'As on ID', value: t.first, textCapitalization: TextCapitalization.words, autofillHints: const [AutofillHints.givenName], error: e('first'), onChanged: (v) => upd(i, 'first', (p) => p.first = v)),
                const SizedBox(height: 12),
                AppTextField(label: 'Last name', placeholder: 'As on ID', value: t.last, textCapitalization: TextCapitalization.words, autofillHints: const [AutofillHints.familyName], error: e('last'), onChanged: (v) => upd(i, 'last', (p) => p.last = v)),
                if (intl) ...[
                  const SizedBox(height: 12),
                  AppTextField(label: 'Passport number', placeholder: 'e.g. A01234567', value: t.passport, maxLength: 9, textCapitalization: TextCapitalization.characters, error: e('passport'), onChanged: (v) => upd(i, 'passport', (p) => p.passport = v.toUpperCase().replaceAll(RegExp('[^A-Z0-9]'), ''))),
                  const SizedBox(height: 12),
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Expanded(child: DateField(label: 'Passport expiry', value: t.expiry ?? '', min: today(), error: e('expiry'), onChanged: (v) => upd(i, 'expiry', (p) => p.expiry = v))),
                    const SizedBox(width: 10),
                    Expanded(child: SelectField<String>(label: 'Nationality', value: t.nationality, options: [for (final x in _nationalities) SelectOption(x, x)], onChanged: (v) => upd(i, 'nationality', (p) => p.nationality = v))),
                  ]),
                ],
              ]);
            }),
          ),
        ),
      CardBox(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const AppText('Contact details', weight: FontWeight.w700),
          const AppText('E-ticket and flight updates go here.', v: TV.xs, muted: true),
          const SizedBox(height: 12),
          AppTextField(label: 'Email', keyboardType: TextInputType.emailAddress, value: b.email, error: errs['contact.email'], onChanged: (v) { setB((x) => x.email = v); clear('contact.email'); }),
          const SizedBox(height: 12),
          AppTextField(label: 'Phone', placeholder: '080...', keyboardType: TextInputType.phone, value: b.phone, error: errs['contact.phone'], onChanged: (v) { setB((x) => x.phone = v); clear('contact.phone'); }),
        ]),
      ),
    ]);
  }
}

/* ---------------- Step 3: Seats ---------------- */
class _SeatsStep extends StatelessWidget {
  final BookingDraft b;
  final void Function(void Function(BookingDraft)) setB;
  final bool intl;
  const _SeatsStep({required this.b, required this.setB, required this.intl});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final seated = [for (var i = 0; i < b.travellers.length; i++) if (b.travellers[i].type != 'infant') (t: b.travellers[i], i: i)];
    final leg = b.legs[b.seatLeg];
    final L = seatLayout(b.cabin);
    final taken = takenSeats(leg.flight, b.cabin);
    final xPrice = extraLegroomPrice(intl);
    ({Passenger t, int i})? ownerOf(String seat) {
      for (final x in seated) { if (b.seats['${b.seatLeg}-${x.i}']?.seat == seat) return x; }
      return null;
    }
    String initials(Passenger t) => t.first.isNotEmpty && t.last.isNotEmpty ? (t.first[0] + t.last[0]).toUpperCase() : t.label[0] + t.label.split(' ')[1];
    final curPax = seated.any((x) => x.i == b.seatPax) ? b.seatPax : (seated.isNotEmpty ? seated.first.i : 0);

    void pick(String seat, int row) {
      final owner = ownerOf(seat);
      final key = '${b.seatLeg}-$curPax';
      if (owner != null && owner.i == curPax) { setB((x) => x.seats.remove(key)); return; }
      if (owner != null) { toast('Seat $seat is already chosen for ${owner.t.label}', type: ToastType.warning); return; }
      final price = L.extra.contains(row) ? xPrice : 0.0;
      setB((x) {
        x.seats = {...x.seats, key: (seat: seat, price: price)};
        var seatLeg = x.seatLeg, seatPax = curPax;
        final nextPax = seated.where((p) => !x.seats.containsKey('${x.seatLeg}-${p.i}'));
        if (nextPax.isNotEmpty) {
          seatPax = nextPax.first.i;
        } else if (x.seatLeg < x.legs.length - 1) {
          final nl = x.seatLeg + 1;
          final un = seated.where((p) => !x.seats.containsKey('$nl-${p.i}'));
          if (un.isNotEmpty) {
            seatLeg = nl;
            seatPax = un.first.i;
            toast('Now choose seats for ${x.legs[nl].from} → ${x.legs[nl].to}', type: ToastType.info);
          }
        }
        x.seatsSkipped = false;
        x.seatLeg = seatLeg;
        x.seatPax = seatPax;
      });
    }

    final seatW = L.wide ? 52.0 : 40.0;
    Widget legend(Color col, String l) => Row(mainAxisSize: MainAxisSize.min, children: [Container(width: 14, height: 14, decoration: BoxDecoration(color: col, borderRadius: BorderRadius.circular(4))), const SizedBox(width: 5), AppText(l, v: TV.xs, muted: true)]);
    Widget gapCol(String col) => col == L.aisleAfter ? const SizedBox(width: 18) : const SizedBox.shrink();

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const AppText('Choose your seats', v: TV.h3),
      const Padding(padding: EdgeInsets.only(bottom: 12), child: AppText('Optional — skip and seats are assigned free at check-in.', v: TV.sm, muted: true)),
      if (b.legs.length > 1)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(children: [
            for (var i = 0; i < b.legs.length; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              Expanded(
                child: Material(
                  color: i == b.seatLeg ? c.primary : c.surface,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.md), side: BorderSide(color: i == b.seatLeg ? c.primary : c.border)),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(R.md),
                    onTap: () => setB((x) => x.seatLeg = i),
                    child: Padding(padding: const EdgeInsets.symmetric(vertical: 10), child: AppText('${b.legs[i].from} → ${b.legs[i].to}', weight: FontWeight.w700, center: true, color: i == b.seatLeg ? Colors.white : c.text)),
                  ),
                ),
              ),
            ],
          ]),
        ),
      const Padding(padding: EdgeInsets.only(bottom: 6), child: AppText('Selecting for', v: TV.label, muted: true)),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: [
          for (final x in seated)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () => setB((d) => d.seatPax = x.i),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.md), border: Border.all(color: x.i == curPax ? c.primary : c.border, width: 1.5), color: x.i == curPax ? c.primarySoft : c.surface),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    AppText(x.t.first.isNotEmpty ? '${x.t.first} ${x.t.last}' : x.t.label, v: TV.sm, weight: FontWeight.w700),
                    AppText(() { final s = b.seats['${b.seatLeg}-${x.i}']; return s != null ? 'Seat ${s.seat} · ${s.price > 0 ? f.naira(s.price) : 'Free'}' : 'No seat yet'; }(), v: TV.xs, muted: true),
                  ]),
                ),
              ),
            ),
        ]),
      ),
      const SizedBox(height: 12),
      Wrap(spacing: 12, runSpacing: 8, children: [
        legend(c.surface2, 'Included'),
        legend(c.violetSoft, 'Extra legroom · ${f.naira(xPrice)}'),
        legend(c.border, 'Taken'),
        legend(c.primary, 'Selected'),
        if (seated.length > 1) legend(c.primary300, 'Other traveller'),
      ]),
      const SizedBox(height: 12),
      CardBox(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Column(children: [
            Container(
              width: 220, height: 26, margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(color: c.surface2, borderRadius: const BorderRadius.vertical(top: Radius.circular(60))),
              alignment: Alignment.bottomCenter,
              child: AppText('Front · ${cabinOf(b.cabin).label}', v: TV.xs, muted: true),
            ),
            Row(children: [
              const SizedBox(width: 30),
              for (final col in L.cols) ...[SizedBox(width: seatW + 6, child: AppText(col, v: TV.xs, muted: true, weight: FontWeight.w700, center: true)), gapCol(col)],
            ]),
            const SizedBox(height: 4),
            for (final row in L.rows) ...[
              if (L.extra.contains(row) && b.cabin == 'Economy') Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: AppText('EXIT', v: TV.xs, weight: FontWeight.w700, color: c.danger, center: true)),
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(children: [
                  SizedBox(width: 30, child: AppText('$row', v: TV.xs, muted: true, center: true)),
                  for (final col in L.cols) ...[
                    Builder(builder: (context) {
                      final id = '$row$col';
                      final isTaken = taken.contains(id);
                      final owner = ownerOf(id);
                      final own = owner != null && owner.i == curPax;
                      final extra = L.extra.contains(row);
                      final bg = isTaken ? c.border : own ? c.primary : owner != null ? c.primary300 : extra ? c.violetSoft : c.surface2;
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: Semantics(
                          label: 'Seat $id${isTaken ? ' taken' : ''}', button: true,
                          child: GestureDetector(
                            onTap: isTaken ? null : () => pick(id, row),
                            child: Opacity(
                              opacity: isTaken ? 0.5 : 1,
                              child: Container(
                                width: seatW, height: 38,
                                decoration: BoxDecoration(color: bg, borderRadius: const BorderRadius.only(topLeft: Radius.circular(12), topRight: Radius.circular(12), bottomLeft: Radius.circular(9), bottomRight: Radius.circular(9))),
                                child: Center(child: isTaken ? AppIcon('bi-x-lg', size: 12, color: c.muted) : AppText(owner != null ? initials(owner.t) : col, size: 11, weight: FontWeight.w700, color: owner != null ? Colors.white : extra ? c.violet : c.muted)),
                              ),
                            ),
                          ),
                        ),
                      );
                    }),
                    gapCol(col),
                  ],
                ]),
              ),
            ],
          ]),
        ),
      ),
      const SizedBox(height: 10),
      AppText('${airlineName(leg.flight.airline)} ${leg.flight.flightNo} · ${cabinOf(b.cabin).label} cabin${leg.flight.stops > 0 ? ' · seat applies to all segments' : ''}', v: TV.xs, muted: true),
    ]);
  }
}

/* ---------------- Step 4: Add-ons ---------------- */
class _AddonsStep extends StatelessWidget {
  final BookingDraft b;
  final void Function(void Function(BookingDraft)) setB;
  final bool intl;
  const _AddonsStep({required this.b, required this.setB, required this.intl});
  @override
  Widget build(BuildContext context) {
    final t = bookingTotals(b);
    final n = b.legs.length;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const AppText('Make your trip better', v: TV.h3),
      const Padding(padding: EdgeInsets.only(bottom: 12), child: AppText('All add-ons are optional.', v: TV.sm, muted: true)),
      CardBox(
        child: Column(children: [
          Row(children: [
            const IconTile('bi-bag', tone: 'orange'),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const AppText('Extra checked bag', weight: FontWeight.w700),
              AppText('23kg per bag · ${f.naira(bagPrice(intl))} per bag, per flight${n > 1 ? ' (×$n flights)' : ''}', v: TV.xs, muted: true),
            ])),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: AppText(t.bags > 0 ? f.naira(t.bags) : 'None', weight: FontWeight.w600, tabular: true)),
            QtyStepper(value: b.bags, min: 0, max: t.seated * 2, onChanged: (v) => setB((x) => x.bags = v)),
          ]),
        ]),
      ),
      const SizedBox(height: 12),
      CardBox(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: SwitchRow(icon: 'bi-shield-check', tone: 'success', title: 'Travel insurance', subtitle: 'Medical cover, trip cancellation & lost baggage · ${f.naira(insPrice(intl))} per traveller${b.insurance ? ' · ${f.naira(t.insurance)}' : ''}', value: b.insurance, onChanged: (v) => setB((x) => x.insurance = v)),
      ),
      const SizedBox(height: 12),
      CardBox(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: SwitchRow(icon: 'bi-lightning-charge', tone: 'violet', title: 'Priority boarding', subtitle: 'Board first & fast-track security · ${f.naira(prioPrice)} per traveller, per flight · ${f.naira(prioPrice * t.seated * n)}', value: b.priority, onChanged: (v) => setB((x) => x.priority = v)),
      ),
    ]);
  }
}

/* ---------------- Step 5: Payment ---------------- */
class _PaymentStep extends StatelessWidget {
  final BookingDraft b;
  final void Function(void Function(BookingDraft)) setB;
  final double total;
  final Map<String, String> errs;
  final VoidCallback clearAgree;
  const _PaymentStep({required this.b, required this.setB, required this.total, required this.errs, required this.clearAgree});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final balance = context.watch<AppStore>().spendable;
    final can = balance >= total;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Padding(padding: EdgeInsets.only(bottom: 10), child: AppText('Review & pay', v: TV.h3)),
      CardBox(
        child: Column(children: [
          for (var i = 0; i < b.legs.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            Row(children: [
              AirlineLogo(b.legs[i].flight.airline, size: 32),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppText('${b.legs[i].from} ${f.hhmm(b.legs[i].flight.dep)} → ${b.legs[i].to} ${f.hhmm(b.legs[i].flight.arr)}${b.legs[i].flight.arr >= 1440 ? ' +1' : ''}', weight: FontWeight.w700),
                AppText('${f.longDay(f.parseDay(b.legs[i].date))} · ${airlineName(b.legs[i].flight.airline)} ${b.legs[i].flight.flightNo} · ${f.dur(b.legs[i].flight.duration)}', v: TV.xs, muted: true),
              ])),
            ]),
          ],
        ]),
      ),
      const SizedBox(height: 12),
      CardBox(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const AppText('Travellers', v: TV.label, muted: true),
          for (var i = 0; i < b.travellers.length; i++)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  AppText('${b.travellers[i].title} ${b.travellers[i].first} ${b.travellers[i].last}', weight: FontWeight.w600),
                  AppText('${b.travellers[i].label}${b.travellers[i].passport.isNotEmpty ? ' · ${b.travellers[i].passport}' : ''}', v: TV.xs, muted: true),
                ])),
                AppText(b.travellers[i].type == 'infant' ? 'On lap' : [for (var li = 0; li < b.legs.length; li++) b.seats['$li-$i']?.seat ?? '—'].join(' / '), v: TV.sm, weight: FontWeight.w600),
              ]),
            ),
          Padding(padding: const EdgeInsets.symmetric(vertical: 10), child: Container(height: 1, color: c.border)),
          AppText('Contact: ${b.email} · ${b.phone}', v: TV.xs, muted: true),
        ]),
      ),
      const SizedBox(height: 12),
      _PriceSummary(b),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.lg), border: Border.all(color: can ? c.border : c.danger, width: 1.5)),
        child: Row(children: [
          const IconTile('bi-wallet2', size: 36),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const AppText('Pay from wallet', weight: FontWeight.w600),
            AppText('Balance: ${f.naira(balance, 2)}', v: TV.xs, muted: true),
          ])),
          can ? AppIcon('bi-check-circle-fill', size: 20, color: c.success) : Btn('Top up', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: openFund),
        ]),
      ),
      const SizedBox(height: 12),
      AppCheckbox(
        checked: b.agree,
        onChanged: (v) { setB((x) => x.agree = v); clearAgree(); },
        label: 'I accept the fare rules and confirm traveller names match their travel documents.',
        error: errs['agree'],
      ),
      if (!can) const Padding(padding: EdgeInsets.only(top: 10), child: Notice('Your wallet balance is lower than the total. Top up to complete this booking.', tone: 'warning', icon: 'bi-exclamation-triangle')),
      const SizedBox(height: 6),
      const Align(alignment: Alignment.centerLeft, child: StatusPill('info', label: 'Secure payment · PIN protected')),
    ]);
  }
}
