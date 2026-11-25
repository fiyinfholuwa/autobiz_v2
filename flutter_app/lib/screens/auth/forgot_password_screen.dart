import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/random.dart';
import '../../core/validators.dart';
import '../../features/auth/auth_widgets.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /forgot-password  (q: email)
class ForgotPasswordScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const ForgotPasswordScreen({super.key, this.q = const {}});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  int step = 1;
  late String email = widget.q['email'] ?? '';
  String? emailErr;
  String code = '';
  String? codeErr;
  final _codeKey = GlobalKey<CodeInputState>();
  String pw = '', confirm = '';
  String? pwErr, confirmErr;
  bool signOutAll = true, busy = false;
  final cd = Countdown(60);

  String get masked => maskEmail(email.trim().toLowerCase());

  @override
  void initState() {
    super.initState();
    cd.addListener(() { if (mounted) setState(() {}); });
  }

  @override
  void dispose() { cd.dispose(); super.dispose(); }

  Future<void> _sendCode() async {
    if (email.trim().isEmpty) { setState(() => emailErr = 'Enter your email address'); return; }
    if (!isEmail(email)) { setState(() => emailErr = 'Enter a valid email address'); return; }
    setState(() { emailErr = null; busy = true; });
    await sleep(1000);
    if (!mounted) return;
    setState(() => busy = false);
    toast('Reset code sent to $masked');
    cd.restart();
    setState(() => step = 2);
  }

  Future<void> _verify([String? v]) async {
    final x = v ?? code;
    if (x.length < 6) { setState(() => codeErr = 'Enter the 6-digit code'); _codeKey.currentState?.shake(); return; }
    setState(() => busy = true);
    await sleep(900);
    if (!mounted) return;
    setState(() => busy = false);
    if (x == '000000') {
      setState(() { codeErr = 'That code is incorrect or expired.'; code = ''; });
      _codeKey.currentState?.shake();
      return;
    }
    cd.stop();
    setState(() { codeErr = null; step = 3; });
  }

  Future<void> _update() async {
    String? e1, e2;
    if (pw.isEmpty) {
      e1 = 'Create a new password';
    } else if (pw.length < 8 || passwordStrength(pw).score < 3) {
      e1 = 'Use at least 8 characters with a mix of uppercase, numbers or symbols';
    }
    if (confirm.isEmpty) {
      e2 = 'Confirm your new password';
    } else if (confirm != pw) {
      e2 = "Passwords don't match";
    }
    setState(() { pwErr = e1; confirmErr = e2; });
    if (e1 != null || e2 != null) return;
    setState(() => busy = true);
    await sleep(1100);
    if (!mounted) return;
    setState(() => busy = false);
    if (signOutAll) {
      store.logout();
      store.mutate(() => store.sessions = store.sessions.where((x) => x.current).toList());
    }
    store.notify(icon: 'bi-shield-check', tone: 'success', title: 'Password changed', body: "Your AutoBiz password was reset. If this wasn't you, contact support immediately.");
    setState(() => step = 4);
  }

  void _back() {
    if (step == 2) {
      cd.stop();
      setState(() => step = 1);
    } else if (step == 3) {
      setState(() => step = 2);
    } else if (context.canPop()) {
      context.pop();
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    Widget wrap(Widget child) => PopScope(canPop: step == 1, onPopInvokedWithResult: (did, _) { if (!did && step != 4) _back(); }, child: child);

    if (step == 4) {
      return wrap(AuthShell(
        showBack: false,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const SizedBox(height: 24),
          Center(
            child: Container(
              width: 100, height: 100,
              decoration: BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: [c.primary300, c.primary700], begin: Alignment.topLeft, end: Alignment.bottomRight)),
              child: const Center(child: AppIcon('bi-shield-check', size: 48, color: Colors.white)),
            ),
          ),
          const SizedBox(height: 18),
          const AppText('Password reset!', v: TV.h1, center: true),
          const SizedBox(height: 8),
          const AppText("Your password has been updated successfully. For your security, we've emailed you a confirmation.", muted: true, center: true),
          const SizedBox(height: 28),
          Btn('Continue to log in', size: BtnSize.lg, full: true, onPressed: () => context.pushReplacement(loc('/login', {'reset': '1'}))),
        ]),
      ));
    }

    if (step == 3) {
      return wrap(AuthShell(
        onBack: _back, step: 3, steps: 3, title: 'Set a new password', subtitle: "Choose a strong password you haven't used before on AutoBiz.",
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          AppTextField(label: 'New password', placeholder: 'New password', password: true, autofillHints: const [AutofillHints.newPassword], value: pw, error: pwErr, onChanged: (t) => setState(() { pw = t; pwErr = null; })),
          StrengthMeter(pw),
          const SizedBox(height: 14),
          AppTextField(label: 'Confirm new password', placeholder: 'Repeat password', password: true, value: confirm, error: confirmErr, onChanged: (t) => setState(() { confirm = t; confirmErr = null; })),
          const SizedBox(height: 14),
          AppCheckbox(checked: signOutAll, onChanged: (v) => setState(() => signOutAll = v), label: 'Sign out of all other devices'),
          const SizedBox(height: 14),
          Btn('Update password', size: BtnSize.lg, full: true, loading: busy, loadingText: 'Updating password…', onPressed: _update),
        ]),
      ));
    }

    if (step == 2) {
      return wrap(AuthShell(
        onBack: _back, step: 2, steps: 3, title: 'Check your inbox',
        subtitle: Text.rich(TextSpan(style: tvStyle(context, TV.body, muted: true), children: [
          const TextSpan(text: 'Enter the 6-digit code we sent to '),
          TextSpan(text: masked, style: TextStyle(fontWeight: FontWeight.w700, color: c.text)),
          const TextSpan(text: '. It expires in 10 minutes.'),
        ])),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Align(alignment: Alignment.centerLeft, child: LinkText('← Change email', onTap: _back)),
          const SizedBox(height: 12),
          CodeInput(key: _codeKey, length: 6, value: code, error: codeErr != null, onChanged: (v) => setState(() { code = v; codeErr = null; }), onComplete: _verify),
          const SizedBox(height: 10),
          codeErr != null ? AppText(codeErr!, v: TV.sm, color: c.danger, center: true) : const AppText('Demo: enter any 6 digits', v: TV.xs, muted: true, center: true),
          const SizedBox(height: 22),
          Btn('Verify code', size: BtnSize.lg, full: true, loading: busy, loadingText: 'Verifying…', onPressed: () => _verify()),
          const SizedBox(height: 16),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            const AppText("Didn't get it?", v: TV.sm, muted: true),
            const SizedBox(width: 4),
            LinkText(cd.left > 0 ? cd.label : 'Resend code', color: cd.left > 0 ? c.muted : c.primary, onTap: cd.left > 0 ? null : () {
              setState(() => code = '');
              cd.restart();
              toast('A new code has been sent');
            }),
          ]),
        ]),
      ));
    }

    return wrap(AuthShell(
      onBack: _back, step: 1, steps: 3, title: 'Forgot your password?',
      subtitle: "No worries. Enter the email linked to your account and we'll send you a 6-digit reset code.",
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        AppTextField(
          label: 'Email address', placeholder: 'you@example.com', icon: 'bi-envelope', keyboardType: TextInputType.emailAddress, autocorrect: false,
          autofillHints: const [AutofillHints.email], textInputAction: TextInputAction.send,
          value: email, error: emailErr, onChanged: (t) => setState(() { email = t; emailErr = null; }), onSubmitted: (_) => _sendCode(),
        ),
        const SizedBox(height: 16),
        Btn('Send reset code', size: BtnSize.lg, full: true, loading: busy, loadingText: 'Sending code…', onPressed: _sendCode),
        const SizedBox(height: 12),
        Center(child: LinkText('← Back to log in', onTap: _back)),
        const SizedBox(height: 28),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          const AppText('Need help?', v: TV.xs, muted: true),
          const SizedBox(width: 4),
          LinkText('Contact support', v: TV.xs, onTap: () => context.push('/settings/help')),
        ]),
      ]),
    ));
  }
}
