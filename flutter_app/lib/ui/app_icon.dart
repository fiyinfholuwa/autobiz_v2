/// AppIcon — accepts the same names as the React Native app: Bootstrap-style "bi-phone",
/// or direct "ion:home-outline" / "mci:bank-outline". Unknown names fall back to a neutral glyph.
library;

import 'package:flutter/widgets.dart';

import 'icon_glyphs.dart';

IconData iconData(String name) {
  if (name.startsWith('ion:')) {
    final d = ionIcons[name.substring(4)];
    if (d != null) return d;
  } else if (name.startsWith('mci:')) {
    final d = mciIcons[name.substring(4)];
    if (d != null) return d;
  } else {
    final key = name.replaceFirst(RegExp(r'^bi[- ]'), '');
    final d = biIcons[key] ?? biIcons[key.replaceFirst(RegExp(r'-fill$'), '')];
    if (d != null) return d;
  }
  assert(() { debugPrint('AppIcon: unknown icon "$name"'); return true; }());
  return ionIcons['ellipse-outline']!;
}

class AppIcon extends StatelessWidget {
  final String name;
  final double size;
  final Color? color;
  const AppIcon(this.name, {super.key, this.size = 20, this.color});
  @override
  Widget build(BuildContext context) => Icon(iconData(name), size: size, color: color);
}
