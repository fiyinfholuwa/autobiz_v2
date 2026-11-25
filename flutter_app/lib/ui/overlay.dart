/// ==========================================================================
/// Global overlays — mirror mobile_app/src/components/overlay (web AB.* helpers).
///   toast(msg, type: ToastType.success, actionLabel:, onAction:)   "**bold**" supported
///   await confirmPay(PayOpts(...))  → bool   PIN keypad + balance check (guests → login prompt)
///   success(SuccessOpts(...))                receipt sheet
///   openFund()                               fund wallet sheet
///   requireLogin(...) → bool                 true if authed, else shows login prompt
///   await confirmDialog(ConfirmOpts(...)) → bool
///   copyText(text, [msg]); shareText(title, message); receiptText(title, rows)
/// ==========================================================================
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../core/format.dart' as f;
import '../core/nav.dart';
import '../core/random.dart';
import '../core/theme.dart';
import '../store/app_store.dart';
import 'app_icon.dart';
import 'inputs.dart';
import 'sheet.dart';
import 'text.dart';
import 'widgets.dart';

/* ---------------- Toasts ---------------- */
enum ToastType { success, error, warning, info }

class _Toast { final int id; final String msg; final ToastType type; final String? actionLabel; final VoidCallback? onAction; _Toast(this.id, this.msg, this.type, this.actionLabel, this.onAction); }

final _toasts = ValueNotifier<List<_Toast>>([]);
int _tid = 0;

void toast(String msg, {ToastType type = ToastType.success, String? actionLabel, VoidCallback? onAction, int duration = 3800}) {
  final t = _Toast(++_tid, msg, type, actionLabel, onAction);
  if (type == ToastType.error) HapticFeedback.heavyImpact();
  if (type == ToastType.success) HapticFeedback.lightImpact();
  final list = [..._toasts.value, t];
  _toasts.value = list.length > 3 ? list.sublist(list.length - 3) : list;
  Timer(Duration(milliseconds: duration), () => _dismiss(t.id));
}

void _dismiss(int id) => _toasts.value = _toasts.value.where((x) => x.id != id).toList();

/// Put above the Navigator via MaterialApp.builder so toasts show over sheets too.
class ToastHost extends StatelessWidget {
  const ToastHost({super.key});
  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return ValueListenableBuilder<List<_Toast>>(
      valueListenable: _toasts,
      builder: (context, list, _) => Positioned(
        top: top + 8, left: 12, right: 12,
        child: Column(mainAxisSize: MainAxisSize.min, children: [for (final t in list) _ToastView(key: ValueKey(t.id), t: t)]),
      ),
    );
  }
}

class _ToastView extends StatelessWidget {
  final _Toast t;
  const _ToastView({super.key, required this.t});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final (icon, color) = switch (t.type) {
      ToastType.success => ('bi-check-circle-fill', c.success),
      ToastType.error => ('bi-x-circle-fill', c.danger),
      ToastType.warning => ('bi-exclamation-triangle-fill', c.warning),
      ToastType.info => ('bi-info-circle-fill', c.primary),
    };
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1), duration: const Duration(milliseconds: 260), curve: Curves.easeOutBack,
      builder: (_, v, child) => Opacity(opacity: v.clamp(0, 1), child: Transform.translate(offset: Offset(0, -20 * (1 - v)), child: child)),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Material(
          color: c.dark ? const Color(0xFF2A2A2E) : const Color(0xFF191919),
          borderRadius: BorderRadius.circular(R.lg),
          elevation: 8,
          child: InkWell(
            borderRadius: BorderRadius.circular(R.lg),
            onTap: () => _dismiss(t.id),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppIcon(icon, size: 20, color: color),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  RichAppText(t.msg, v: TV.sm, color: Colors.white),
                  if (t.actionLabel != null)
                    GestureDetector(
                      onTap: () { _dismiss(t.id); t.onAction?.call(); },
                      child: Padding(padding: const EdgeInsets.only(top: 4), child: AppText('${t.actionLabel} →', v: TV.sm, weight: FontWeight.w700, color: c.primary300)),
                    ),
                ])),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/* ---------------- Clipboard / share ---------------- */
Future<void> copyText(String text, [String msg = 'Copied to clipboard']) async {
  try { await Clipboard.setData(ClipboardData(text: text)); toast(msg); } catch (_) { toast('Copy failed', type: ToastType.error); }
}

Future<void> shareText(String title, String message) async {
  try {
    await SharePlus.instance.share(ShareParams(text: message, subject: title));
  } catch (_) {
    await copyText(message, 'Receipt copied to clipboard');
  }
}

String receiptText(String title, List<SRow> rows) => ['AutoBiz Receipt', title, ...rows.map((r) => '${r.label}: ${r.plain}')].join('\n');

/* ---------------- Login prompt ---------------- */
bool requireLogin({String title = 'Log in to continue', String message = 'Sign in or create a free account to continue.', String? next}) {
  if (store.authed) return true;
  showSheet(_LoginSheet(title: title, message: message, next: next));
  return false;
}

class _LoginSheet extends StatelessWidget {
  final String title, message;
  final String? next;
  const _LoginSheet({required this.title, required this.message, this.next});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final count = store.cartCount;
    void go(String path) {
      Navigator.of(context).pop();
      rootContext.push(loc(path, {'next': next}));
    }
    return AppSheet(
      footer: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Btn('Log in', size: BtnSize.lg, full: true, onPressed: () => go('/login')),
        const SizedBox(height: 10),
        Btn('Create free account', size: BtnSize.lg, variant: BtnVariant.soft, full: true, onPressed: () => go('/register')),
        const SizedBox(height: 4),
        Btn('Keep browsing', variant: BtnVariant.ghost, onPressed: () => Navigator.of(context).pop()),
      ]),
      child: Column(children: [
        const SizedBox(height: 4),
        const IconTile('bi-person-lock', size: 72, rounded: true),
        const SizedBox(height: 14),
        AppText(title, v: TV.h2, center: true),
        const SizedBox(height: 6),
        AppText(message, v: TV.sm, muted: true, center: true),
        if (count > 0) Padding(padding: const EdgeInsets.only(top: 8), child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          AppIcon('bi-bag-check', size: 12, color: c.success), const SizedBox(width: 4),
          AppText('Your $count cart item${count > 1 ? 's are' : ' is'} saved.', v: TV.xs, muted: true),
        ])),
      ]),
    );
  }
}

/* ---------------- Confirm payment (PIN) ---------------- */
class PayOpts {
  final String title;
  final double amount;
  final List<SRow> rows;
  final String? note, amountLabel, cta;
  /// 'ngn' | 'usd'
  final String currency;
  final bool skipBalanceCheck;
  final int delay;
  const PayOpts({this.title = 'Confirm payment', required this.amount, this.rows = const [], this.note, this.currency = 'ngn', this.amountLabel, this.cta, this.skipBalanceCheck = false, this.delay = 1100});
}

Future<bool> confirmPay(PayOpts o) async {
  if (!store.authed) {
    requireLogin(title: 'Log in to continue', message: "Create a free account or log in to complete this payment. You'll come right back here.");
    return false;
  }
  final r = await showSheet<bool>(_PaySheet(o));
  return r ?? false;
}

class _PaySheet extends StatefulWidget {
  final PayOpts o;
  const _PaySheet(this.o);
  @override
  State<_PaySheet> createState() => _PaySheetState();
}

class _PaySheetState extends State<_PaySheet> with SingleTickerProviderStateMixin {
  String pin = '';
  bool busy = false, err = false;
  late final AnimationController _shake = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
  @override
  void dispose() { _shake.dispose(); super.dispose(); }

  Future<void> _submit(String p) async {
    final ok = store.settings.pin != null ? p == store.settings.pin : p != '0000';
    if (!ok) {
      setState(() => err = true);
      HapticFeedback.heavyImpact();
      _shake.forward(from: 0);
      toast('Incorrect PIN. Try again.', type: ToastType.error);
      await sleep(450);
      if (mounted) setState(() { pin = ''; err = false; });
      return;
    }
    setState(() => busy = true);
    await sleep(widget.o.delay);
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final o = widget.o;
    final isUsd = o.currency == 'usd';
    final bal = store.spendable;
    final insufficient = !isUsd && !o.skipBalanceCheck && bal < o.amount;
    return AppSheet(
      title: o.title,
      locked: busy,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Center(child: Column(children: [
          AppText(o.amountLabel ?? "You're paying", v: TV.label, muted: true),
          const SizedBox(height: 4),
          AppText(isUsd ? f.usd(o.amount) : f.naira(o.amount, 2), v: TV.display, tabular: true),
        ])),
        if (o.rows.isNotEmpty) Summary(o.rows, margin: const EdgeInsets.symmetric(vertical: 12)),
        if (!isUsd && !o.skipBalanceCheck)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.lg), border: Border.all(color: insufficient ? c.danger : c.border, width: 1.5)),
            child: Row(children: [
              const IconTile('bi-wallet2', size: 36),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const AppText('Wallet balance', v: TV.sm, weight: FontWeight.w600),
                AppText(f.naira(bal, 2), v: TV.xs, muted: true, tabular: true),
              ])),
              insufficient
                  ? Btn('Top up', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: () { Navigator.of(context).pop(false); Future.delayed(const Duration(milliseconds: 300), openFund); })
                  : AppIcon('bi-check-circle-fill', size: 20, color: c.success),
            ]),
          ),
        if (insufficient)
          const Notice('Insufficient balance. Fund your wallet to continue.', tone: 'danger', icon: 'bi-exclamation-circle')
        else ...[
          AppText(busy ? 'Processing…' : 'Enter your 4-digit transaction PIN', v: TV.sm, muted: true, center: true),
          const SizedBox(height: 14),
          AnimatedBuilder(
            animation: _shake,
            builder: (_, child) {
              final t = _shake.value;
              return Transform.translate(offset: Offset(t == 0 ? 0 : 10 * (1 - t) * ((t * 10).floor().isEven ? 1 : -1), 0), child: child);
            },
            child: PinDots(value: pin, error: err),
          ),
          if (store.settings.pin == null) const Padding(padding: EdgeInsets.only(top: 8), child: AppText('Demo: any PIN works except 0000', v: TV.xs, muted: true, center: true)),
          const SizedBox(height: 14),
          Keypad(
            disabled: busy,
            onKey: (d) {
              if (pin.length >= 4) return;
              setState(() => pin += d);
              if (pin.length == 4) Future.delayed(const Duration(milliseconds: 120), () => _submit(pin));
            },
            onDelete: () => setState(() => pin = pin.isEmpty ? pin : pin.substring(0, pin.length - 1)),
          ),
          if (busy) Padding(padding: const EdgeInsets.only(top: 10), child: Btn(o.cta ?? 'Confirm & Pay', loading: true, loadingText: 'Processing…', full: true, onPressed: () {})),
        ],
        if (o.note != null) Padding(padding: const EdgeInsets.only(top: 12), child: AppText(o.note!, v: TV.xs, muted: true, center: true)),
      ]),
    );
  }
}

/* ---------------- Success receipt ---------------- */
class SuccessAction {
  final String label;
  final VoidCallback onTap;
  final BtnVariant variant;
  final String? icon;
  /// don't close the receipt when tapped (e.g. Share / Copy)
  final bool keepOpen;
  const SuccessAction(this.label, this.onTap, {this.variant = BtnVariant.soft, this.icon, this.keepOpen = false});
}

class SuccessOpts {
  final String title;
  final String? message, icon;
  final List<SRow> rows;
  final Widget? extra;
  final List<SuccessAction> actions;
  final String tone;
  const SuccessOpts({this.title = 'Successful', this.message, this.rows = const [], this.extra, this.actions = const [], this.icon, this.tone = 'success'});
}

Future<void> success(SuccessOpts o) {
  HapticFeedback.mediumImpact();
  return showSheet(_SuccessSheet(o));
}

class _SuccessSheet extends StatelessWidget {
  final SuccessOpts o;
  const _SuccessSheet(this.o);
  @override
  Widget build(BuildContext context) {
    final t = context.tone(o.tone);
    return AppSheet(
      footer: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (o.actions.isNotEmpty) ...[
          Row(children: [
            for (var i = 0; i < o.actions.length; i++) ...[
              if (i > 0) const SizedBox(width: 10),
              Expanded(child: Btn(o.actions[i].label, icon: o.actions[i].icon, variant: o.actions[i].variant, onPressed: () {
                final a = o.actions[i];
                if (a.keepOpen) { a.onTap(); return; }
                Navigator.of(context).pop();
                Future.delayed(const Duration(milliseconds: 280), a.onTap);
              })),
            ],
          ]),
          const SizedBox(height: 10),
        ],
        Btn('Done', full: true, onPressed: () => Navigator.of(context).pop()),
      ]),
      child: Column(children: [
        const SizedBox(height: 6),
        TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: 1), duration: const Duration(milliseconds: 500), curve: Curves.elasticOut,
          builder: (_, v, child) => Transform.scale(scale: v, child: child),
          child: Container(
            width: 84, height: 84, decoration: BoxDecoration(color: t.bg, shape: BoxShape.circle),
            child: Center(child: Container(width: 60, height: 60, decoration: BoxDecoration(color: t.fg, shape: BoxShape.circle), child: Center(child: AppIcon(o.icon ?? 'bi-check-lg', size: 32, color: Colors.white)))),
          ),
        ),
        const SizedBox(height: 14),
        AppText(o.title, v: TV.h2, center: true),
        if (o.message != null) Padding(padding: const EdgeInsets.only(top: 6), child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 320), child: RichAppText(o.message!, v: TV.sm, muted: true, center: true))),
        if (o.rows.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 16), child: Summary(o.rows)),
        if (o.extra != null) Padding(padding: const EdgeInsets.only(top: 12), child: o.extra!),
      ]),
    );
  }
}

/* ---------------- Confirm dialog ---------------- */
class ConfirmOpts {
  final String title;
  final String? message, icon, check;
  final String confirmLabel, cancelLabel;
  /// danger | warning | primary
  final String tone;
  final Widget? child;
  final int loadingMs;
  const ConfirmOpts({required this.title, this.message, this.confirmLabel = 'Confirm', this.cancelLabel = 'Cancel', this.tone = 'primary', this.icon, this.check, this.child, this.loadingMs = 0});
}

Future<bool> confirmDialog(ConfirmOpts o) async => (await showSheet<bool>(_ConfirmSheet(o))) ?? false;

class _ConfirmSheet extends StatefulWidget {
  final ConfirmOpts o;
  const _ConfirmSheet(this.o);
  @override
  State<_ConfirmSheet> createState() => _ConfirmSheetState();
}

class _ConfirmSheetState extends State<_ConfirmSheet> {
  bool checked = false, busy = false;
  @override
  Widget build(BuildContext context) {
    final o = widget.o;
    return AppSheet(
      locked: busy,
      footer: Row(children: [
        Expanded(child: Btn(o.cancelLabel, variant: BtnVariant.outline, disabled: busy, onPressed: () => Navigator.of(context).pop(false))),
        const SizedBox(width: 10),
        Expanded(child: Btn(o.confirmLabel, variant: o.tone == 'danger' ? BtnVariant.danger : BtnVariant.primary, disabled: o.check != null && !checked, loading: busy, onPressed: () async {
          if (o.loadingMs > 0) { setState(() => busy = true); await sleep(o.loadingMs); }
          if (context.mounted) Navigator.of(context).pop(true);
        })),
      ]),
      child: Column(children: [
        IconTile(o.icon ?? (o.tone == 'danger' ? 'bi-exclamation-triangle' : 'bi-question-circle'), tone: o.tone, size: 64, rounded: true),
        const SizedBox(height: 12),
        AppText(o.title, v: TV.h2, center: true),
        if (o.message != null) Padding(padding: const EdgeInsets.only(top: 6), child: RichAppText(o.message!, v: TV.sm, muted: true, center: true)),
        if (o.child != null) Padding(padding: const EdgeInsets.only(top: 12), child: o.child!),
        if (o.check != null) Padding(padding: const EdgeInsets.only(top: 12), child: AppCheckbox(checked: checked, onChanged: (v) => setState(() => checked = v), label: o.check)),
      ]),
    );
  }
}

/* ---------------- Fund wallet ---------------- */
const dedicatedAccounts = [('Wema Bank', '7821443609'), ('Moniepoint MFB', '5093227184')];

void openFund() {
  if (!requireLogin(title: 'Log in to fund your wallet', message: 'Create a free account or log in to add money to your AutoBiz wallet.')) return;
  showSheet(const _FundSheet());
}

class _FundSheet extends StatefulWidget {
  const _FundSheet();
  @override
  State<_FundSheet> createState() => _FundSheetState();
}

class _FundSheetState extends State<_FundSheet> {
  String tab = 'bank', amount = '', voucher = '';
  String? busy;

  void _fund(double amt, String sub) {
    store.credit(amt, TxInput(type: 'funding', title: 'Wallet Funding', subtitle: sub, icon: 'bi-arrow-down-left', tone: 'success'));
    store.notify(icon: 'bi-wallet2', tone: 'success', title: 'Wallet funded', body: '${f.naira(amt)} was added to your wallet.');
    Navigator.of(context).pop();
    Future.delayed(const Duration(milliseconds: 320), () => success(SuccessOpts(title: 'Wallet funded', message: '${f.naira(amt, 2)} has been added to your wallet.', rows: [SRow('New balance', f.naira(store.balance, 2)), SRow('Method', sub)])));
  }

  Future<void> _run(String key, int ms, VoidCallback fn) async {
    setState(() => busy = key);
    await sleep(ms);
    if (!mounted) return;
    setState(() => busy = null);
    fn();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final u = store.user;
    return AppSheet(
      title: 'Fund wallet',
      locked: busy != null,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Segment<String>(value: tab, onChanged: (v) => setState(() => tab = v), options: const [SegOption('bank', 'Bank transfer'), SegOption('card', 'Card'), SegOption('voucher', 'Voucher')]),
        const SizedBox(height: 14),
        if (tab == 'bank') ...[
          const AppText('Transfer to your dedicated account. Your wallet is credited automatically within 1 minute.', v: TV.sm, muted: true),
          for (final (b, n) in dedicatedAccounts)
            Container(
              margin: const EdgeInsets.only(top: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.lg), border: Border.all(color: c.border)),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  AppText(b, v: TV.xs, muted: true),
                  AppText('${n.substring(0, 4)} ${n.substring(4, 8)} ${n.substring(8)}', v: TV.h2, tabular: true),
                  AppText('AutoBiz – ${u.firstName} ${u.lastName}', v: TV.xs, muted: true),
                ])),
                Btn('Copy', icon: 'bi-copy', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: () => copyText(n, 'Account number copied')),
              ]),
            ),
          const SizedBox(height: 10),
          const AppText('ⓘ A ₦50 stamp fee applies to transfers above ₦10,000.', v: TV.xs, muted: true),
          const SizedBox(height: 10),
          Btn('Simulate ₦50,000 transfer (demo)', icon: 'bi-lightning', variant: BtnVariant.outline, loading: busy == 'sim', onPressed: () => _run('sim', 1200, () => _fund(50000, 'Bank transfer · Wema'))),
        ] else if (tab == 'card') ...[
          AppTextField(label: 'Amount', prefix: '₦', big: true, keyboardType: const TextInputType.numberWithOptions(decimal: true), placeholder: '0.00', value: amount, inputFormatters: [AppTextField.decimal], onChanged: (v) => setState(() => amount = v)),
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: [for (final v in [5000, 10000, 20000, 50000]) AppChip(f.naira(v), active: double.tryParse(amount) == v, onTap: () => setState(() => amount = '$v'))]),
          const SizedBox(height: 12),
          const AppText('1.5% card processing fee (capped at ₦2,000). Secured by Paystack.', v: TV.xs, muted: true),
          const SizedBox(height: 12),
          Btn('Continue', size: BtnSize.lg, loading: busy == 'card', onPressed: () {
            final amt = double.tryParse(amount) ?? 0;
            if (amt < 100) { toast('Enter an amount of at least ₦100', type: ToastType.warning); return; }
            _run('card', 1500, () => _fund(amt, 'Debit card •••• 4081'));
          }),
        ] else ...[
          AppTextField(label: 'Voucher PIN', placeholder: 'XXXX-XXXX-XXXX', textCapitalization: TextCapitalization.characters, maxLength: 14, value: voucher, onChanged: (v) => setState(() => voucher = v)),
          const SizedBox(height: 12),
          Btn('Redeem voucher', size: BtnSize.lg, loading: busy == 'v', onPressed: () {
            final v = voucher.replaceAll(RegExp(r'\W'), '');
            if (v.length < 12) { toast('Enter a valid 12-character voucher PIN', type: ToastType.warning); return; }
            _run('v', 1000, () => _fund(5000, 'Voucher ${v.substring(0, 4).toUpperCase()}••••'));
          }),
        ],
      ]),
    );
  }
}
