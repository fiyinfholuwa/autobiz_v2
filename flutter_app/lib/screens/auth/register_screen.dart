import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../core/validators.dart';
import '../../features/auth/auth_widgets.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

final _nameRe = RegExp(r"^[A-Za-zÀ-ÿ' -]{2,30}$");
String _cap(String s) => s.trim().replaceAll(RegExp(r'\s+'), ' ').replaceAllMapped(RegExp(r'\b\w'), (m) => m[0]!.toUpperCase());

/// Route: /register  (q: next, plan, ref)
class RegisterScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const RegisterScreen({super.key, this.q = const {}});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  int step = 1;
  String firstName = '', lastName = '', email = '', phone = '', password = '', confirm = '';
  late String referral = (widget.q['ref'] ?? '').toUpperCase();
  bool terms = false;
  late bool showRef = (widget.q['ref'] ?? '').isNotEmpty;
  Map<String, String?> errs = {};
  bool busy = false;

  // step 2
  String otp = '';
  String? otpErr;
  final _otpKey = GlobalKey<CodeInputState>();
  final cd = Countdown(60);
  // step 3
  String pin = '';
  String? pin1, pinErr;
  final _pinKeyA = GlobalKey<CodeInputState>(), _pinKeyB = GlobalKey<CodeInputState>();
  void _shakePin() => (pin1 == null ? _pinKeyA : _pinKeyB).currentState?.shake();

  String? get next => widget.q['next'];

  @override
  void initState() {
    super.initState();
    cd.addListener(() { if (mounted) setState(() {}); });
  }

  @override
  void dispose() { cd.dispose(); super.dispose(); }

  ({String firstName, String lastName, String email, String phone, String referral}) get n => (
        firstName: _cap(firstName),
        lastName: _cap(lastName),
        email: email.trim().toLowerCase(),
        phone: normPhone(phone).replaceFirst(RegExp(r'^\+?234'), '0'),
        referral: referral.trim().toUpperCase(),
      );

  void _set(String k, VoidCallback fn) => setState(() { fn(); errs[k] = null; });

  Future<void> _submit1() async {
    final e = <String, String?>{};
    if (firstName.trim().isEmpty) { e['firstName'] = 'Enter your first name'; } else if (!_nameRe.hasMatch(firstName.trim())) { e['firstName'] = 'Use letters only (2–30)'; }
    if (lastName.trim().isEmpty) { e['lastName'] = 'Enter your last name'; } else if (!_nameRe.hasMatch(lastName.trim())) { e['lastName'] = 'Use letters only (2–30)'; }
    if (email.trim().isEmpty) { e['email'] = 'Enter your email address'; } else if (!isEmail(email)) { e['email'] = 'Enter a valid email address'; }
    if (!isPhone(phone)) e['phone'] = 'Enter a valid Nigerian number, e.g. 0803 123 4567';
    if (password.isEmpty) {
      e['password'] = 'Create a password';
    } else if (password.length < 8 || passwordStrength(password).score < 3) {
      e['password'] = 'Use at least 8 characters with a mix of uppercase, numbers or symbols';
    }
    if (confirm.isEmpty) { e['confirm'] = 'Confirm your password'; } else if (confirm != password) { e['confirm'] = "Passwords don't match"; }
    if (referral.trim().isNotEmpty && !RegExp(r'^[A-Za-z0-9]{4,12}$').hasMatch(referral.trim())) { e['referral'] = 'Referral codes are 4–12 letters or numbers'; showRef = true; }
    if (!terms) e['terms'] = 'Please accept the terms to continue';
    setState(() => errs = e);
    if (e.values.any((x) => x != null)) return;
    setState(() => busy = true);
    await sleep(1100);
    if (!mounted) return;
    setState(() { busy = false; step = 2; });
    cd.restart();
    toast('Verification code sent to ${maskEmail(n.email)}');
  }

  Future<void> _verifyOtp([String? code]) async {
    final v = code ?? otp;
    if (v.length < 6) { setState(() => otpErr = 'Enter the 6-digit code'); _otpKey.currentState?.shake(); return; }
    setState(() => busy = true);
    await sleep(900);
    if (!mounted) return;
    setState(() => busy = false);
    if (v == '000000') {
      setState(() { otpErr = 'That code is incorrect or expired. Try again.'; otp = ''; });
      _otpKey.currentState?.shake();
      return;
    }
    cd.stop();
    setState(() { otpErr = null; step = 3; });
  }

  Future<void> _submitPin([String? code]) async {
    final v = code ?? pin;
    if (v.length < 4) { setState(() => pinErr = 'Enter 4 digits'); _shakePin(); return; }
    if (pin1 == null) {
      if (weakPins.contains(v)) {
        setState(() { pinErr = 'That PIN is too easy to guess. Choose another.'; pin = ''; });
        _shakePin();
        return;
      }
      setState(() { pinErr = null; pin1 = v; pin = ''; });
      return;
    }
    if (v != pin1) {
      setState(() => pinErr = "PINs didn't match. Let's try again.");
      _shakePin();
      Future.delayed(const Duration(milliseconds: 400), () { if (mounted) setState(() { pin = ''; pin1 = null; }); });
      return;
    }
    setState(() => busy = true);
    await sleep(1100);
    if (!mounted) return;
    _finish(v);
    setState(() => busy = false);
  }

  void _finish(String pinCode) {
    final x = n;
    final username = (x.firstName + x.lastName).toLowerCase().replaceAll(RegExp('[^a-z]'), '');
    store.mutate(() {
      final u = store.user;
      u.firstName = x.firstName;
      u.lastName = x.lastName;
      u.email = x.email;
      u.phone = x.phone;
      u.username = username.length > 14 ? username.substring(0, 14) : username;
      u.tier = 'Tier 1';
      u.referral = x.referral.isEmpty ? null : x.referral;
      u.joined = f.now();
      u.bvnVerified = false;
      u.ninVerified = false;
      store.settings.pinSet = true;
      store.settings.pin = pinCode;
      store.settings.pinChangedAt = f.now();
    });
    store.notify(icon: 'bi-stars', tone: 'primary', title: 'Welcome to AutoBiz, ${x.firstName}!', body: 'Fund your wallet to start shopping, travelling and paying bills.');
    if (x.referral.isNotEmpty) store.notify(icon: 'bi-gift', tone: 'pink', title: 'Referral applied', body: "Code ${x.referral} — you'll both earn ₦500 after your first transaction.");
    store.login(remember: true);
    HapticFeedback.mediumImpact();
    setState(() => step = 4);
  }

  void _back() {
    if (step == 2) {
      cd.stop();
      setState(() => step = 1);
    } else if (step == 3) {
      setState(() { pin1 = null; pin = ''; step = 2; });
    } else if (context.canPop()) {
      context.pop();
    } else {
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    if (step == 4) return _SuccessPane(n: n, next: next);

    if (step == 2) {
      final p = n.phone;
      final maskedPhone = p.length >= 8 ? '${p.substring(0, 4)} ••• ${p.substring(p.length - 4)}' : p;
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (did, _) { if (!did) _back(); },
        child: AuthShell(
          onBack: _back, step: 2, steps: 3, title: 'Verify your email',
          subtitle: Text.rich(TextSpan(style: tvStyle(context, TV.body, muted: true), children: [
            const TextSpan(text: 'We sent a 6-digit code to '),
            TextSpan(text: maskEmail(n.email), style: TextStyle(fontWeight: FontWeight.w700, color: c.text)),
            const TextSpan(text: ' and by SMS to '),
            TextSpan(text: maskedPhone, style: TextStyle(fontWeight: FontWeight.w700, color: c.text)),
            const TextSpan(text: '.'),
          ])),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            CodeInput(key: _otpKey, length: 6, value: otp, error: otpErr != null, onChanged: (v) => setState(() { otp = v; otpErr = null; }), onComplete: _verifyOtp),
            const SizedBox(height: 10),
            otpErr != null ? AppText(otpErr!, v: TV.sm, color: c.danger, center: true) : const AppText('Demo: enter any 6 digits', v: TV.xs, muted: true, center: true),
            const SizedBox(height: 22),
            Btn('Verify email', size: BtnSize.lg, full: true, loading: busy, loadingText: 'Verifying…', onPressed: () => _verifyOtp()),
            const SizedBox(height: 16),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              const AppText("Didn't get it?", v: TV.sm, muted: true),
              const SizedBox(width: 4),
              LinkText(cd.left > 0 ? cd.label : 'Resend code', color: cd.left > 0 ? c.muted : c.primary, onTap: cd.left > 0 ? null : () {
                setState(() { otp = ''; otpErr = null; });
                cd.restart();
                toast('A new code has been sent');
              }),
            ]),
          ]),
        ),
      );
    }

    if (step == 3) {
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (did, _) { if (!did) _back(); },
        child: AuthShell(
          onBack: _back, step: 3, steps: 3,
          title: pin1 == null ? 'Create your transaction PIN' : 'Confirm your PIN',
          subtitle: pin1 == null ? "You'll use this 4-digit PIN to approve payments, purchases and withdrawals." : 'Re-enter the 4-digit PIN you just created.',
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            CodeInput(
              key: pin1 == null ? _pinKeyA : _pinKeyB,
              length: 4, secret: true, value: pin, error: pinErr != null,
              onChanged: (v) => setState(() { pin = v; pinErr = null; }),
              onComplete: (v) => Future.delayed(const Duration(milliseconds: 120), () => _submitPin(v)),
            ),
            if (pinErr != null) Padding(padding: const EdgeInsets.only(top: 12), child: AppText(pinErr!, v: TV.sm, color: c.danger, center: true)),
            const SizedBox(height: 24),
            Btn(pin1 == null ? 'Continue' : 'Create PIN', size: BtnSize.lg, full: true, loading: busy, loadingText: 'Setting up your wallet…', onPressed: () => _submitPin()),
            const SizedBox(height: 18),
            const Notice('Avoid easy PINs like 1234, 0000 or your birth year. Never share your PIN — AutoBiz staff will never ask for it.', tone: 'warning', icon: 'bi-shield-lock'),
          ]),
        ),
      );
    }

    return AuthShell(
      onBack: _back, step: 1, steps: 3,
      title: 'Create your account',
      subtitle: "It's free and takes less than 3 minutes.",
      footer: AuthSwitchRow(prompt: 'Already have an account?', action: 'Log in', onTap: () => context.pushReplacement(loc('/login', {'next': next}))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (widget.q['plan'] == 'reseller') const Padding(padding: EdgeInsets.only(bottom: 14), child: Notice("You're signing up for the Reseller plan — upgrade after verification.", tone: 'violet', icon: 'bi-stars')),
        SocialButtons(next: next),
        const OrDivider('or sign up with email'),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: AppTextField(label: 'First name', placeholder: 'Adaeze', autofillHints: const [AutofillHints.givenName], textCapitalization: TextCapitalization.words, value: firstName, error: errs['firstName'], onChanged: (t) => _set('firstName', () => firstName = t))),
          const SizedBox(width: 10),
          Expanded(child: AppTextField(label: 'Last name', placeholder: 'Okafor', autofillHints: const [AutofillHints.familyName], textCapitalization: TextCapitalization.words, value: lastName, error: errs['lastName'], onChanged: (t) => _set('lastName', () => lastName = t))),
        ]),
        const SizedBox(height: 14),
        AppTextField(label: 'Email address', placeholder: 'you@example.com', icon: 'bi-envelope', keyboardType: TextInputType.emailAddress, autocorrect: false, autofillHints: const [AutofillHints.email], value: email, error: errs['email'], onChanged: (t) => _set('email', () => email = t)),
        const SizedBox(height: 14),
        AppTextField(
          label: 'Phone number', placeholder: '0803 123 4567', prefix: '🇳🇬 +234', keyboardType: TextInputType.phone, maxLength: 14,
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d+ ]'))],
          value: phone, error: errs['phone'], onChanged: (t) => _set('phone', () => phone = t),
        ),
        const SizedBox(height: 14),
        AppTextField(label: 'Password', placeholder: 'Create a password', password: true, autofillHints: const [AutofillHints.newPassword], value: password, error: errs['password'], onChanged: (t) => _set('password', () => password = t)),
        StrengthMeter(password),
        const SizedBox(height: 14),
        AppTextField(label: 'Confirm password', placeholder: 'Repeat password', password: true, value: confirm, error: errs['confirm'], onChanged: (t) => _set('confirm', () => confirm = t)),
        const SizedBox(height: 14),
        if (showRef)
          AppTextField(label: 'Referral code', placeholder: 'e.g. ADAEZE24 (optional)', textCapitalization: TextCapitalization.characters, maxLength: 12, value: referral, error: errs['referral'], onChanged: (t) => _set('referral', () => referral = t.toUpperCase()))
        else
          Align(alignment: Alignment.centerLeft, child: LinkText('+ Have a referral code?', onTap: () => setState(() => showRef = true))),
        const SizedBox(height: 14),
        AppCheckbox(
          checked: terms,
          error: errs['terms'],
          onChanged: (v) => _set('terms', () => terms = v),
          child: Text.rich(TextSpan(style: tvStyle(context, TV.sm), children: [
            const TextSpan(text: "I agree to AutoBiz's "),
            TextSpan(text: 'Terms of Service', style: TextStyle(fontWeight: FontWeight.w700, color: c.primary)),
            const TextSpan(text: ' and '),
            TextSpan(text: 'Privacy Policy', style: TextStyle(fontWeight: FontWeight.w700, color: c.primary)),
            const TextSpan(text: '.'),
          ])),
        ),
        const SizedBox(height: 14),
        Btn('Create account', size: BtnSize.lg, full: true, loading: busy, loadingText: 'Creating account…', onPressed: _submit1),
      ]),
    );
  }
}

class _SuccessPane extends StatelessWidget {
  final ({String firstName, String lastName, String email, String phone, String referral}) n;
  final String? next;
  const _SuccessPane({required this.n, this.next});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final nextLabel = next != null ? (next!.contains('cart') || next!.contains('checkout') ? 'Continue to checkout' : 'Continue') : 'Go to dashboard';
    const confetti = [Color(0xFF2348FF), Color(0xFF7048E8), Color(0xFFE64980), Color(0xFF12B886), Color(0xFFF59F00), Color(0xFF1098AD)];
    return PopScope(
      canPop: false,
      child: AuthShell(
        showBack: false,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const SizedBox(height: 20),
          Center(
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1), duration: const Duration(milliseconds: 700), curve: Curves.elasticOut,
              builder: (_, v, child) => Transform.scale(scale: v, child: child),
              child: Container(
                width: 110, height: 110,
                decoration: BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: [c.primary300, c.primary700], begin: Alignment.topLeft, end: Alignment.bottomRight)),
                child: const Center(child: AppIcon('bi-check-lg', size: 56, color: Colors.white)),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            for (var i = 0; i < confetti.length; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              Transform.rotate(angle: i * 0.52, child: Container(width: 8, height: 8, decoration: BoxDecoration(color: confetti[i], borderRadius: BorderRadius.circular(i.isOdd ? 2 : 4)))),
            ],
          ]),
          const SizedBox(height: 14),
          AppText("You're all set, ${n.firstName}! 🎉", v: TV.h1, center: true),
          const SizedBox(height: 8),
          const AppText('Your AutoBiz account is ready. Fund your wallet to start shopping, travelling and paying bills.', muted: true, center: true),
          const SizedBox(height: 22),
          Summary([
            SRow('Name', '${n.firstName} ${n.lastName}'),
            SRow('Email', n.email),
            SRow('Phone', n.phone),
            const SRow('Account tier', StatusPill('info', label: 'Tier 1')),
          ]),
          const SizedBox(height: 22),
          Btn(nextLabel, size: BtnSize.lg, full: true, iconRight: 'bi-arrow-right', onPressed: () => goNext(context, next)),
          const SizedBox(height: 10),
          Btn('Verify BVN to unlock USD cards', variant: BtnVariant.soft, size: BtnSize.lg, full: true, icon: 'bi-patch-check', onPressed: () {
            context.go('/');
            Future.delayed(const Duration(milliseconds: 300), () => rootContext.push(loc('/settings/verification', {'upgrade': '1'})));
          }),
        ]),
      ),
    );
  }
}
