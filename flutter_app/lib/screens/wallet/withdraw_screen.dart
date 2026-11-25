import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../features/wallet/constants.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /wallet/withdraw (q: bank, number) — ported from mobile_app/src/app/wallet/withdraw.tsx
class WithdrawScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const WithdrawScreen({super.key, this.q = const {}});
  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends State<WithdrawScreen> {
  late String bank = widget.q['bank'] ?? '';
  late String acct = widget.q['number'] ?? '';
  String amount = '', narration = '';
  bool save = false, resolving = false;
  String? name, errBank, errAcct, errAmount;
  Timer? _t;
  int _req = 0;

  @override
  void initState() {
    super.initState();
    _resolve();
  }

  @override
  void dispose() { _t?.cancel(); super.dispose(); }

  /// Account-name lookup (900 ms; "000…" → not found). Out-of-order responses are dropped.
  void _resolve() {
    _t?.cancel();
    name = null;
    errAcct = null;
    if (bank.isEmpty || !RegExp(r'^\d{10}$').hasMatch(acct)) { resolving = false; return; }
    final id = ++_req;
    resolving = true;
    final b = bank, a = acct;
    _t = Timer(const Duration(milliseconds: 900), () {
      if (!mounted || id != _req) return;
      setState(() {
        resolving = false;
        if (a.startsWith('000')) { errAcct = 'Account not found at $b'; return; }
        BankAccount? sv;
        for (final x in store.bankAccounts) { if (x.bank == b && x.number == a) sv = x; }
        name = sv?.name ?? nameFor(b + a);
      });
    });
  }

  void _setBankAcct(String b, String a) => setState(() { bank = b; acct = a; errBank = null; _resolve(); });

  double get _a => double.tryParse(amount) ?? 0;

  Future<void> _submit() async {
    final a = _a;
    final fee = a > 0 ? withdrawFee(a) : 0.0;
    final total = a + fee;
    String? eb, ea, eam;
    if (bank.isEmpty) eb = 'Select a bank';
    if (!RegExp(r'^\d{10}$').hasMatch(acct)) {
      ea = 'Enter a valid 10-digit account number';
    } else if (errAcct != null) {
      ea = errAcct;
    }
    if (amount.isEmpty) {
      eam = 'Enter an amount';
    } else if (a < 100) {
      eam = 'Minimum withdrawal is ₦100';
    } else if (total > store.balance) {
      eam = 'Insufficient balance (incl. fee)';
    } else {
      eam = checkLimit(total);
    }
    setState(() { errBank = eb; errAcct = ea; errAmount = eam; });
    if (eb != null || ea != null || eam != null) return;
    final nm = name;
    if (nm == null) { toast('Please wait — verifying account name', type: ToastType.warning); return; }
    final ok = await confirmPay(PayOpts(
      title: 'Confirm withdrawal', amount: total, cta: 'Withdraw',
      rows: [SRow('Bank', bank), SRow('Account', acct), SRow('Name', nm), SRow('Amount', f.naira(a, 2)), SRow('Fee', f.naira(fee))],
    ));
    if (!ok) return;
    final b = bank, ac = acct, note = narration.trim();
    final tx = store.debit(total, TxInput(
      type: 'withdrawal', title: 'Withdrawal to $b', subtitle: '$ac · $nm', icon: 'bi-bank', tone: 'orange', ref: f.ref('WD'),
      meta: {'Bank': b, 'Account number': ac, 'Account name': nm, 'Amount': f.naira(a, 2), 'Fee': f.naira(fee), 'Narration': note.isEmpty ? '—' : note, 'Session ID': '1000${f.now()}'},
    ));
    if (tx == null) { toast('Insufficient balance', type: ToastType.error); return; }
    if (save && !store.bankAccounts.any((x) => x.bank == b && x.number == ac)) {
      store.mutate(() => store.bankAccounts.add(BankAccount(id: 'BA${f.now()}', bank: b, number: ac, name: nm)));
    }
    store.notify(icon: 'bi-bank', tone: 'orange', title: 'Withdrawal successful', body: '${f.naira(a)} sent to $nm ($b).');
    if (mounted) goBack(context, '/wallet');
    Future.delayed(const Duration(milliseconds: 300), () => walletReceipt('Withdrawal successful', '${f.naira(a)} is on its way to **$nm**.', [SRow('Bank', b), SRow('Account', ac), SRow('Amount', f.naira(a, 2)), SRow('Fee', f.naira(fee))], tx));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final a = _a;
    final fee = a > 0 ? withdrawFee(a) : 0.0;
    final total = a + fee;
    return AppScreen(
      header: AppHeader(title: 'Withdraw to bank', subtitle: 'Balance ${f.naira(s.balance, 2)}', fallback: '/wallet'),
      footer: Btn(total > 0 ? 'Withdraw ${f.naira(total)}' : 'Withdraw', size: BtnSize.lg, full: true, icon: 'bi-bank', onPressed: _submit),
      children: [
        if (s.bankAccounts.isNotEmpty) ...[
          const SizedBox(height: 8),
          const AppText('Saved accounts', v: TV.label, muted: true),
          const SizedBox(height: 8),
          HScroll(padding: EdgeInsets.zero, children: [
            for (final b in s.bankAccounts)
              AppChip('${b.bank} ··${b.number.substring(b.number.length - 4)}', icon: 'bi-bank', active: bank == b.bank && acct == b.number, onTap: () => _setBankAcct(b.bank, b.number)),
          ]),
          const SizedBox(height: 16),
        ] else
          const SizedBox(height: 8),
        SelectField<String>(
          label: 'Bank', title: 'Select bank', placeholder: 'Select bank', searchable: true, value: bank.isEmpty ? null : bank, error: errBank,
          options: [for (final b in banks) SelectOption(b.$1, b.$1, leading: BrandTile(color: Color(b.$2), text: bankAbbr(b.$1), size: 32))],
          onChanged: (v) => _setBankAcct(v, acct),
        ),
        const SizedBox(height: 16),
        AppTextField(
          label: 'Account number', placeholder: '10-digit NUBAN', keyboardType: TextInputType.number, maxLength: 10, value: acct,
          inputFormatters: [AppTextField.digits], error: errAcct, success: name != null,
          onChanged: (t) => setState(() { acct = t; _resolve(); }),
          suffix: resolving
              ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: c.primary))
              : name != null ? AppIcon('bi-check-circle-fill', size: 18, color: c.success) : null,
        ),
        if (resolving) const Padding(padding: EdgeInsets.only(top: 5), child: AppText('Verifying account…', v: TV.xs, muted: true)),
        if (name != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(children: [
              AppIcon('bi-patch-check-fill', size: 15, color: c.success),
              const SizedBox(width: 6),
              Expanded(child: AppText(name!, v: TV.sm, weight: FontWeight.w700, color: c.success)),
            ]),
          ),
        const SizedBox(height: 16),
        AppTextField(
          label: 'Amount', prefix: '₦', big: true, keyboardType: const TextInputType.numberWithOptions(decimal: true), placeholder: '0.00',
          value: amount, inputFormatters: [AppTextField.decimal], error: errAmount,
          onChanged: (t) => setState(() { amount = t; errAmount = null; }),
        ),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final v in [5000, 10000, 50000, 100000]) AppChip(f.naira(v), active: a == v, onTap: () => setState(() { amount = '$v'; errAmount = null; })),
        ]),
        const SizedBox(height: 16),
        AppTextField(label: 'Narration', placeholder: 'Narration (optional)', maxLength: 60, value: narration, onChanged: (t) => narration = t),
        const SizedBox(height: 16),
        AppCheckbox(checked: save, onChanged: (v) => setState(() => save = v), label: 'Save this account'),
        const SizedBox(height: 16),
        Summary([SRow('Amount', f.naira(a, 2)), SRow('Transfer fee', f.naira(fee))], total: ('Total debit', f.naira(total, 2))),
        const SizedBox(height: 16),
        Row(children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: bankColor(bank), shape: BoxShape.circle)),
          const SizedBox(width: 6),
          const Expanded(child: AppText('₦25 fee up to ₦50,000 · ₦50 above. Arrives instantly.', v: TV.xs, muted: true)),
        ]),
      ],
    );
  }
}

