import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../features/wallet/constants.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /wallet/transfer — ported from mobile_app/src/app/wallet/transfer.tsx
class TransferScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const TransferScreen({super.key, this.q = const {}});
  @override
  State<TransferScreen> createState() => _TransferScreenState();
}

class _TransferScreenState extends State<TransferScreen> {
  String to = '', amount = '', note = '';
  bool busy = false;
  ({String name, String handle})? rcp;
  String? toErr, amtErr;
  Timer? _debounce, _lookup;
  int _req = 0;
  final _amtFocus = FocusNode();

  @override
  void dispose() { _debounce?.cancel(); _lookup?.cancel(); _amtFocus.dispose(); super.dispose(); }

  /// Recipient lookup: debounce 350 ms, then 700 ms "network".
  void _onTo(String t) {
    setState(() { to = t; rcp = null; toErr = null; });
    _debounce?.cancel();
    _lookup?.cancel();
    final v = t.trim().replaceFirst(RegExp(r'^@'), '').toLowerCase();
    final isPhone = RegExp(r'^0\d{10}$').hasMatch(v);
    final isUser = RegExp(r'^[a-z0-9_.]{3,20}$').hasMatch(v);
    if (v.isEmpty || (!isPhone && !isUser)) { setState(() => busy = false); return; }
    final id = ++_req;
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      setState(() => busy = true);
      _lookup = Timer(const Duration(milliseconds: 700), () {
        if (!mounted || id != _req) return;
        setState(() {
          busy = false;
          final u = store.user;
          if (v == u.username.toLowerCase() || v == u.phone) { toErr = "You can't send money to yourself"; return; }
          if (v.startsWith('x') || v.startsWith('000')) { toErr = 'No AutoBiz user found with that username/phone'; return; }
          final handle = isPhone ? v : '@$v';
          final name = knownUsers[v] ?? f.titleCase(nameFor(v));
          rcp = (name: name, handle: handle);
        });
      });
    });
  }

  double get _a => double.tryParse(amount) ?? 0;

  Future<void> _submit() async {
    final a = _a;
    String? te, ae;
    if (to.trim().isEmpty) {
      te = 'Enter a username or phone number';
    } else if (toErr != null) {
      te = toErr;
    }
    if (amount.isEmpty) {
      ae = 'Enter an amount';
    } else if (a < 50) {
      ae = 'Minimum is ₦50';
    } else if (a > store.balance) {
      ae = 'Insufficient balance';
    } else {
      ae = checkLimit(a);
    }
    setState(() { toErr = te; amtErr = ae; });
    if (te != null || ae != null) return;
    final r = rcp;
    if (r == null) { toast('Please wait — confirming recipient', type: ToastType.warning); return; }
    final n = note.trim();
    final rows = [SRow('To', r.name), SRow('Username/phone', r.handle), const SRow('Fee', 'Free'), if (n.isNotEmpty) SRow('Note', n)];
    final ok = await confirmPay(PayOpts(title: 'Confirm transfer', amount: a, cta: 'Send money', rows: rows));
    if (!ok) return;
    final tx = store.debit(a, TxInput(
      type: 'transfer', title: 'Transfer to ${r.name}', subtitle: 'AutoBiz · ${r.handle}', icon: 'bi-send', tone: 'primary', ref: f.ref('TR'),
      meta: {'Recipient': r.name, 'Username/phone': r.handle, 'Amount': f.naira(a, 2), 'Fee': '₦0', 'Note': n.isEmpty ? '—' : n},
    ));
    if (tx == null) { toast('Insufficient balance', type: ToastType.error); return; }
    store.notify(icon: 'bi-send', tone: 'primary', title: 'Transfer sent', body: '${f.naira(a)} sent to ${r.name}.');
    if (mounted) goBack(context, '/wallet');
    Future.delayed(const Duration(milliseconds: 300), () => walletReceipt('Money sent', '${f.naira(a)} sent to **${r.name}** instantly.', [SRow('Recipient', r.name), SRow('Username/phone', r.handle), SRow('Amount', f.naira(a, 2))], tx));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final balance = context.select<AppStore, double>((s) => s.balance);
    final a = _a;
    return AppScreen(
      header: AppHeader(title: 'Send to AutoBiz user', subtitle: 'Balance ${f.naira(balance, 2)}', fallback: '/wallet'),
      footer: Btn(a > 0 ? 'Send ${f.naira(a)}' : 'Send money', size: BtnSize.lg, full: true, icon: 'bi-send', onPressed: _submit),
      children: [
        const SizedBox(height: 8),
        const Notice('Instant and free transfers to any AutoBiz wallet.', icon: 'bi-lightning-charge'),
        const SizedBox(height: 18),
        const AppText('Frequent', v: TV.label, muted: true),
        const SizedBox(height: 10),
        Row(children: [
          for (final e in knownUsers.entries.take(4))
            Padding(
              padding: const EdgeInsets.only(right: 14),
              child: GestureDetector(
                onTap: () {
                  _onTo(e.key);
                  Future.delayed(const Duration(milliseconds: 300), () { if (mounted) _amtFocus.requestFocus(); });
                },
                child: SizedBox(
                  width: 64,
                  child: Column(children: [
                    Avatar(f.phraseInitials(e.value), size: 50),
                    const SizedBox(height: 6),
                    AppText('@${e.key}', v: TV.xs, weight: FontWeight.w600, maxLines: 1),
                  ]),
                ),
              ),
            ),
        ]),
        const SizedBox(height: 18),
        AppTextField(
          label: 'Username or phone number', prefix: '@', placeholder: 'username or 080…', autocorrect: false,
          value: to, onChanged: _onTo, error: toErr, success: rcp != null,
          suffix: busy
              ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: c.primary))
              : rcp != null ? AppIcon('bi-check-circle-fill', size: 18, color: c.success) : null,
        ),
        if (rcp != null)
          Container(
            margin: const EdgeInsets.only(top: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: c.successSoft, borderRadius: BorderRadius.circular(14)),
            child: Row(children: [
              Avatar(f.phraseInitials(rcp!.name), size: 36, bg: c.success, color: Colors.white),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppText(rcp!.name, weight: FontWeight.w700),
                AppText(rcp!.handle, v: TV.xs, muted: true),
              ])),
              AppIcon('bi-patch-check-fill', size: 18, color: c.success),
            ]),
          ),
        const SizedBox(height: 16),
        AppTextField(
          label: 'Amount', prefix: '₦', big: true, focusNode: _amtFocus, keyboardType: const TextInputType.numberWithOptions(decimal: true), placeholder: '0.00',
          value: amount, inputFormatters: [AppTextField.decimal], error: amtErr,
          onChanged: (t) => setState(() { amount = t; amtErr = null; }),
        ),
        const SizedBox(height: 16),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final v in [1000, 5000, 10000, 20000]) AppChip(f.naira(v), active: a == v, onTap: () => setState(() { amount = '$v'; amtErr = null; })),
        ]),
        const SizedBox(height: 16),
        AppTextField(label: 'Note', placeholder: "What's it for? (optional)", maxLength: 60, value: note, onChanged: (t) => note = t),
        const SizedBox(height: 16),
        Summary([SRow('Fee', 'Free', color: c.success)], total: ('You send', f.naira(a, 2))),
      ],
    );
  }
}
