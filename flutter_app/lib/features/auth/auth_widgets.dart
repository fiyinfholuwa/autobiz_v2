/// Shared auth UI — port of mobile_app/src/features/auth/components.tsx.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/random.dart';
import '../../core/validators.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

class ThemeToggle extends StatelessWidget {
  final Color? color, bg;
  const ThemeToggle({super.key, this.color, this.bg});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return IconBtn(
      c.dark ? 'bi-sun' : 'bi-moon-stars',
      tooltip: 'Toggle theme',
      color: color,
      bg: bg ?? c.surface,
      onPressed: () => store.mutate(() => store.settings.themeMode = c.dark ? 'light' : 'dark'),
    );
  }
}

/// Auth page scaffold: top bar (back + logo + theme), progress steps, title block, scrolling body, footer.
class AuthShell extends StatelessWidget {
  final String? title;
  /// String or Widget
  final Object? subtitle;
  final Widget child;
  final Widget? footer;
  /// null → default back (pop or go home); set [showBack] false to hide.
  final VoidCallback? onBack;
  final bool showBack;
  final int? step, steps;
  const AuthShell({super.key, this.title, this.subtitle, required this.child, this.footer, this.onBack, this.showBack = true, this.step, this.steps});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final mq = MediaQuery.of(context);
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: c.dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: c.bg,
        resizeToAvoidBottomInset: true,
        body: Stack(children: [
          Positioned(top: 0, left: 0, right: 0, height: 260, child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(colors: [c.primarySoft, c.bg], begin: Alignment.topCenter, end: Alignment.bottomCenter)))),
          Column(children: [
            Padding(
              padding: EdgeInsets.fromLTRB(16, mq.padding.top + 6, 16, 0),
              child: SizedBox(
                height: 44,
                child: Row(children: [
                  if (showBack) ...[IconBtn('bi-chevron-left', tooltip: 'Back', onPressed: onBack ?? () => goBack(context, '/')), const SizedBox(width: 12)],
                  const Logo(size: 30),
                  const Spacer(),
                  const ThemeToggle(),
                ]),
              ),
            ),
            Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.translucent,
                onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
                child: SingleChildScrollView(
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: EdgeInsets.fromLTRB(20, 16, 20, mq.padding.bottom + 28),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    if (steps != null) ...[
                      Row(children: [
                        for (var i = 0; i < steps!; i++) ...[
                          if (i > 0) const SizedBox(width: 6),
                          Expanded(child: AnimatedContainer(duration: const Duration(milliseconds: 250), height: 5, decoration: BoxDecoration(color: i < (step ?? 0) ? c.primary : c.border, borderRadius: BorderRadius.circular(3)))),
                        ],
                      ]),
                      if (step != null && step! <= steps!) Padding(padding: const EdgeInsets.only(top: 8), child: AppText('Step $step of $steps', v: TV.xs, muted: true)),
                      const SizedBox(height: 18),
                    ],
                    if (title != null) AppText(title!, v: TV.h1),
                    if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 6), child: subtitle is Widget ? subtitle as Widget : AppText('$subtitle', muted: true)),
                    SizedBox(height: title != null ? 22 : 0),
                    child,
                    if (footer != null) ...[const SizedBox(height: 22), footer!],
                  ]),
                ),
              ),
            ),
          ]),
        ]),
      ),
    );
  }
}

/// Password strength meter with rule checklist.
class StrengthMeter extends StatelessWidget {
  final String password;
  const StrengthMeter(this.password, {super.key});
  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox.shrink();
    final c = context.c;
    final s = passwordStrength(password);
    final col = context.tone(s.tone).fg;
    final rules = [(s.len, '8+ characters'), (s.upper, 'Uppercase'), (s.digit, 'Number'), (s.symbol, 'Symbol')];
    final filled = s.score < 1 ? 1 : s.score;
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          for (var i = 0; i < 4; i++) ...[
            if (i > 0) const SizedBox(width: 5),
            Expanded(child: Container(height: 5, decoration: BoxDecoration(color: i < filled ? col : c.border, borderRadius: BorderRadius.circular(3)))),
          ],
        ]),
        const SizedBox(height: 6),
        Text.rich(TextSpan(style: tvStyle(context, TV.xs, muted: true), children: [
          const TextSpan(text: 'Password strength '),
          TextSpan(text: s.label, style: TextStyle(fontWeight: FontWeight.w700, color: col)),
        ])),
        const SizedBox(height: 6),
        Wrap(spacing: 12, runSpacing: 4, children: [
          for (final (ok, l) in rules)
            Row(mainAxisSize: MainAxisSize.min, children: [
              AppIcon(ok ? 'bi-check-circle-fill' : 'bi-check-circle', size: 13, color: ok ? c.success : c.muted),
              const SizedBox(width: 4),
              AppText(l, v: TV.xs, color: ok ? c.text : c.muted),
            ]),
        ]),
      ]),
    );
  }
}

/// 60s resend countdown.
class Countdown extends ChangeNotifier {
  final int start;
  int left = 0;
  Timer? _t;
  Countdown([this.start = 60]);
  void restart() { left = start; _tick(); notifyListeners(); }
  void stop() { _t?.cancel(); left = 0; notifyListeners(); }
  void _tick() {
    _t?.cancel();
    _t = Timer.periodic(const Duration(seconds: 1), (t) {
      left--;
      if (left <= 0) { left = 0; t.cancel(); }
      notifyListeners();
    });
  }
  String get label => 'Resend in ${left ~/ 60}:${(left % 60).toString().padLeft(2, '0')}';
  @override
  void dispose() { _t?.cancel(); super.dispose(); }
}

String maskEmail(String e) {
  final parts = e.split('@');
  if (parts.length < 2 || parts[1].isEmpty) return e;
  final u = parts[0];
  final n = (u.length - 2).clamp(1, 5);
  return '${u.length > 2 ? u.substring(0, 2) : u}${'•' * n}@${parts[1]}';
}

/// Only allow redirects back into the app (blocks external & auth loops).
String? safeNext(String? v) {
  if (v == null || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/login') || v.startsWith('/register') || v.startsWith('/forgot')) return null;
  return v;
}

void goNext(BuildContext context, [String? next]) {
  final n = safeNext(next);
  context.go(n ?? '/');
}

/// Google / Apple demo sign-in.
class SocialButtons extends StatefulWidget {
  final String? next;
  const SocialButtons({super.key, this.next});
  @override
  State<SocialButtons> createState() => _SocialButtonsState();
}

class _SocialButtonsState extends State<SocialButtons> {
  String? busy;
  Future<void> _go(String p) async {
    setState(() => busy = p);
    await sleep(1300);
    store.login(remember: store.auth.remember);
    toast('Signed in with $p');
    await sleep(500);
    if (!mounted) return;
    setState(() => busy = null);
    goNext(context, widget.next);
  }

  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(child: Btn('Google', icon: 'bi-google', variant: BtnVariant.outline, loading: busy == 'Google', loadingText: 'Connecting…', disabled: busy != null, onPressed: () => _go('Google'))),
        const SizedBox(width: 10),
        Expanded(child: Btn('Apple', icon: 'bi-apple', variant: BtnVariant.outline, loading: busy == 'Apple', loadingText: 'Connecting…', disabled: busy != null, onPressed: () => _go('Apple'))),
      ]);
}

class OrDivider extends StatelessWidget {
  final String label;
  const OrDivider(this.label, {super.key});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 18),
      child: Row(children: [
        Expanded(child: Container(height: 1, color: c.border)),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 10), child: AppText(label, v: TV.xs, muted: true)),
        Expanded(child: Container(height: 1, color: c.border)),
      ]),
    );
  }
}

class SecureNote extends StatelessWidget {
  const SecureNote({super.key});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 18),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          AppIcon('bi-lock', size: 13, color: context.c.muted),
          const SizedBox(width: 6),
          const AppText('Protected by 256-bit encryption', v: TV.xs, muted: true),
        ]),
      );
}

/// Inline tappable link text.
class LinkText extends StatelessWidget {
  final String text;
  final VoidCallback? onTap;
  final TV v;
  final Color? color;
  const LinkText(this.text, {super.key, this.onTap, this.v = TV.sm, this.color});
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: AppText(text, v: v, weight: FontWeight.w700, color: color ?? context.c.primary)),
      );
}

/// "Already have an account? Log in" style row.
class AuthSwitchRow extends StatelessWidget {
  final String prompt, action;
  final VoidCallback onTap;
  const AuthSwitchRow({super.key, required this.prompt, required this.action, required this.onTap});
  @override
  Widget build(BuildContext context) => Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          AppText(prompt, v: TV.sm, muted: true),
          const SizedBox(width: 4),
          LinkText(action, onTap: onTap),
        ]),
        const SecureNote(),
      ]);
}
