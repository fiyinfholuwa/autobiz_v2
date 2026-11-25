/// AutoBiz brand mark — same artwork as the app icon (assets/brand/logo.svg).
library;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../core/theme.dart';
import 'text.dart';

class LogoMark extends StatelessWidget {
  final double size;
  const LogoMark({super.key, this.size = 48});
  @override
  Widget build(BuildContext context) => SvgPicture.asset('assets/brand/logo.svg', width: size, height: size);
}

/// Mark + "AutoBiz" wordmark. [light] for gradient/dark backgrounds.
class Logo extends StatelessWidget {
  final double size;
  final bool light, hideText;
  const Logo({super.key, this.size = 36, this.light = false, this.hideText = false});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final style = tvStyle(context, TV.body, weight: FontWeight.w800, size: size * 0.62, color: light ? Colors.white : c.text);
    return Row(mainAxisSize: MainAxisSize.min, children: [
      LogoMark(size: size),
      if (!hideText) ...[
        SizedBox(width: size * 0.28),
        Text.rich(TextSpan(style: style.copyWith(letterSpacing: -0.5), children: [
          const TextSpan(text: 'Auto'),
          TextSpan(text: 'Biz', style: TextStyle(color: light ? const Color(0xFFA9F5DC) : c.primary)),
        ])),
      ],
    ]);
  }
}
