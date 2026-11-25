/// Bottom sheets & dialogs.
///
///   final ok = await showSheet<bool>(MySheet());      // MySheet.build returns AppSheet(...)
///   AppSheet(title: 'Fund card', child: ..., footer: Btn(...))
///
/// Sheets are keyboard-aware: they pad by the keyboard inset and cap their height to the space
/// above it, and the body scrolls so the focused field stays visible.
library;

import 'package:flutter/material.dart';

import '../core/nav.dart';
import '../core/theme.dart';
import 'text.dart';
import 'widgets.dart';

Future<T?> showSheet<T>(Widget sheet, {bool dismissible = true, BuildContext? context}) {
  final ctx = context ?? rootContext;
  return showModalBottomSheet<T>(
    context: ctx,
    useRootNavigator: true,
    isScrollControlled: true,
    isDismissible: dismissible,
    enableDrag: dismissible,
    backgroundColor: Colors.transparent,
    barrierColor: ctx.c.backdrop,
    builder: (_) => _KeyboardPadding(child: sheet),
  );
}

Future<T?> showAppDialog<T>(Widget sheet, {bool dismissible = true}) {
  final ctx = rootContext;
  return showDialog<T>(
    context: ctx,
    useRootNavigator: true,
    barrierDismissible: dismissible,
    barrierColor: ctx.c.backdrop,
    builder: (_) => Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(24),
      child: AppSheetScope(dialog: true, child: sheet),
    ),
  );
}

class _KeyboardPadding extends StatelessWidget {
  final Widget child;
  const _KeyboardPadding({required this.child});
  @override
  Widget build(BuildContext context) => Padding(padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom), child: child);
}

/// Marks a sheet rendered inside a dialog (rounded on all corners, no drag handle).
class AppSheetScope extends InheritedWidget {
  final bool dialog;
  const AppSheetScope({super.key, required this.dialog, required super.child});
  static bool isDialog(BuildContext context) => context.dependOnInheritedWidgetOfExactType<AppSheetScope>()?.dialog ?? false;
  @override
  bool updateShouldNotify(AppSheetScope old) => old.dialog != dialog;
}

class AppSheet extends StatelessWidget {
  final String? title, subtitle;
  final Widget? header;
  final Widget child;
  final Widget? footer;
  final bool scroll, hideClose;
  /// when true the sheet can't be dismissed (e.g. while processing)
  final bool locked;
  final double maxHeightFactor;
  final EdgeInsetsGeometry bodyPadding;
  const AppSheet({super.key, this.title, this.subtitle, this.header, required this.child, this.footer, this.scroll = true, this.hideClose = false, this.locked = false, this.maxHeightFactor = 0.92, this.bodyPadding = const EdgeInsets.fromLTRB(20, 0, 20, 16)});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final mq = MediaQuery.of(context);
    final dialog = AppSheetScope.isDialog(context);
    final kb = mq.viewInsets.bottom;
    final maxH = (mq.size.height - kb - mq.padding.top - 12) * (kb > 0 ? 1 : maxHeightFactor);
    final r = const Radius.circular(R.xxl);
    final body = Padding(padding: bodyPadding, child: child);
    return PopScope(
      canPop: !locked,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxH),
        child: Material(
          color: c.surface,
          borderRadius: dialog ? BorderRadius.all(r) : BorderRadius.vertical(top: r),
          clipBehavior: Clip.antiAlias,
          child: SafeArea(
            top: false,
            bottom: !dialog && kb == 0,
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              if (!dialog) Center(child: Container(margin: const EdgeInsets.only(top: 8), width: 40, height: 5, decoration: BoxDecoration(color: c.border, borderRadius: BorderRadius.circular(3)))),
              header ??
                  (title != null
                      ? Padding(
                          padding: EdgeInsets.fromLTRB(20, dialog ? 18 : 12, 20, 12),
                          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              AppText(title!, v: TV.h3),
                              if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 2), child: AppText(subtitle!, v: TV.sm, muted: true)),
                            ])),
                            if (!locked && !hideClose) IconBtn('bi-x-lg', size: 32, bg: c.surface2, tooltip: 'Close', onPressed: () => Navigator.of(context).maybePop()),
                          ]),
                        )
                      : const SizedBox(height: 14)),
              Flexible(child: scroll ? SingleChildScrollView(keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag, child: body) : body),
              if (footer != null) Padding(padding: const EdgeInsets.fromLTRB(20, 4, 20, 12), child: footer),
            ]),
          ),
        ),
      ),
    );
  }
}
