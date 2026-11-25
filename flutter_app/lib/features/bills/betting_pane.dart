/// Betting pane. Port of mobile_app/src/features/bills/BettingPane.tsx.
library;

import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';
import 'shared.dart';

class BetPlatform { final String id, name, color, abbr; const BetPlatform(this.id, this.name, this.color, this.abbr); }

const betPlatforms = [
  BetPlatform('bet9ja', 'Bet9ja', '#0f7a3a', 'B9'),
  BetPlatform('sportybet', 'SportyBet', '#e41827', 'SB'),
  BetPlatform('1xbet', '1xBet', '#1a5c9e', '1x'),
  BetPlatform('betking', 'BetKing', '#1b1464', 'BK'),
  BetPlatform('nairabet', 'NairaBet', '#00843d', 'NB'),
  BetPlatform('msport', 'MSport', '#f0a30a', 'MS'),
];

class BettingPane extends StatefulWidget {
  const BettingPane({super.key});
  @override
  State<BettingPane> createState() => _BettingPaneState();
}

class _BettingPaneState extends State<BettingPane> {
  String plat = 'bet9ja';
  String cid = '';
  String? cidErr;
  String? name;
  bool verifying = false;
  String amount = '';
  String? amountErr;
  int _token = 0;

  BetPlatform get _p => betPlatforms.firstWhere((p) => p.id == plat);
  double get _a => double.tryParse(amount) ?? 0;

  void _clearVerify() { name = null; _token++; verifying = false; }

  Future<String?> _verify() async {
    if (cid.length < 5) { setState(() => cidErr = 'Enter a valid customer ID (min 5 characters)'); return null; }
    final my = ++_token;
    setState(() { cidErr = null; verifying = true; });
    await sleep(800);
    if (!mounted || my != _token) return null;
    final n = pickBy(mockNames, cid + plat);
    setState(() { verifying = false; name = n; });
    return n;
  }

  Future<void> _buy() async {
    final a = _a;
    var bad = false;
    if (amount.isEmpty) { amountErr = 'Enter an amount'; bad = true; }
    else if (a < 100) { amountErr = 'Minimum is ₦100'; bad = true; }
    else if (a > 500000) { amountErr = 'Maximum is ₦500,000'; bad = true; }
    setState(() {});
    var n = name;
    if (n == null) { n = await _verify(); if (n == null) return; }
    if (bad) return;
    final P = _p;
    final ok = await confirmPay(PayOpts(title: 'Fund betting wallet', amount: a, rows: [SRow('Platform', P.name), SRow('Customer ID', cid), SRow('Name', n)]));
    if (!ok) return;
    final tx = record(a, TxInput(type: 'betting', title: '${P.name} Funding', subtitle: 'ID $cid', icon: 'bi-trophy', tone: 'success'),
        {'Platform': P.name, 'Customer ID': cid, 'Account name': n, 'Fee': '₦0'});
    if (tx == null) return;
    showReceipt(tx,
        title: 'Wallet funded',
        message: '${f.naira(a)} sent to your ${P.name} account.',
        rows: [SRow('Platform', P.name), SRow('Customer ID', cid), SRow('Name', n), SRow('Amount', f.naira(a, 2))]);
    if (mounted) setState(() => amount = '');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final P = _p;
    final a = _a;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const PaneLabel('Platform'),
      TileGrid(cols: 3, children: [
        for (final p in betPlatforms)
          PickTile(
            selected: p.id == plat,
            onTap: () => setState(() { plat = p.id; _clearVerify(); }),
            art: BrandTile(color: hexColor(p.color), text: p.abbr, size: 38),
            label: p.name,
          ),
      ]),
      const SizedBox(height: 14),
      AppTextField(
        label: 'Customer / User ID', placeholder: 'Your account ID on the platform', autocorrect: false, maxLength: 16,
        value: cid, error: cidErr, success: name != null,
        onChanged: (t) => setState(() {
          final v = t.replaceAll(RegExp(r'\W'), '');
          cid = v.length > 16 ? v.substring(0, 16) : v;
          cidErr = null;
          _clearVerify();
        }),
        suffix: VerifyChip(verifying: verifying, verified: name != null, onTap: () => _verify()),
      ),
      if (name != null) VerifiedBox(title: name!, lines: [P.name]),
      const SizedBox(height: 14),
      AppTextField(
        label: 'Amount', prefix: '₦', big: true, keyboardType: TextInputType.number, placeholder: 'Min ₦100',
        value: amount, inputFormatters: [AppTextField.digits], error: amountErr,
        onChanged: (t) => setState(() { amount = amountOnly(t); amountErr = null; }),
      ),
      const SizedBox(height: 10),
      AmountChips(values: const [500, 1000, 2000, 5000, 10000], current: a, onPick: (v) => setState(() { amount = '$v'; amountErr = null; })),
      const SizedBox(height: 14),
      Summary([SRow('Platform', P.name), SRow('Fee', 'Free', color: c.success)], total: ('Total', f.naira(a, 2))),
      const SizedBox(height: 12),
      const Notice('18+ only. Please bet responsibly.', tone: 'warning', icon: 'bi-exclamation-triangle'),
      const SizedBox(height: 14),
      Btn('Fund betting wallet', size: BtnSize.lg, full: true, icon: 'bi-trophy', onPressed: _buy),
    ]);
  }
}
