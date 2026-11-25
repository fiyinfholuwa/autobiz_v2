/// Budget gauge + compare bar chart — ported from mobile_app/src/features/home/charts.tsx.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../ui/ui.dart';

/// Semicircle budget gauge (r=72) with needle.
class BudgetGauge extends StatelessWidget {
  final double spent, budget;
  const BudgetGauge({super.key, required this.spent, required this.budget});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final fill = math.min(spent / budget, 1.0);
    final over = spent > budget;
    final pct = (spent / budget * 100).round();
    return Column(children: [
      SizedBox(
        width: 180, height: 104,
        child: CustomPaint(painter: _GaugePainter(fill: fill.isNaN ? 0 : fill, track: c.surface2, color: over ? c.danger : c.primary, needle: c.text)),
      ),
      Transform.translate(offset: const Offset(0, -6), child: AppText('$pct%', v: TV.h2, tabular: true, color: over ? c.danger : c.text)),
      SizedBox(
        width: 180,
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const AppText('₦0', v: TV.xs, muted: true),
          const AppText('Spent vs Budget', v: TV.xs, muted: true),
          AppText(f.nairaCompact(budget), v: TV.xs, muted: true),
        ]),
      ),
    ]);
  }
}

class _GaugePainter extends CustomPainter {
  final double fill;
  final Color track, color, needle;
  _GaugePainter({required this.fill, required this.track, required this.color, required this.needle});
  @override
  void paint(Canvas canvas, Size size) {
    const r = 72.0, sw = 16.0, cx = 90.0, cy = 88.0;
    final rect = Rect.fromCircle(center: const Offset(cx, cy), radius: r);
    final p = Paint()..style = PaintingStyle.stroke..strokeWidth = sw..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, math.pi, math.pi, false, p..color = track);
    if (fill > 0) canvas.drawArc(rect, math.pi, math.pi * fill, false, p..color = color);
    final ang = math.pi * (1 - fill);
    final nx = cx + (r - 22) * math.cos(ang), ny = cy - (r - 22) * math.sin(ang);
    canvas.drawLine(const Offset(cx, cy), Offset(nx, ny), Paint()..color = needle..strokeWidth = 3..strokeCap = StrokeCap.round);
    canvas.drawCircle(const Offset(cx, cy), 6, Paint()..color = needle);
  }
  @override
  bool shouldRepaint(_GaugePainter o) => o.fill != fill || o.color != color || o.track != track || o.needle != needle;
}

/// Grouped bar chart: this period (primary) vs last period (muted). Tap a group to see values.
class CompareBars extends StatefulWidget {
  final List<String> labels;
  final List<double> cur, prev;
  final (String, String) legend;
  const CompareBars({super.key, required this.labels, required this.cur, required this.prev, required this.legend});
  @override
  State<CompareBars> createState() => _CompareBarsState();
}

class _CompareBarsState extends State<CompareBars> {
  int? sel;
  static const _h = 170.0, _left = 44.0;

  @override
  void didUpdateWidget(CompareBars old) {
    super.didUpdateWidget(old);
    if (old.labels.length != widget.labels.length) sel = null;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final w = widget;
    Widget legendDot(Color col, String l) => Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 10, height: 10, decoration: BoxDecoration(color: col, borderRadius: BorderRadius.circular(3))),
          const SizedBox(width: 6),
          AppText(l, v: TV.xs, muted: true),
        ]);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      LayoutBuilder(builder: (context, cons) {
        final width = cons.maxWidth;
        return GestureDetector(
          onTapDown: (d) {
            final x = d.localPosition.dx - _left;
            if (x < 0) return;
            final i = (x / ((width - _left) / w.labels.length)).floor().clamp(0, w.labels.length - 1);
            setState(() => sel = sel == i ? null : i);
          },
          child: Semantics(
            label: [for (var i = 0; i < w.labels.length; i++) '${w.labels[i]}: ${w.legend.$1} ${f.naira(w.cur[i])}, ${w.legend.$2} ${f.naira(w.prev[i])}'].join('; '),
            child: CustomPaint(
              size: Size(width, _h),
              painter: _BarsPainter(
                labels: w.labels, cur: w.cur, prev: w.prev, sel: sel,
                primary: c.primary, muted: c.chartMuted, grid: c.border, text: c.text, mutedText: c.muted,
              ),
            ),
          ),
        );
      }),
      const SizedBox(height: 8),
      Row(children: [
        legendDot(c.primary, w.legend.$1),
        const SizedBox(width: 14),
        legendDot(c.chartMuted, w.legend.$2),
        const Spacer(),
        Flexible(
          child: sel != null
              ? AppText('${w.labels[sel!]}: ${f.naira(w.cur[sel!])} · ${f.naira(w.prev[sel!])}', v: TV.xs, weight: FontWeight.w600, maxLines: 1, align: TextAlign.right)
              : const AppText('Tap a bar', v: TV.xs, muted: true),
        ),
      ]),
    ]);
  }
}

class _BarsPainter extends CustomPainter {
  final List<String> labels;
  final List<double> cur, prev;
  final int? sel;
  final Color primary, muted, grid, text, mutedText;
  _BarsPainter({required this.labels, required this.cur, required this.prev, required this.sel, required this.primary, required this.muted, required this.grid, required this.text, required this.mutedText});

  void _text(Canvas canvas, String s, Offset at, Color color, {bool center = false, FontWeight weight = FontWeight.w500}) {
    final tp = TextPainter(text: TextSpan(text: s, style: TextStyle(fontFamily: fontFamily, fontSize: 10, color: color, fontWeight: weight)), textDirection: TextDirection.ltr)..layout();
    tp.paint(canvas, Offset(center ? at.dx - tp.width / 2 : at.dx, at.dy - tp.height / 2));
  }

  @override
  void paint(Canvas canvas, Size size) {
    const left = 44.0, bottom = 22.0, top = 8.0;
    final h = size.height, w = size.width;
    final mx = [1.0, ...cur, ...prev].reduce(math.max);
    final step = ((mx * 1.1) / 4 / 5000).ceil() * 5000.0;
    final yTop = step * 4;
    final plotW = w - left, plotH = h - bottom - top;
    final gw = plotW / labels.length;
    final bw = math.min(14.0, gw / 3.2);
    double y(double v) => top + plotH - (v / yTop) * plotH;
    String tick(double v) => v >= 1e6 ? '₦${(v / 1e6).toStringAsFixed(1)}m' : v == 0 ? '₦0' : '₦${(v / 1000).round()}k';

    final dash = Paint()..color = grid..strokeWidth = 1;
    for (var i = 0; i <= 4; i++) {
      final yy = y(step * i);
      for (var x = left; x < w; x += 7) { canvas.drawLine(Offset(x, yy), Offset(math.min(x + 3, w), yy), dash); }
      _text(canvas, tick(step * i), Offset(0, yy), mutedText);
    }
    for (var i = 0; i < labels.length; i++) {
      final gx = left + gw * i + gw / 2;
      final on = sel == i;
      final base = top + plotH;
      final r = Radius.circular(bw / 2.5);
      final hc = math.max(2.0, base - y(cur[i]));
      final hp = math.max(2.0, base - y(prev[i]));
      canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(gx - bw - 2, base - hc, bw, hc), r), Paint()..color = primary.withValues(alpha: sel == null || on ? 1 : 0.45));
      canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(gx + 2, base - hp, bw, hp), r), Paint()..color = muted);
      _text(canvas, labels[i], Offset(gx, h - 8), on ? text : mutedText, center: true, weight: FontWeight.w600);
    }
  }

  @override
  bool shouldRepaint(_BarsPainter o) => true;
}
