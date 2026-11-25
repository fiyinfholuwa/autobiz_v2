import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/random.dart';
import '../../core/validators.dart';
import '../../features/auth/auth_widgets.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /login  (q: next, reset)
class LoginScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const LoginScreen({super.key, this.q = const {}});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String id = '', pw = '';
  late bool remember = store.auth.remember;
  String? idErr, pwErr, alert;
  bool busy = false, done = false;
  final _pwFocus = FocusNode();

  String? get next => widget.q['next'];

  @override
  void initState() {
    super.initState();
    if (widget.q['reset'] == '1') {
      WidgetsBinding.instance.addPostFrameCallback((_) => toast('Password updated. Log in with your new password.'));
    }
  }

  @override
  void dispose() { _pwFocus.dispose(); super.dispose(); }

  bool _validate() {
    final v = id.trim();
    String? e1, e2;
    if (v.isEmpty) {
      e1 = 'Enter your email or phone number';
    } else if (!isEmail(v) && !isPhone(v)) {
      e1 = RegExp(r'^\+?\d').hasMatch(v) ? 'Enter a valid Nigerian phone number, e.g. 08031234567' : 'Enter a valid email address';
    }
    if (pw.isEmpty) {
      e2 = 'Enter your password';
    } else if (pw.length < 6) {
      e2 = 'Password must be at least 6 characters';
    }
    setState(() { idErr = e1; pwErr = e2; });
    return e1 == null && e2 == null;
  }

  Future<void> _submit() async {
    setState(() => alert = null);
    if (!_validate()) return;
    setState(() => busy = true);
    await sleep(1200);
    if (!mounted) return;
    if (pw.toLowerCase() == 'wrongpass') {
      setState(() { busy = false; alert = 'Incorrect email/phone or password. Please try again.'; });
      _pwFocus.requestFocus();
      return;
    }
    store.login(remember: remember);
    setState(() { busy = false; done = true; });
    await sleep(450);
    if (mounted) goNext(context, next);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AuthShell(
      onBack: () => context.canPop() ? context.pop() : context.go('/'),
      title: 'Log in to your account',
      subtitle: 'Welcome back! Enter your details to continue.',
      footer: AuthSwitchRow(prompt: "Don't have an account?", action: 'Sign up free', onTap: () => context.pushReplacement(loc('/register', {'next': next}))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SocialButtons(next: next),
        const OrDivider('or continue with email / phone'),
        if (alert != null) Padding(padding: const EdgeInsets.only(bottom: 14), child: Notice(alert!, tone: 'danger', icon: 'bi-exclamation-circle')),
        AppTextField(
          label: 'Email or phone number',
          placeholder: 'you@example.com or 0803…',
          icon: 'bi-person',
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          autofillHints: const [AutofillHints.username],
          textInputAction: TextInputAction.next,
          value: id,
          error: idErr,
          onChanged: (t) => setState(() { id = t; idErr = null; }),
          onSubmitted: (_) => _pwFocus.requestFocus(),
        ),
        const SizedBox(height: 14),
        AppTextField(
          label: 'Password',
          labelRight: GestureDetector(
            onTap: () => context.push(loc('/forgot-password', {'email': isEmail(id) ? id.trim() : null})),
            child: AppText('Forgot password?', v: TV.sm, weight: FontWeight.w700, color: c.primary),
          ),
          placeholder: 'Your password',
          icon: 'bi-lock',
          password: true,
          focusNode: _pwFocus,
          autofillHints: const [AutofillHints.password],
          textInputAction: TextInputAction.go,
          value: pw,
          error: pwErr,
          onChanged: (t) => setState(() { pw = t; pwErr = null; }),
          onSubmitted: (_) => _submit(),
        ),
        const SizedBox(height: 14),
        AppCheckbox(checked: remember, onChanged: (v) => setState(() => remember = v), label: 'Keep me signed in for 30 days'),
        const SizedBox(height: 14),
        Btn(done ? 'Welcome back!' : 'Log in', icon: done ? 'bi-check-lg' : null, size: BtnSize.lg, full: true, loading: busy, loadingText: 'Signing you in…', onPressed: _submit),
        const SizedBox(height: 18),
        Notice(
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text.rich(TextSpan(style: tvStyle(context, TV.sm, color: c.primary), children: const [
              TextSpan(text: 'Demo mode: ', style: TextStyle(fontWeight: FontWeight.w700)),
              TextSpan(text: 'use any valid email or Nigerian phone number with a password of 6+ characters.'),
            ])),
            const SizedBox(height: 6),
            GestureDetector(
              onTap: () => setState(() { id = store.user.email; pw = 'demo1234'; idErr = null; pwErr = null; }),
              child: AppText('Fill demo details →', v: TV.sm, weight: FontWeight.w700, color: c.primary),
            ),
          ]),
          tone: 'primary',
          icon: 'bi-info-circle',
        ),
      ]),
    );
  }
}
