/// Screen scaffold + header — Flutter equivalents of mobile_app/src/components/ui/Screen.tsx.
/// Keyboard: Scaffold resizes for the keyboard and focused fields scroll into view automatically.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/nav.dart';
import '../core/theme.dart';
import 'text.dart';
import 'widgets.dart';

class AppHeader extends StatelessWidget {
  final String? title, subtitle;
  final bool back, large, light, transparent;
  final VoidCallback? onBack;
  final List<Widget> actions;
  /// where "back" goes when there is nothing to pop (deep links)
  final String fallback;
  const AppHeader({super.key, this.title, this.subtitle, this.back = true, this.onBack, this.actions = const [], this.large = false, this.light = false, this.transparent = false, this.fallback = '/'});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final fg = light ? Colors.white : c.text;
    final top = MediaQuery.paddingOf(context).top;
    return Container(
      color: transparent ? Colors.transparent : c.bg,
      padding: EdgeInsets.fromLTRB(16, top + 6, 16, 10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        SizedBox(
          height: 44,
          child: Row(children: [
            if (back) ...[
              IconBtn('bi-chevron-left', tooltip: 'Back', color: fg, bg: light ? Colors.white.withValues(alpha: 0.18) : c.surface, onPressed: onBack ?? () => goBack(context, fallback)),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: large
                  ? const SizedBox.shrink()
                  : Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                      if (title != null) AppText(title!, v: TV.h3, maxLines: 1, color: fg),
                      if (subtitle != null) AppText(subtitle!, v: TV.xs, maxLines: 1, color: light ? Colors.white70 : c.muted),
                    ]),
            ),
            for (var i = 0; i < actions.length; i++) ...[if (i > 0) const SizedBox(width: 8), actions[i]],
          ]),
        ),
        if (large && title != null) ...[
          const SizedBox(height: 8),
          AppText(title!, v: TV.h1, color: fg),
          if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 4), child: AppText(subtitle!, v: TV.sm, color: light ? Colors.white70 : c.muted)),
        ],
      ]),
    );
  }
}

class AppScreen extends StatelessWidget {
  final Widget? header;
  /// Body children (laid out in a scrolling Column) — or use [child] for custom bodies.
  final List<Widget>? children;
  final Widget? child;
  final bool scroll, padded;
  final Widget? footer;
  final double bottomInset;
  final Future<void> Function()? onRefresh;
  final ScrollController? controller;
  final Color? bg;
  final CrossAxisAlignment crossAxisAlignment;
  const AppScreen({super.key, this.header, this.children, this.child, this.scroll = true, this.padded = true, this.footer, this.bottomInset = 0, this.onRefresh, this.controller, this.bg, this.crossAxisAlignment = CrossAxisAlignment.stretch})
      : assert(children != null || child != null);

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final mq = MediaQuery.of(context);
    final pad = EdgeInsets.fromLTRB(padded ? 16 : 0, 4, padded ? 16 : 0, (footer != null ? 16 : mq.padding.bottom + 24) + bottomInset);
    Widget body;
    if (!scroll) {
      body = Padding(padding: EdgeInsets.symmetric(horizontal: padded ? 16 : 0), child: child ?? Column(crossAxisAlignment: crossAxisAlignment, children: children!));
    } else {
      body = SingleChildScrollView(
        controller: controller,
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: pad,
        child: child ?? Column(crossAxisAlignment: crossAxisAlignment, children: children!),
      );
      if (onRefresh != null) body = RefreshIndicator(color: c.primary, onRefresh: onRefresh!, child: body);
    }
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: c.dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: bg ?? c.bg,
        resizeToAvoidBottomInset: true,
        body: Column(children: [
          ?header,
          Expanded(child: GestureDetector(behavior: HitTestBehavior.translucent, onTap: () => FocusManager.instance.primaryFocus?.unfocus(), child: body)),
          if (footer != null)
            Container(
              padding: EdgeInsets.fromLTRB(16, 12, 16, (mq.viewInsets.bottom > 0 ? 12 : (mq.padding.bottom > 12 ? mq.padding.bottom : 12)) + bottomInset),
              decoration: BoxDecoration(color: c.surface, border: Border(top: BorderSide(color: c.border))),
              child: footer,
            ),
        ]),
      ),
    );
  }
}
