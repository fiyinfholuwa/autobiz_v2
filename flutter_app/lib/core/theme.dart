/// Design tokens — ported from mobile_app/src/theme/tokens.ts (teal brand, Plus Jakarta Sans).
/// Access the palette with `context.c`, tones with `context.tone('violet')`.
library;

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

class Palette {
  final Color primary, primary300, primary600, primary700, primarySoft, onPrimary;
  final Color success, successSoft, warning, warningText, warningSoft, danger, dangerSoft;
  final Color violet, violetSoft, pink, pinkSoft, cyan, cyanSoft, orange, orangeSoft;
  final Color bg, surface, surface2, border, text, muted, panel, backdrop, chartMuted;
  final bool dark;
  const Palette({
    required this.primary, required this.primary300, required this.primary600, required this.primary700, required this.primarySoft, this.onPrimary = Colors.white,
    required this.success, required this.successSoft, required this.warning, required this.warningText, required this.warningSoft, required this.danger, required this.dangerSoft,
    required this.violet, required this.violetSoft, required this.pink, required this.pinkSoft, required this.cyan, required this.cyanSoft, required this.orange, required this.orangeSoft,
    required this.bg, required this.surface, required this.surface2, required this.border, required this.text, required this.muted, required this.panel, required this.backdrop, required this.chartMuted,
    required this.dark,
  });
}

const lightPalette = Palette(
  primary: Color(0xFF299D91), primary300: Color(0xFF5FB6AD), primary600: Color(0xFF23877D), primary700: Color(0xFF1C6B63), primarySoft: Color(0xFFEAF5F4),
  success: Color(0xFF12B886), successSoft: Color(0xFFE6F8F2), warning: Color(0xFFF59F00), warningText: Color(0xFFD48806), warningSoft: Color(0xFFFFF6E0),
  danger: Color(0xFFF03E3E), dangerSoft: Color(0xFFFFEDED), violet: Color(0xFF7048E8), violetSoft: Color(0xFFF1EDFF), pink: Color(0xFFE64980), pinkSoft: Color(0xFFFFEEF4),
  cyan: Color(0xFF1098AD), cyanSoft: Color(0xFFE5F7FA), orange: Color(0xFFFD7E14), orangeSoft: Color(0xFFFFF1E6),
  bg: Color(0xFFF4F5F7), surface: Color(0xFFFFFFFF), surface2: Color(0xFFF6F7F9), border: Color(0xFFE8E8E8), text: Color(0xFF191919), muted: Color(0xFF7A7A7A),
  panel: Color(0xFF191919), backdrop: Color(0x730A0C10), chartMuted: Color(0xFFE8E8E8), dark: false,
);

const darkPalette = Palette(
  primary: Color(0xFF4FB3A9), primary300: Color(0xFF7CC7BF), primary600: Color(0xFF6FC2BA), primary700: Color(0xFF2F8F85), primarySoft: Color(0x244FB3A9),
  success: Color(0xFF12B886), successSoft: Color(0x2412B886), warning: Color(0xFFF59F00), warningText: Color(0xFFF5B13D), warningSoft: Color(0x24F59F00),
  danger: Color(0xFFF03E3E), dangerSoft: Color(0x24F03E3E), violet: Color(0xFF7048E8), violetSoft: Color(0x2E7048E8), pink: Color(0xFFE64980), pinkSoft: Color(0x29E64980),
  cyan: Color(0xFF1098AD), cyanSoft: Color(0x291098AD), orange: Color(0xFFFD7E14), orangeSoft: Color(0x29FD7E14),
  bg: Color(0xFF121212), surface: Color(0xFF1C1C1E), surface2: Color(0xFF242427), border: Color(0xFF2E2E32), text: Color(0xFFECECEC), muted: Color(0xFF9A9A9A),
  panel: Color(0xFF0B0B0C), backdrop: Color(0x99000000), chartMuted: Color(0xFF3A3A3E), dark: true,
);

class ToneColors { final Color fg, bg; const ToneColors(this.fg, this.bg); }

ToneColors toneColors(Palette c, String? tone) {
  switch (tone) {
    case 'success': return ToneColors(c.success, c.successSoft);
    case 'warning': return ToneColors(c.warningText, c.warningSoft);
    case 'danger': return ToneColors(c.danger, c.dangerSoft);
    case 'violet': return ToneColors(c.violet, c.violetSoft);
    case 'pink': return ToneColors(c.pink, c.pinkSoft);
    case 'cyan': return ToneColors(c.cyan, c.cyanSoft);
    case 'orange': return ToneColors(c.orange, c.orangeSoft);
    case 'neutral': return ToneColors(c.muted, c.surface2);
    default: return ToneColors(c.primary, c.primarySoft);
  }
}

/// Solid gradient pairs used for hero tiles / art.
const Map<String, List<Color>> toneGradient = {
  'primary': [Color(0xFF3FB5A8), Color(0xFF1C6B63)],
  'success': [Color(0xFF20C997), Color(0xFF087F5B)],
  'warning': [Color(0xFFFCC419), Color(0xFFE8590C)],
  'danger': [Color(0xFFFF6B6B), Color(0xFFC92A2A)],
  'violet': [Color(0xFF9775FA), Color(0xFF5F3DC4)],
  'pink': [Color(0xFFF06595), Color(0xFFA61E4D)],
  'cyan': [Color(0xFF3BC9DB), Color(0xFF0B7285)],
  'orange': [Color(0xFFFFA94D), Color(0xFFD9480F)],
  'neutral': [Color(0xFF868E96), Color(0xFF343A40)],
};
List<Color> gradientFor(String? tone) => toneGradient[tone] ?? toneGradient['primary']!;

/// Parse "#rrggbb" / "#rgb" into a Color.
Color hexColor(String hex) {
  var h = hex.replaceAll('#', '');
  if (h.length == 3) h = h.split('').map((e) => e + e).join();
  return Color(int.parse('FF$h', radix: 16));
}

class R { static const xs = 8.0, sm = 10.0, md = 12.0, lg = 16.0, xl = 20.0, xxl = 28.0, pill = 999.0; }

const fontFamily = 'Jakarta';

/// Bottom padding tab screens add so content clears the floating tab bar.
const double tabBarSpace = 96;

List<BoxShadow> shadow(Palette c, [int level = 1]) {
  if (c.dark) return const [];
  const m = {1: [0.06, 10.0, 4.0], 2: [0.10, 18.0, 8.0], 3: [0.18, 28.0, 14.0]};
  final v = m[level]!;
  return [BoxShadow(color: const Color(0xFF191919).withValues(alpha: v[0]), blurRadius: v[1], offset: Offset(0, v[2]))];
}

class PaletteExt extends ThemeExtension<PaletteExt> {
  final Palette palette;
  const PaletteExt(this.palette);
  @override
  PaletteExt copyWith({Palette? palette}) => PaletteExt(palette ?? this.palette);
  @override
  PaletteExt lerp(ThemeExtension<PaletteExt>? other, double t) => t < 0.5 ? this : (other as PaletteExt? ?? this);
}

extension ThemeX on BuildContext {
  Palette get c => Theme.of(this).extension<PaletteExt>()!.palette;
  ToneColors tone(String? t) => toneColors(c, t);
}

ThemeData buildTheme(Palette c) {
  final base = c.dark ? ThemeData.dark(useMaterial3: true) : ThemeData.light(useMaterial3: true);
  return base.copyWith(
    extensions: [PaletteExt(c)],
    scaffoldBackgroundColor: c.bg,
    colorScheme: base.colorScheme.copyWith(primary: c.primary, secondary: c.primary, surface: c.surface, onSurface: c.text, error: c.danger),
    textTheme: base.textTheme.apply(fontFamily: fontFamily, bodyColor: c.text, displayColor: c.text),
    splashFactory: InkSparkle.splashFactory,
    textSelectionTheme: TextSelectionThemeData(cursorColor: c.primary, selectionColor: c.primary.withValues(alpha: 0.25), selectionHandleColor: c.primary),
    dividerColor: c.border,
    pageTransitionsTheme: const PageTransitionsTheme(builders: {
      TargetPlatform.android: CupertinoPageTransitionsBuilder(),
      TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
    }),
    datePickerTheme: DatePickerThemeData(backgroundColor: c.surface, headerBackgroundColor: c.primary, headerForegroundColor: Colors.white),
  );
}
