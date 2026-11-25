import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../features/flights/engine.dart';
import '../../features/flights/state.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Seeded barcode (same bar sequence as the RN/web e-ticket).
class _BarcodePainter extends CustomPainter {
  final String value;
  final Color color;
  _BarcodePainter(this.value, this.color);
  @override
  void paint(Canvas canvas, Size size) {
    final r = seed(value);
    final sx = size.width / 280;
    final paint = Paint()..color = color;
    var x = 0;
    while (x < 280) {
      final w = 1 + (r() * 3.5).floor();
      if (r() > 0.35) canvas.drawRect(Rect.fromLTWH(x * sx, 0, w * sx, size.height), paint);
      x += w + 1 + (r() * 2).floor();
    }
  }
  @override
  bool shouldRepaint(_BarcodePainter old) => old.value != value || old.color != color;
}

class _BoardingPass extends StatelessWidget {
  final Booking b;
  final int li, pi;
  final Passenger p;
  const _BoardingPass({required this.b, required this.li, required this.p, required this.pi});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final l = b.legs[li];
    final fl = l.flight;
    final seat = b.seats['$li-$pi']?.seat ?? (p.type == 'infant' ? 'Lap' : 'At check-in');
    final cancelled = b.status == 'Cancelled';
    final d = nextDay(fl.arr);
    Widget cell(String k, String v, [Color? color]) => FractionallySizedBox(
          widthFactor: 1 / 3,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText(k.toUpperCase(), size: 10, weight: FontWeight.w600, muted: true),
              AppText(v, v: TV.sm, weight: FontWeight.w700, color: color, maxLines: 1),
            ]),
          ),
        );
    final notch = Container(width: 20, height: 20, decoration: BoxDecoration(color: c.bg, shape: BoxShape.circle));
    return Opacity(
      opacity: cancelled ? 0.75 : 1,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(R.xl), border: c.dark ? Border.all(color: c.border) : null, boxShadow: shadow(c, 2)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(
            color: airlineColor(fl.airline),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(children: [
              Container(width: 28, height: 28, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)), child: Center(child: AppText(fl.airline, size: 10, weight: FontWeight.w800, color: Colors.white))),
              const SizedBox(width: 8),
              Expanded(child: AppText(airlineName(fl.airline), weight: FontWeight.w700, color: Colors.white, maxLines: 1)),
              AppText('BOARDING PASS · ${cabinOf(b.cabin).label.toUpperCase()}', size: 10, weight: FontWeight.w700, color: Colors.white.withValues(alpha: 0.85)),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              Row(children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  AppText(fl.from, v: TV.display),
                  AppText(cityOf(fl.from), v: TV.xs, muted: true),
                  AppText(f.hhmm(fl.dep), weight: FontWeight.w700, tabular: true),
                ]),
                Expanded(child: Column(children: [
                  AppIcon('ion:airplane', size: 22, color: airlineColor(fl.airline)),
                  AppText(f.dur(fl.duration), v: TV.xs, muted: true),
                  AppText(fl.via != null ? 'via ${fl.via!.code}' : 'Direct', v: TV.xs, weight: FontWeight.w600, color: fl.via != null ? c.warningText : c.success),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  AppText(fl.to, v: TV.display),
                  AppText(cityOf(fl.to), v: TV.xs, muted: true),
                  AppText('${f.hhmm(fl.arr)}${d > 0 ? ' +$d' : ''}', weight: FontWeight.w700, tabular: true),
                ]),
              ]),
              const SizedBox(height: 12),
              Wrap(children: [
                cell('Passenger', '${p.title} ${p.first} ${p.last}'.toUpperCase().trim()),
                cell('Date', f.date(f.parseDay(l.date))),
                cell('Flight', fl.flightNo),
                cell('Boarding', f.hhmm(boardingTime(fl))),
                cell('Gate', gateFor(fl)),
                cell('Seat', seat),
                cell('Class', b.cabin),
                cell('Status', b.status.toUpperCase(), cancelled ? c.danger : c.success),
              ]),
            ]),
          ),
          Transform.translate(
            offset: const Offset(0, 0),
            child: Row(children: [
              Transform.translate(offset: const Offset(-10, 0), child: notch),
              Expanded(child: LayoutBuilder(builder: (context, cons) {
                final n = (cons.maxWidth / 8).floor();
                return Row(children: [for (var i = 0; i < n; i++) Container(width: 4, height: 1.5, margin: const EdgeInsets.only(right: 4), color: c.border)]);
              })),
              Transform.translate(offset: const Offset(10, 0), child: notch),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                const Expanded(child: AppText('BOOKING REF (PNR)', size: 10, weight: FontWeight.w600, muted: true)),
                Text(b.pnr, style: tvStyle(context, TV.h3).copyWith(letterSpacing: 2)),
              ]),
              const SizedBox(height: 8),
              SizedBox(height: 46, child: CustomPaint(painter: _BarcodePainter('${b.pnr}$li$pi', c.text))),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(child: AppText('${b.pnr}-${li + 1}${pi + 1}-${fl.flightNo.replaceFirst(' ', '')}', v: TV.xs, muted: true)),
                AppText('${fl.from} → ${fl.to} · ${p.first}', v: TV.xs, muted: true),
              ]),
            ]),
          ),
        ]),
      ),
    );
  }
}

/// Route: /flights/ticket/:id (q: fresh=1)
class FlightTicketScreen extends StatefulWidget {
  final String id;
  /// query parameters
  final Map<String, String> q;
  const FlightTicketScreen({super.key, required this.id, this.q = const {}});
  @override
  State<FlightTicketScreen> createState() => _FlightTicketScreenState();
}

class _FlightTicketScreenState extends State<FlightTicketScreen> {
  bool get fresh => widget.q['fresh'] != null;

  @override
  void initState() {
    super.initState();
    if (fresh) HapticFeedback.mediumImpact();
  }

  void _done() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(loc('/flights', {'view': 'trips'}));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    Booking? b;
    for (final x in s.bookings) { if (x.id == widget.id) b = x; }
    if (b == null) {
      return AppScreen(
        header: const AppHeader(title: 'E-ticket', fallback: '/flights'),
        children: [EmptyState(icon: 'bi-airplane', title: 'Booking not found', message: 'This booking may have been removed.', action: 'My trips', onAction: () => context.go(loc('/flights', {'view': 'trips'})))],
      );
    }
    final bk = b;
    final route = routeString(bookingRoute(bk), bk.trip);
    final n = bk.passengers.length;
    final intl = bk.legs.any((l) => !l.flight.domestic);
    void share() => shareText(
          'AutoBiz e-ticket ${bk.pnr}',
          [
            'AutoBiz · E-ticket',
            'PNR ${bk.pnr} · Issued ${f.datetime(bk.createdAt)}',
            route,
            ...bk.legs.map((l) => '${l.from} ${f.hhmm(l.flight.dep)} → ${l.to} ${f.hhmm(l.flight.arr)} · ${f.date(f.parseDay(l.date))} · ${airlineName(l.flight.airline)} ${l.flight.flightNo}'),
            'Travellers: ${bk.passengers.map((p) => '${p.first} ${p.last}').join(', ')}',
            'Total ${f.naira(bk.total)}',
          ].join('\n'),
        );
    return AppScreen(
      header: AppHeader(title: 'E-ticket · ${bk.pnr}', subtitle: '$route · $n traveller${n > 1 ? 's' : ''} · ${f.naira(bk.total)}', fallback: '/flights?view=trips'),
      footer: Row(children: [
        Expanded(child: Btn('Copy PNR', icon: 'bi-copy', variant: BtnVariant.soft, onPressed: () => copyText(bk.pnr, 'PNR copied'))),
        const SizedBox(width: 10),
        Expanded(child: Btn('Share', icon: 'bi-share', variant: BtnVariant.soft, onPressed: share)),
        const SizedBox(width: 10),
        Expanded(child: Btn('Done', onPressed: _done)),
      ]),
      children: [
        if (fresh)
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Column(children: [
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1), duration: const Duration(milliseconds: 500), curve: Curves.elasticOut,
                builder: (_, v, child) => Transform.scale(scale: v, child: child),
                child: Container(width: 64, height: 64, decoration: BoxDecoration(color: c.successSoft, shape: BoxShape.circle), child: Center(child: AppIcon('bi-check-lg', size: 32, color: c.success))),
              ),
              const SizedBox(height: 6),
              const StatusPill('success', label: 'Payment successful'),
              const SizedBox(height: 8),
              const AppText("You're booked!", v: TV.h2),
            ]),
          ),
        if (bk.status == 'Cancelled') Padding(padding: const EdgeInsets.only(bottom: 14), child: Notice('This booking was cancelled · ${f.naira(bk.refund ?? 0)} refunded to wallet.', tone: 'danger', icon: 'bi-x-circle')),
        for (var li = 0; li < bk.legs.length; li++)
          for (var pi = 0; pi < bk.passengers.length; pi++) _BoardingPass(b: bk, li: li, p: bk.passengers[pi], pi: pi),
        AppText('Present this pass with a valid ${intl ? 'passport' : 'ID'} at the airport. A copy was sent to ${bk.contact.email}.', v: TV.xs, muted: true, center: true),
      ],
    );
  }
}
