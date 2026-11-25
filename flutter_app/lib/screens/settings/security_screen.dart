import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../core/validators.dart';
import '../../features/auth/auth_widgets.dart';
import '../../features/settings/settings_shared.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /settings/security
class SecurityScreen extends StatelessWidget {
  /// query parameters
  final Map<String, String> q;
  const SecurityScreen({super.key, this.q = const {}});
  @override
  Widget build(BuildContext context) => const AppScreen(
        header: AppHeader(title: 'Security', subtitle: 'Keep your account and money safe'),
        children: [_PasswordCard(), _PinCard(), _TwoFACard(), _Sessions()],
      );
}

class _SectionTitle extends StatelessWidget {
  final String icon, tone, title, sub;
  const _SectionTitle({required this.icon, required this.tone, required this.title, required this.sub});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(children: [
          IconTile(icon, tone: tone, size: 34),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [AppText(title, v: TV.h3), AppText(sub, v: TV.xs, muted: true)])),
        ]),
      );
}

/* ---------------- Password ---------------- */
class _PasswordCard extends StatefulWidget {
  const _PasswordCard();
  @override
  State<_PasswordCard> createState() => _PasswordCardState();
}

class _PasswordCardState extends State<_PasswordCard> {
  String cur = '', nxt = '', confirm = '';
  String? eCur, eNext, eConfirm;
  bool busy = false;
  int _gen = 0; // bump to reset fields

  Future<void> _submit() async {
    String? a, b, c2;
    if (cur.length < 6) a = 'Enter your current password';
    if (!(nxt.length >= 8 && RegExp(r'\d').hasMatch(nxt) && RegExp('[A-Z]').hasMatch(nxt))) b = 'Use at least 8 characters with a number and an uppercase letter';
    if (confirm != nxt || confirm.isEmpty) c2 = "Passwords don't match";
    setState(() { eCur = a; eNext = b; eConfirm = c2; });
    if (a != null || b != null || c2 != null) return;
    if (nxt == cur) {
      setState(() => eNext = 'New password must be different from current');
      toast('New password must be different from current', type: ToastType.warning);
      return;
    }
    setState(() => busy = true);
    await sleep(900);
    if (!mounted) return;
    setState(() { busy = false; cur = ''; nxt = ''; confirm = ''; _gen++; });
    store.notify(icon: 'bi-key', tone: 'success', title: 'Password changed', body: "Your password was updated. If this wasn't you, contact support.");
    toast('Password updated successfully');
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const _SectionTitle(icon: 'bi-key', tone: 'primary', title: 'Change password', sub: 'Use 8+ characters with upper case, numbers & symbols'),
          CardBox(
            child: Column(key: ValueKey(_gen), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              AppTextField(label: 'Current password', password: true, value: cur, error: eCur, onChanged: (t) => setState(() { cur = t; eCur = null; })),
              const SizedBox(height: 12),
              AppTextField(label: 'New password', password: true, value: nxt, error: eNext, onChanged: (t) => setState(() { nxt = t; eNext = null; })),
              StrengthMeter(nxt),
              const SizedBox(height: 12),
              AppTextField(label: 'Confirm new password', password: true, value: confirm, error: eConfirm, onChanged: (t) => setState(() { confirm = t; eConfirm = null; })),
              const SizedBox(height: 12),
              Btn('Update password', loading: busy, loadingText: 'Updating…', onPressed: _submit),
            ]),
          ),
        ]),
      );
}

/* ---------------- Transaction PIN ---------------- */
class _PinCard extends StatefulWidget {
  const _PinCard();
  @override
  State<_PinCard> createState() => _PinCardState();
}

class _PinCardState extends State<_PinCard> {
  String cur = '', nxt = '', confirm = '';
  String? eCur, eNext, eConfirm;
  bool busy = false;
  int _gen = 0;

  Future<void> _submit() async {
    final st = store.settings;
    final four = RegExp(r'^\d{4}$');
    String? a, b, c2;
    final curOk = four.hasMatch(cur) && cur != '0000' && (st.pin == null || st.pin == cur);
    if (!curOk) a = st.pin != null && four.hasMatch(cur) ? 'Incorrect current PIN' : 'Enter your current 4-digit PIN';
    if (!four.hasMatch(nxt)) {
      b = 'PIN must be 4 digits';
    } else if (isSequentialOrRepeated(nxt)) {
      b = 'Avoid repeated or sequential digits';
    } else if (nxt == cur) {
      b = 'New PIN must differ from current PIN';
    }
    if (confirm != nxt || confirm.isEmpty) c2 = "PINs don't match";
    setState(() { eCur = a; eNext = b; eConfirm = c2; });
    if (a != null || b != null || c2 != null) return;
    setState(() => busy = true);
    await sleep(900);
    if (!mounted) return;
    final newPin = nxt;
    store.mutate(() { st.pinSet = true; st.pin = newPin; st.pinChangedAt = f.now(); });
    setState(() { busy = false; cur = ''; nxt = ''; confirm = ''; _gen++; });
    store.notify(icon: 'bi-grid-3x3-gap', tone: 'primary', title: 'Transaction PIN changed', body: 'Use your new PIN for your next payment.');
    toast('Transaction PIN changed');
  }

  Widget _pinField(String label, String value, String? err, ValueChanged<String> on, {String? hint}) => AppTextField(
        label: label, value: value, error: err, hint: hint, password: true, placeholder: '••••', maxLength: 4,
        keyboardType: TextInputType.number, inputFormatters: [FilteringTextInputFormatter.digitsOnly], onChanged: on,
      );

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppStore>().settings;
    return Padding(
      padding: const EdgeInsets.only(top: 22),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _SectionTitle(icon: 'bi-grid-3x3-gap', tone: 'violet', title: 'Transaction PIN', sub: st.pinChangedAt != null ? 'Last changed ${f.date(st.pinChangedAt!)}' : 'Approves every payment and withdrawal'),
        CardBox(
          child: Column(key: ValueKey(_gen), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            _pinField('Current PIN', cur, eCur, (t) => setState(() { cur = t; eCur = null; }), hint: st.pin == null ? 'Demo: any 4 digits except 0000' : null),
            const SizedBox(height: 12),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: _pinField('New PIN', nxt, eNext, (t) => setState(() { nxt = t; eNext = null; }))),
              const SizedBox(width: 10),
              Expanded(child: _pinField('Confirm PIN', confirm, eConfirm, (t) => setState(() { confirm = t; eConfirm = null; }))),
            ]),
            const SizedBox(height: 12),
            Btn('Change PIN', variant: BtnVariant.soft, loading: busy, loadingText: 'Updating…', onPressed: _submit),
          ]),
        ),
      ]),
    );
  }
}

/* ---------------- Two-factor ---------------- */
const _b32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ234567';

class _TwoFACard extends StatelessWidget {
  const _TwoFACard();
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final on = context.watch<AppStore>().settings.twoFA;
    return Padding(
      padding: const EdgeInsets.only(top: 22),
      child: CardBox(
        child: Row(children: [
          const IconTile('bi-shield-check', tone: 'success', size: 44),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const AppText('Two-factor authentication', weight: FontWeight.w700),
            AppText(on ? 'On · Authenticator app' : 'Off · Add an extra layer of security', v: TV.xs, muted: true),
          ])),
          Switch.adaptive(
            value: on,
            activeTrackColor: c.primary,
            activeThumbColor: Colors.white,
            onChanged: (v) {
              HapticFeedback.selectionClick();
              if (!v) {
                store.mutate(() => store.settings.twoFA = false);
                toast('Two-factor authentication turned off', type: ToastType.warning);
                return;
              }
              final r = math.Random();
              final key = List.generate(16, (_) => _b32[r.nextInt(_b32.length)]).join();
              showSheet(_TwoFASheet(setupKey: key));
            },
          ),
        ]),
      ),
    );
  }
}

class _TwoFASheet extends StatefulWidget {
  final String setupKey;
  const _TwoFASheet({required this.setupKey});
  @override
  State<_TwoFASheet> createState() => _TwoFASheetState();
}

class _TwoFASheetState extends State<_TwoFASheet> {
  String otp = '';
  String? err;
  bool busy = false;

  Future<void> _verify() async {
    if (!RegExp(r'^\d{6}$').hasMatch(otp)) { setState(() => err = 'Enter the 6-digit code from your app'); return; }
    setState(() => busy = true);
    await sleep(900);
    store.mutate(() => store.settings.twoFA = true);
    store.notify(icon: 'bi-shield-lock', tone: 'success', title: '2FA enabled', body: 'Your account is now protected with two-factor authentication.');
    if (!mounted) return;
    Navigator.of(context).pop();
    toast('Two-factor authentication enabled');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppSheet(
      title: 'Enable two-factor authentication',
      locked: busy,
      footer: Btn('Verify & enable', size: BtnSize.lg, full: true, loading: busy, loadingText: 'Verifying…', onPressed: _verify),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const NumberedStep(1, 'Open Google Authenticator or Authy.'),
        const NumberedStep(2, 'Add an account using this setup key.'),
        const NumberedStep(3, 'Enter the 6-digit code it shows.'),
        Container(
          margin: const EdgeInsets.symmetric(vertical: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(14)),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const AppText('Setup key', v: TV.label, muted: true),
              AppText(f.groupDigits(widget.setupKey), v: TV.h3, tabular: true, selectable: true),
            ])),
            Btn('Copy', icon: 'bi-copy', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: () => copyText(widget.setupKey, 'Setup key copied')),
          ]),
        ),
        AppTextField(
          label: '6-digit code', keyboardType: TextInputType.number, maxLength: 6, placeholder: '000000', inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          value: otp, error: err, onChanged: (t) => setState(() { otp = t; err = null; }),
        ),
      ]),
    );
  }
}

/* ---------------- Sessions ---------------- */
class _Sessions extends StatefulWidget {
  const _Sessions();
  @override
  State<_Sessions> createState() => _SessionsState();
}

class _SessionsState extends State<_Sessions> {
  String? busy;

  Future<void> _signOut(String id) async {
    setState(() => busy = id);
    await sleep(600);
    store.mutate(() => store.sessions = store.sessions.where((x) => x.id != id).toList());
    if (mounted) setState(() => busy = null);
    toast('Device signed out');
  }

  Future<void> _signOutAll() async {
    setState(() => busy = 'all');
    await sleep(800);
    store.mutate(() => store.sessions = store.sessions.where((x) => x.current).toList());
    if (mounted) setState(() => busy = null);
    toast('Signed out of all other devices');
  }

  @override
  Widget build(BuildContext context) {
    final sessions = context.watch<AppStore>().sessions;
    final others = sessions.where((s) => !s.current).length;
    return Group(
      title: 'Active sessions',
      subtitle: 'Devices signed in to your account',
      children: [
        for (final s in sessions)
          ListRow(
            icon: s.icon,
            tone: s.current ? 'success' : 'neutral',
            title: s.device,
            subtitle: '${s.loc} · ${s.ip} · ${s.current ? 'Active now' : f.ago(s.last)}',
            trailing: s.current ? const StatusPill('success', label: 'This device') : Btn('Sign out', size: BtnSize.sm, variant: BtnVariant.dangerSoft, loading: busy == s.id, loadingText: '…', onPressed: () => _signOut(s.id)),
          ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: others > 0
              ? Btn('Sign out all other devices', variant: BtnVariant.outline, icon: 'bi-box-arrow-right', loading: busy == 'all', loadingText: 'Signing out…', onPressed: _signOutAll)
              : const Notice('Only this device is signed in.', tone: 'success', icon: 'bi-shield-check'),
        ),
      ],
    );
  }
}
