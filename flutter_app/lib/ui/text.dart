import 'package:flutter/material.dart';

import '../core/theme.dart';

enum TV { display, h1, h2, h3, title, body, sm, xs, label }

class _Spec { final double size, lh; final FontWeight w; final double ls; const _Spec(this.size, this.lh, this.w, [this.ls = 0]); }

const _specs = {
  TV.display: _Spec(32, 38, FontWeight.w800, -0.8),
  TV.h1: _Spec(26, 32, FontWeight.w800, -0.6),
  TV.h2: _Spec(21, 27, FontWeight.w700, -0.4),
  TV.h3: _Spec(17, 23, FontWeight.w700, -0.2),
  TV.title: _Spec(15, 21, FontWeight.w600),
  TV.body: _Spec(15, 22, FontWeight.w400),
  TV.sm: _Spec(13, 18, FontWeight.w400),
  TV.xs: _Spec(12, 16, FontWeight.w400),
  TV.label: _Spec(11, 14, FontWeight.w600, 0.7),
};

/// Text style for a variant (use when composing TextSpans / TextField styles).
TextStyle tvStyle(BuildContext context, TV v, {FontWeight? weight, Color? color, bool muted = false, double? size, bool tabular = false, bool strike = false}) {
  final c = context.c;
  final s = _specs[v]!;
  final fs = size ?? s.size;
  return TextStyle(
    fontFamily: fontFamily,
    fontSize: fs,
    height: (size != null ? fs * 1.3 : s.lh) / fs,
    fontWeight: weight ?? s.w,
    letterSpacing: s.ls,
    color: color ?? (muted ? c.muted : c.text),
    fontFeatures: tabular ? const [FontFeature.tabularFigures()] : null,
    decoration: strike ? TextDecoration.lineThrough : null,
    decorationColor: color ?? (muted ? c.muted : c.text),
  );
}

class AppText extends StatelessWidget {
  final String text;
  final TV v;
  final FontWeight? weight;
  final Color? color;
  final bool muted, center, tabular, strike, selectable;
  final double? size;
  final int? maxLines;
  final TextAlign? align;
  const AppText(this.text, {super.key, this.v = TV.body, this.weight, this.color, this.muted = false, this.center = false, this.tabular = false, this.strike = false, this.size, this.maxLines, this.align, this.selectable = false});

  @override
  Widget build(BuildContext context) {
    final style = tvStyle(context, v, weight: weight, color: color, muted: muted, size: size, tabular: tabular, strike: strike);
    final t = v == TV.label ? text.toUpperCase() : text;
    final a = align ?? (center ? TextAlign.center : null);
    if (selectable) return SelectableText(t, style: style, textAlign: a, maxLines: maxLines);
    return Text(t, style: style, textAlign: a, maxLines: maxLines, overflow: maxLines != null ? TextOverflow.ellipsis : null);
  }
}

/// Renders "**bold**" segments (ported toast/receipt strings).
class RichAppText extends StatelessWidget {
  final String text;
  final TV v;
  final Color? color;
  final bool muted, center;
  const RichAppText(this.text, {super.key, this.v = TV.body, this.color, this.muted = false, this.center = false});
  @override
  Widget build(BuildContext context) {
    final base = tvStyle(context, v, color: color, muted: muted);
    final parts = text.split(RegExp(r'(\*\*[^*]+\*\*)'));
    final matches = RegExp(r'\*\*([^*]+)\*\*').allMatches(text).map((m) => m[1]!).toList();
    final spans = <TextSpan>[];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].isNotEmpty) spans.add(TextSpan(text: parts[i]));
      if (i < matches.length) spans.add(TextSpan(text: matches[i], style: const TextStyle(fontWeight: FontWeight.w700)));
    }
    return Text.rich(TextSpan(style: base, children: spans), textAlign: center ? TextAlign.center : null);
  }
}
