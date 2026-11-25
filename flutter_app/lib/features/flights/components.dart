/// Shared flight widgets — port of mobile_app/src/features/flights/components.tsx.
library;

import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../data/catalog.dart';
import '../../store/models.dart';
import '../../ui/ui.dart';
import 'engine.dart';

class AirlineLogo extends StatelessWidget {
  final String code;
  final double size;
  const AirlineLogo(this.code, {super.key, this.size = 40});
  @override
  Widget build(BuildContext context) => Container(
        width: size, height: size,
        decoration: BoxDecoration(color: airlineColor(code), borderRadius: BorderRadius.circular(size * 0.28)),
        child: Center(child: AppText(code, weight: FontWeight.w800, size: size * 0.32, color: Colors.white)),
      );
}

/* ---------------- Airport picker ---------------- */
class AirportField extends StatelessWidget {
  final String label, value, icon;
  final ValueChanged<String> onChanged;
  final String? error;
  const AirportField({super.key, required this.label, required this.value, required this.onChanged, required this.icon, this.error});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final a = airportByCode(value);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      Material(
        color: c.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.lg), side: BorderSide(color: error != null ? c.danger : c.border, width: 1.5)),
        child: InkWell(
          borderRadius: BorderRadius.circular(R.lg),
          onTap: () async {
            final code = await showSheet<String>(_AirportSheet(title: label, value: value));
            if (code != null) onChanged(code);
          },
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [AppIcon(icon, size: 14, color: c.muted), const SizedBox(width: 6), Flexible(child: AppText(label, v: TV.xs, muted: true, maxLines: 1))]),
              const SizedBox(height: 2),
              if (a != null) ...[
                AppText(a.code, v: TV.h2),
                AppText('${a.city}, ${a.country}', v: TV.xs, muted: true, maxLines: 1),
              ] else ...[
                const AppText('—', v: TV.h2, muted: true),
                const AppText('City or airport', v: TV.xs, muted: true),
              ],
            ]),
          ),
        ),
      ),
      FieldError(error: error),
    ]);
  }
}

class _AirportSheet extends StatefulWidget {
  final String title, value;
  const _AirportSheet({required this.title, required this.value});
  @override
  State<_AirportSheet> createState() => _AirportSheetState();
}

class _AirportSheetState extends State<_AirportSheet> {
  String q = '';
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = q.toLowerCase().replaceAll(RegExp(r'\(.*?\)'), '').trim();
    List<Airport> list = [...airports];
    if (s.isNotEmpty) {
      list = airports.where((x) => [x.code, x.city, x.name, x.country].any((v) => v.toLowerCase().contains(s))).toList();
      int score(Airport x) => (x.code.toLowerCase() == s ? 2 : 0) + (x.city.toLowerCase().startsWith(s) ? 1 : 0);
      list.sort((x, y) => score(y).compareTo(score(x)));
    }
    return AppSheet(
      title: widget.title,
      maxHeightFactor: 0.85,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(padding: const EdgeInsets.only(bottom: 8), child: AppTextField(icon: 'bi-search', placeholder: 'City or airport', value: q, autofocus: true, autocorrect: false, onChanged: (v) => setState(() => q = v))),
        for (final x in list)
          Material(
            color: x.code == widget.value ? c.primarySoft : Colors.transparent,
            borderRadius: BorderRadius.circular(R.md),
            child: InkWell(
              borderRadius: BorderRadius.circular(R.md),
              onTap: () => Navigator.of(context).pop(x.code),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 8),
                child: Row(children: [
                  Container(width: 48, padding: const EdgeInsets.symmetric(vertical: 4), decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(R.sm)), child: AppText(x.code, weight: FontWeight.w800, size: 13, center: true)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    AppText('${x.city}, ${x.country}', weight: FontWeight.w600),
                    AppText(x.name, v: TV.xs, muted: true),
                  ])),
                ]),
              ),
            ),
          ),
        if (list.isEmpty) Padding(padding: const EdgeInsets.all(20), child: AppText('No airports match “$q”', muted: true, center: true)),
      ]),
    );
  }
}

/* ---------------- Times line ---------------- */
class TimesLine extends StatelessWidget {
  final Flight fl;
  final bool big;
  const TimesLine(this.fl, {super.key, this.big = false});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final nd = nextDay(fl.arr);
    final tv = big ? TV.h2 : TV.h3;
    Widget line() => Expanded(child: Container(height: 1.5, color: c.border));
    return Row(children: [
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        AppText(f.hhmm(fl.dep), v: tv, tabular: true),
        AppText(fl.from, v: TV.xs, muted: true, weight: FontWeight.w600),
      ]),
      const SizedBox(width: 10),
      Expanded(child: Column(children: [
        AppText(f.dur(fl.duration), v: TV.xs, muted: true),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(children: [
            Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: c.muted, width: 1.5))),
            line(),
            if (fl.stops > 0) ...[Container(width: 7, height: 7, decoration: BoxDecoration(shape: BoxShape.circle, color: c.warning)), line()],
            AppIcon('ion:airplane', size: 13, color: c.primary),
          ]),
        ),
        AppText(fl.stops > 0 ? '1 stop · ${fl.via?.code}' : 'Direct', v: TV.xs, weight: FontWeight.w600, color: fl.stops > 0 ? c.warningText : c.success),
      ])),
      const SizedBox(width: 10),
      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          AppText(f.hhmm(fl.arr), v: tv, tabular: true),
          if (nd > 0) AppText('+$nd', size: 10, weight: FontWeight.w700, color: c.danger),
        ]),
        AppText(fl.to, v: TV.xs, muted: true, weight: FontWeight.w600),
      ]),
    ]);
  }
}

/* ---------------- Itinerary timeline ---------------- */
class FlightTimeline extends StatelessWidget {
  final Flight fl;
  final String cabin;
  const FlightTimeline(this.fl, this.cabin, {super.key});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (var i = 0; i < fl.segments.length; i++) ...[
          IntrinsicHeight(
            child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              SizedBox(
                width: 14,
                child: Column(children: [
                  Container(width: 10, height: 10, margin: const EdgeInsets.only(top: 4), decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: c.primary, width: 2))),
                  Expanded(child: Container(width: 2, constraints: const BoxConstraints(minHeight: 34), color: c.border)),
                  Container(width: 10, height: 10, decoration: BoxDecoration(shape: BoxShape.circle, color: c.primary)),
                ]),
              ),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppText('${f.hhmm(fl.segments[i].dep)} · ${fl.segments[i].fromCity} (${fl.segments[i].from})', v: TV.sm, weight: FontWeight.w700),
                AppText(airportName(fl.segments[i].from), v: TV.xs, muted: true),
                const SizedBox(height: 4),
                AppText('${airlineName(fl.airline)} ${fl.segments[i].flightNo} · ${f.dur(fl.segments[i].mins)} · ${cabinOf(cabin).label}', v: TV.xs, muted: true),
                const SizedBox(height: 4),
                AppText('${f.hhmm(fl.segments[i].arr)} · ${fl.segments[i].toCity} (${fl.segments[i].to})', v: TV.sm, weight: FontWeight.w700),
                AppText(airportName(fl.segments[i].to), v: TV.xs, muted: true),
              ])),
            ]),
          ),
          if (i < fl.segments.length - 1)
            Container(
              margin: const EdgeInsets.only(left: 24, top: 8, bottom: 8),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: c.warningSoft, borderRadius: BorderRadius.circular(R.sm)),
              child: Row(children: [
                AppIcon('bi-clock', size: 13, color: c.warningText),
                const SizedBox(width: 6),
                Expanded(child: AppText('${f.dur(fl.layover)} layover in ${fl.segments[i].toCity}', v: TV.xs, weight: FontWeight.w600, color: c.warningText)),
              ]),
            ),
        ],
      ]),
    );
  }
}

/* ---------------- Flight card ---------------- */
class FlightCard extends StatefulWidget {
  final Flight fl;
  final String cabin;
  final int travellers;
  final double totalFor;
  final ({String label, String tone})? tag;
  final VoidCallback onSelect;
  const FlightCard({super.key, required this.fl, required this.cabin, required this.travellers, required this.totalFor, this.tag, required this.onSelect});
  @override
  State<FlightCard> createState() => _FlightCardState();
}

class _FlightCardState extends State<FlightCard> {
  bool open = false;
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final fl = widget.fl;
    final fare = fareFor(fl, widget.cabin);
    final bag = baggage(fl, widget.cabin);
    final refundable = refundableFor(fl, widget.cabin);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(R.xl), border: c.dark ? Border.all(color: c.border) : null, boxShadow: shadow(c)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          AirlineLogo(fl.airline, size: 36),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AppText(airlineName(fl.airline), weight: FontWeight.w700, maxLines: 1),
            AppText(fl.segments.map((s) => s.flightNo).join(' · '), v: TV.xs, muted: true, maxLines: 1),
          ])),
          if (widget.tag != null) Pill(widget.tag!.label, tone: widget.tag!.tone),
        ]),
        const SizedBox(height: 12),
        TimesLine(fl),
        const SizedBox(height: 12),
        Wrap(spacing: 6, runSpacing: 6, children: [
          Pill(bag.hold, icon: 'bi-bag', tone: 'neutral'),
          Pill('${cabinOf(widget.cabin).label} cabin', tone: 'neutral'),
          Pill(refundable ? 'Refundable' : 'Non-refundable', tone: refundable ? 'success' : 'neutral'),
          if (fl.seatsLeft <= 5) Pill('${fl.seatsLeft} seats left', tone: 'danger'),
        ]),
        if (open) Container(margin: const EdgeInsets.only(top: 12), padding: const EdgeInsets.only(top: 12), decoration: BoxDecoration(border: Border(top: BorderSide(color: c.border))), child: FlightTimeline(fl, widget.cabin)),
        Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Container(height: 1, color: c.border)),
        Row(children: [
          GestureDetector(
            onTap: () => setState(() => open = !open),
            child: Row(children: [
              AppText('Flight details', v: TV.sm, weight: FontWeight.w600, color: c.primary),
              const SizedBox(width: 4),
              AppIcon(open ? 'bi-chevron-up' : 'bi-chevron-down', size: 14, color: c.primary),
            ]),
          ),
          const Spacer(),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            AppText(f.naira(fare), v: TV.h3, tabular: true),
            AppText(widget.travellers > 1 ? '${f.naira(widget.totalFor)} for ${widget.travellers}' : 'per adult', v: TV.xs, muted: true),
          ]),
          const SizedBox(width: 12),
          SizedBox(height: 40, child: Btn('Select', size: BtnSize.sm, onPressed: widget.onSelect)),
        ]),
      ]),
    );
  }
}
