/// eSIM UI pieces — ported from mobile_app/src/features/esim/components.tsx.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../data/catalog.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';
import 'logic.dart';

/* ---------------- Flag or regional tile ---------------- */
class CountryArt extends StatelessWidget {
  final String code;
  final bool regional;
  final String? icon;
  final double size;
  const CountryArt({super.key, required this.code, this.regional = false, this.icon, this.size = 40});
  factory CountryArt.of(EsimCountry c, {double size = 40}) => CountryArt(code: c.code, regional: c.regional, icon: c.icon, size: size);
  factory CountryArt.esim(Esim e, {double size = 40}) => CountryArt(code: e.code, regional: e.regional, icon: e.icon, size: size);
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    if (regional) {
      return Container(
        width: size, height: size,
        decoration: BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: [c.violet, c.primary], begin: Alignment.topLeft, end: Alignment.bottomRight)),
        child: Center(child: AppIcon(icon ?? 'bi-globe2', size: size * 0.55, color: Colors.white)),
      );
    }
    return FlagImg(code, size: size);
  }
}

class CountryTile extends StatelessWidget {
  final EsimCountry country;
  final VoidCallback onTap;
  const CountryTile({super.key, required this.country, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final from = minFrom(country);
    return CardBox(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          CountryArt.of(country, size: 38),
          const Spacer(),
          Pill(country.speed, tone: country.speed.contains('5G') ? 'success' : 'cyan'),
        ]),
        const SizedBox(height: 10),
        AppText(country.name, weight: FontWeight.w700, maxLines: 1),
        AppText(country.regional ? 'Multi-country pack' : country.networks, v: TV.xs, muted: true, maxLines: 1),
        const SizedBox(height: 8),
        AppText('from \$${from.toStringAsFixed(2)}', v: TV.sm, weight: FontWeight.w700, color: c.primary),
        AppText('≈ ${f.naira((from * 1580).round())}', v: TV.xs, muted: true),
      ]),
    );
  }
}

/* ---------------- Device compatibility ---------------- */
class DeviceCheck extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;
  final bool error;
  const DeviceCheck({super.key, required this.value, required this.onChanged, this.error = false});
  @override
  Widget build(BuildContext context) {
    final ok = value.isEmpty ? null : deviceOk(value);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      SelectField<String>(
        label: 'Device compatibility', placeholder: 'Select your phone model…', title: 'Select your phone', searchable: true,
        value: value.isEmpty ? null : value, onChanged: onChanged, options: deviceOptions, error: error ? 'Pick a compatible phone' : null,
      ),
      if (value.isNotEmpty) ...[
        const SizedBox(height: 8),
        ok == true
            ? Notice("**$value** supports eSIM. You're good to go!", tone: 'success', icon: 'bi-check-circle-fill')
            : Notice("**$value** doesn't support eSIM. This plan won't work on this device.", tone: 'danger', icon: 'bi-x-circle-fill'),
      ],
    ]);
  }
}

/* ---------------- Install block (QR + manual codes) ---------------- */
class InstallBlock extends StatelessWidget {
  final String code;
  final bool compact;
  const InstallBlock({super.key, required this.code, this.compact = false});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final p = lpaParts(code);
    Widget field(String label, String v) => Container(
          margin: const EdgeInsets.only(top: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(R.md)),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText(label, v: TV.xs, muted: true),
              AppText(v, v: TV.sm, weight: FontWeight.w600, maxLines: 2, selectable: true),
            ])),
            IconBtn('bi-copy', size: 34, bg: c.surface, tooltip: 'Copy $label', onPressed: () => copyText(v, '$label copied')),
          ]),
        );
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      Center(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(R.lg)),
          child: QrImageView(
            data: code, size: compact ? 150 : 190, backgroundColor: Colors.white, padding: EdgeInsets.zero,
            eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Color(0xFF111111)),
            dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: Color(0xFF111111)),
          ),
        ),
      ),
      const SizedBox(height: 10),
      const AppText('Settings → Mobile data → Add eSIM → Use QR code', v: TV.xs, muted: true, center: true),
      if (compact) const Padding(padding: EdgeInsets.only(top: 6), child: AppText('— or enter manually —', v: TV.xs, muted: true, center: true)),
      field('SM-DP+ address', p.smdp),
      field('Activation code', p.act),
      if (!compact) field('Full LPA string', code),
    ]);
  }
}

/* ---------------- Usage ring ---------------- */
class UsageRing extends StatelessWidget {
  final Esim e;
  const UsageRing(this.e, {super.key});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final st = computeStatus(e);
    final unlimited = e.gb >= 999;
    final used = usedGb(e);
    var frac = 1.0;
    String big, sub;
    var color = c.primary;
    if (st == 'Active') {
      if (unlimited) {
        big = '∞';
        sub = '${used.toStringAsFixed(1)} GB used';
      } else {
        final left = math.max(0.0, e.gb - used);
        frac = left / e.gb;
        big = '${left < 10 ? left.toStringAsFixed(1) : left.toStringAsFixed(0)} GB';
        sub = 'of ${gbStr(e.gb)} GB left';
        if (frac < 0.2) color = c.danger;
      }
    } else if (st == 'Expired') {
      frac = 0; big = '0 GB'; sub = 'expired'; color = c.muted;
    } else {
      big = unlimited ? '∞' : '${gbStr(e.gb)} GB'; sub = 'unused'; color = c.violet;
    }
    return SizedBox(
      width: 96, height: 96,
      child: CustomPaint(
        painter: _RingPainter(frac, color, c.surface2),
        child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          AppText(big, weight: FontWeight.w800, size: 16),
          AppText(sub, size: 10, muted: true, center: true),
        ])),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double frac;
  final Color color, track;
  _RingPainter(this.frac, this.color, this.track);
  @override
  void paint(Canvas canvas, Size size) {
    const r = 40.0;
    final center = Offset(size.width / 2, size.height / 2);
    final p = Paint()..style = PaintingStyle.stroke..strokeWidth = 8..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, r, p..color = track);
    if (frac > 0) canvas.drawArc(Rect.fromCircle(center: center, radius: r), -math.pi / 2, 2 * math.pi * frac.clamp(0.0, 1.0), false, p..color = color);
  }
  @override
  bool shouldRepaint(_RingPainter o) => o.frac != frac || o.color != color || o.track != track;
}

/* ---------------- eSIM card (My eSIMs) ---------------- */
class EsimCard extends StatefulWidget {
  final Esim e;
  const EsimCard(this.e, {super.key});
  @override
  State<EsimCard> createState() => _EsimCardState();
}

class _EsimCardState extends State<EsimCard> {
  bool busy = false;

  Future<void> _archive() async {
    final e = widget.e;
    if (await confirmDialog(ConfirmOpts(title: 'Archive this eSIM?', message: '${e.country} · ${e.data} will be hidden from your list. You can restore it from the Archived filter.', confirmLabel: 'Archive', tone: 'warning', icon: 'mci:archive-outline'))) {
      store.mutate(() => e.archived = true);
      toast('eSIM archived', type: ToastType.info);
    }
  }

  Future<void> _delete() async {
    final e = widget.e;
    final st = computeStatus(e);
    if (await confirmDialog(ConfirmOpts(title: 'Delete this eSIM?', message: 'This permanently removes the ${e.country} eSIM record and its QR code from AutoBiz.${st == 'Active' ? ' **Remaining data will be lost.**' : ''}', confirmLabel: 'Delete', tone: 'danger', icon: 'bi-trash'))) {
      store.mutate(() => store.esims = store.esims.where((x) => x.id != e.id).toList());
      toast('eSIM deleted', type: ToastType.info);
    }
  }

  void _menu() {
    final e = widget.e;
    final actions = <(String, String, VoidCallback, bool)>[
      ('bi-qr-code', 'View QR & instructions', () => context.push('/esim/install/${e.id}'), false),
      ('bi-copy', 'Copy ICCID', () => copyText(e.iccid, 'ICCID copied'), false),
      if (!e.archived) ('mci:archive-outline', 'Archive', _archive, false),
      ('bi-trash', 'Delete', _delete, true),
    ];
    showSheet(Builder(builder: (ctx) {
      final c = ctx.c;
      return AppSheet(
        title: e.country,
        subtitle: e.plan,
        child: Column(children: [
          for (final a in actions)
            InkWell(
              onTap: () { Navigator.of(ctx).pop(); Future.delayed(const Duration(milliseconds: 200), a.$3); },
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Row(children: [
                  AppIcon(a.$1, size: 20, color: a.$4 ? c.danger : c.text),
                  const SizedBox(width: 12),
                  AppText(a.$2, weight: FontWeight.w600, color: a.$4 ? c.danger : null),
                ]),
              ),
            ),
        ]),
      );
    }));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final e = widget.e;
    final st = computeStatus(e);
    final country = countryByCode(e.code);
    final strip = e.archived || st == 'Expired'
        ? const [Color(0xFFADB5BD), Color(0xFF868E96)]
        : st == 'Active' ? [c.primary300, c.primary700] : [c.violet, c.pink];
    final now = f.now();
    final used = usedGb(e);
    final limited = st == 'Active' && e.gb < 999;
    final daysLeft = math.max(0, (((e.expiresAt ?? now) - now) / day).ceil());
    final meta = <(String, String)>[
      (st == 'Active' ? 'Expires' : st == 'Expired' ? 'Expired' : 'Install by', f.date(e.expiresAt ?? e.purchasedAt + 180 * day)),
      st == 'Active' ? ('Days left', '$daysLeft ${daysLeft == 1 ? 'day' : 'days'}') : ('Validity', '${e.days} days'),
      ('Network', country?.networks ?? '—'),
      ('ICCID', '•••• ${last4(e.iccid)}'),
    ];
    final List<Widget> buttons;
    if (e.archived) {
      buttons = [Expanded(child: Btn('Restore', icon: 'bi-arrow-counterclockwise', variant: BtnVariant.soft, onPressed: () { store.mutate(() => e.archived = false); toast('eSIM restored'); }))];
    } else if (st == 'Not installed') {
      buttons = [
        Expanded(child: Btn('Install', icon: 'bi-qr-code', onPressed: () => context.push('/esim/install/${e.id}'))),
        const SizedBox(width: 10),
        Expanded(child: Btn('Mark installed', variant: BtnVariant.soft, loading: busy, onPressed: () async {
          setState(() => busy = true);
          await sleep(800);
          if (mounted) setState(() => busy = false);
          activate(e.id);
        })),
      ];
    } else if (st == 'Active') {
      buttons = [
        Expanded(child: Btn('Top up', icon: 'bi-plus-lg', onPressed: () => context.push(loc('/esim/${e.code}', {'topup': e.id})))),
        const SizedBox(width: 10),
        Expanded(child: Btn('QR & setup', variant: BtnVariant.soft, onPressed: () => context.push('/esim/install/${e.id}'))),
      ];
    } else {
      buttons = [Expanded(child: Btn('Renew', icon: 'bi-arrow-repeat', onPressed: () => context.push(loc('/esim/${e.code}', {'topup': e.id}))))];
    }
    return CardBox(
      padding: EdgeInsets.zero,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(R.xl),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(height: 5, decoration: BoxDecoration(gradient: LinearGradient(colors: strip))),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                CountryArt.esim(e, size: 40),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  AppText(e.country, weight: FontWeight.w700, maxLines: 1),
                  AppText(e.plan, v: TV.xs, muted: true),
                  const SizedBox(height: 6),
                  StatusPill(e.archived ? 'Archived' : st, tone: e.archived ? 'neutral' : st == 'Active' ? 'success' : st == 'Expired' ? 'neutral' : 'primary'),
                ])),
                IconBtn('bi-three-dots-vertical', size: 34, bg: c.surface2, tooltip: 'More options', onPressed: _menu),
              ]),
              const SizedBox(height: 14),
              Row(children: [
                UsageRing(e),
                const SizedBox(width: 14),
                Expanded(child: Wrap(runSpacing: 10, children: [
                  for (final m in meta)
                    FractionallySizedBox(widthFactor: 0.5, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      AppText(m.$1, v: TV.xs, muted: true),
                      AppText(m.$2, v: TV.sm, weight: FontWeight.w600, maxLines: 1),
                    ])),
                ])),
              ]),
              if (limited) ...[
                const SizedBox(height: 12),
                ProgressBar(used / e.gb, color: (e.gb - used) / e.gb < 0.2 ? c.danger : c.primary),
                const SizedBox(height: 4),
                Row(children: [
                  Expanded(child: AppText('${gbStr(used)} GB used', v: TV.xs, muted: true)),
                  AppText('${(used / e.gb * 100).round()}%', v: TV.xs, muted: true),
                ]),
              ],
              if (e.topups.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: AppText('${e.topups.length} top-up${e.topups.length > 1 ? 's' : ''} · last ${f.ago(e.topups.last.at)}', v: TV.xs, muted: true)),
              const SizedBox(height: 14),
              Row(children: buttons),
            ]),
          ),
        ]),
      ),
    );
  }
}

/// Text with **bold** and *italic* segments.
class RichSteps extends StatelessWidget {
  final String text;
  const RichSteps(this.text, {super.key});
  @override
  Widget build(BuildContext context) {
    final base = tvStyle(context, TV.sm);
    final spans = <TextSpan>[];
    final re = RegExp(r'\*\*([^*]+)\*\*|\*([^*]+)\*');
    var i = 0;
    for (final m in re.allMatches(text)) {
      if (m.start > i) spans.add(TextSpan(text: text.substring(i, m.start)));
      if (m[1] != null) {
        spans.add(TextSpan(text: m[1], style: const TextStyle(fontWeight: FontWeight.w700)));
      } else {
        spans.add(TextSpan(text: m[2], style: const TextStyle(fontStyle: FontStyle.italic)));
      }
      i = m.end;
    }
    if (i < text.length) spans.add(TextSpan(text: text.substring(i)));
    return Text.rich(TextSpan(style: base, children: spans));
  }
}
