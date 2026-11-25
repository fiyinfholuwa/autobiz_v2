/// Port of mobile_app/src/features/settings/shared.tsx.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../store/app_store.dart';
import '../../ui/ui.dart';

Future<void> confirmLogout() async {
  final ok = await confirmDialog(const ConfirmOpts(title: 'Log out of AutoBiz?', message: "You'll need your password to sign in again.", confirmLabel: 'Log out', tone: 'danger', icon: 'bi-box-arrow-right'));
  if (!ok) return;
  store.logout();
  rootContext.go('/');
  toast("You've been logged out", type: ToastType.info);
}

Future<void> confirmReset() async {
  final ok = await confirmDialog(const ConfirmOpts(
    title: 'Reset demo data?',
    message: "Your wallet balance, transactions, cart, orders and settings will be restored to the defaults. This can't be undone.",
    confirmLabel: 'Yes, reset', tone: 'danger', icon: 'bi-arrow-counterclockwise', loadingMs: 600,
  ));
  if (!ok) return;
  store.resetDemo();
  toast('Demo data restored');
}

/// Titled card section with dividers between children.
class Group extends StatelessWidget {
  final String? title, subtitle;
  final List<Widget> children;
  final Widget? right;
  final EdgeInsetsGeometry margin;
  const Group({super.key, this.title, this.subtitle, required this.children, this.right, this.margin = const EdgeInsets.only(top: 18)});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: margin,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (title != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(2, 0, 2, 10),
            child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppText(title!, v: TV.h3),
                if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 2), child: AppText(subtitle!, v: TV.xs, muted: true)),
              ])),
              ?right,
            ]),
          ),
        CardBox(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            for (var i = 0; i < children.length; i++)
              Container(decoration: BoxDecoration(border: i > 0 ? Border(top: BorderSide(color: c.border)) : null), child: children[i]),
          ]),
        ),
      ]),
    );
  }
}

/// Numbered step row (1 · text).
class NumberedStep extends StatelessWidget {
  final int n;
  final String text;
  const NumberedStep(this.n, this.text, {super.key});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(children: [
        Container(width: 26, height: 26, decoration: BoxDecoration(color: c.primarySoft, shape: BoxShape.circle), child: Center(child: AppText('$n', v: TV.xs, weight: FontWeight.w700, color: c.primary))),
        const SizedBox(width: 10),
        Expanded(child: AppText(text, v: TV.sm)),
      ]),
    );
  }
}
