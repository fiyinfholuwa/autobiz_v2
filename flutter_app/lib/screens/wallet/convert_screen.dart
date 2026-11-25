import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../features/wallet/constants.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /wallet/convert — ported from mobile_app/src/app/wallet/convert.tsx
class ConvertScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const ConvertScreen({super.key, this.q = const {}});
  @override
  State<ConvertScreen> createState() => _ConvertScreenState();
}

class _ConvertScreenState extends State<ConvertScreen> {
  String dir = 'buy';
  String amount = '';
  String? err;
  final _ctl = TextEditingController();

  @override
  void dispose() { _ctl.dispose(); super.dispose(); }

  bool get buy => dir == 'buy';
  double get a => double.tryParse(amount) ?? 0;
  double get out => buy ? (a / buyRate * 100).floor() / 100 : (a * sellRate * 100).round() / 100;

  void _setAmount(String v) {
    amount = v;
    _ctl.value = TextEditingValue(text: v, selection: TextSelection.collapsed(offset: v.length));
    err = null;
  }

  void _setDirection(String d) => setState(() { dir = d; _setAmount(''); });

  Future<void> _submit() async {
    final o = out;
    String? e;
    if (amount.isEmpty) {
      e = 'Enter an amount';
    } else if (buy) {
      if (o < 1) {
        e = 'Minimum is \$1 (${f.naira(buyRate)})';
      } else if (a > store.balance) {
        e = 'Insufficient Naira balance';
      }
    } else {
      if (a < 1) {
        e = 'Minimum is \$1';
      } else if (a > store.usd) {
        e = 'Insufficient USD balance';
      }
    }
    setState(() => err = e);
    if (e != null) return;
    final amt = a;
    final isBuy = buy;
    final rows = [SRow('You receive', isBuy ? f.usd(o) : f.naira(o, 2)), SRow('Rate', '\$1 = ${f.naira(isBuy ? buyRate : sellRate)}')];
    final ok = await confirmPay(isBuy
        ? PayOpts(title: 'Buy USD', amount: amt, rows: rows, cta: 'Convert')
        : PayOpts(title: 'Sell USD', amount: amt, currency: 'usd', skipBalanceCheck: true, rows: rows, cta: 'Convert'));
    if (!ok) return;
    Tx? tx;
    if (isBuy) {
      tx = store.debit(amt, TxInput(
        type: 'convert', title: 'Converted NGN → USD', subtitle: '${f.usd(o)} at ${f.naira(buyRate)}/\$', icon: 'bi-arrow-left-right', tone: 'violet', ref: f.ref('FX'),
        meta: {'You paid': f.naira(amt, 2), 'You received': f.usd(o), 'Rate': '\$1 = ${f.naira(buyRate)}'},
      ));
      if (tx == null) { toast('Insufficient Naira balance', type: ToastType.error); return; }
      store.mutate(() => store.usd = round2(store.usd + o));
    } else {
      if (store.usd < amt) { toast('Insufficient USD balance', type: ToastType.error); return; }
      store.mutate(() => store.usd = round2(store.usd - amt));
      tx = store.credit(o, TxInput(
        type: 'convert', title: 'Converted USD → NGN', subtitle: '${f.usd(amt)} at ${f.naira(sellRate)}/\$', icon: 'bi-arrow-left-right', tone: 'violet', ref: f.ref('FX'),
        meta: {'You paid': f.usd(amt), 'You received': f.naira(o, 2), 'Rate': '\$1 = ${f.naira(sellRate)}'},
      ));
    }
    store.notify(icon: 'bi-arrow-left-right', tone: 'violet', title: 'Conversion successful', body: isBuy ? '${f.usd(o)} added to your USD wallet.' : '${f.naira(o)} added to your Naira wallet.');
    if (mounted) goBack(context, '/wallet');
    final t = tx;
    Future.delayed(const Duration(milliseconds: 300), () => walletReceipt(
          'Conversion successful',
          isBuy ? 'You bought **${f.usd(o)}**.' : 'You sold **${f.usd(amt)}**.',
          [SRow('You paid', isBuy ? f.naira(amt, 2) : f.usd(amt)), SRow('You received', isBuy ? f.usd(o) : f.naira(o, 2)), SRow('New USD balance', f.usd(store.usd))],
          t,
        ));
  }

  Widget _box(BuildContext context, String label, String cur, Widget right, Widget child) {
    final c = context.c;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(R.xl), border: Border.all(color: c.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [Expanded(child: AppText(label, v: TV.xs, muted: true, weight: FontWeight.w600)), right]),
        const SizedBox(height: 10),
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(R.pill)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [FlagImg(cur == 'NGN' ? 'ng' : 'us', size: 20), const SizedBox(width: 6), AppText(cur, weight: FontWeight.w700)]),
          ),
          const SizedBox(width: 10),
          Expanded(child: child),
        ]),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final presets = buy ? [15800.0, 79000.0, 158000.0] : [10.0, 50.0, 100.0];
    final big = tvStyle(context, TV.h1, weight: FontWeight.w800, size: 26, tabular: true);
    return AppScreen(
      header: const AppHeader(title: 'Convert currency', subtitle: 'Instant · no fees', fallback: '/wallet'),
      footer: Btn('Convert', size: BtnSize.lg, full: true, icon: 'bi-arrow-left-right', onPressed: _submit),
      children: [
        const SizedBox(height: 8),
        Segment<String>(value: dir, onChanged: _setDirection, options: const [SegOption('buy', 'NGN → USD'), SegOption('sell', 'USD → NGN')]),
        const SizedBox(height: 16),
        _box(
          context, 'You pay', buy ? 'NGN' : 'USD',
          AppText('Balance: ${buy ? f.naira(s.balance, 2) : f.usd(s.usd)}', v: TV.xs, muted: true),
          TextField(
            controller: _ctl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [AppTextField.decimal],
            textAlign: TextAlign.right,
            style: big,
            decoration: InputDecoration(isDense: true, border: InputBorder.none, hintText: '0.00', hintStyle: big.copyWith(color: c.muted)),
            onChanged: (t) => setState(() { amount = t; err = null; }),
          ),
        ),
        // swap button overlapping both boxes
        SizedBox(
          height: 20,
          child: OverflowBox(
            maxHeight: 44,
            child: Semantics(
              button: true, label: 'Swap direction',
              child: GestureDetector(
                onTap: () { tapHaptic(); _setDirection(buy ? 'sell' : 'buy'); },
                child: Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(color: c.primary, shape: BoxShape.circle, border: Border.all(color: c.bg, width: 4)),
                  child: const Center(child: AppIcon('ion:swap-vertical', size: 20, color: Colors.white)),
                ),
              ),
            ),
          ),
        ),
        _box(
          context, 'You receive', buy ? 'USD' : 'NGN',
          const Pill('Instant', tone: 'success'),
          Text(f.numFmt(out, 2), textAlign: TextAlign.right, style: big, maxLines: 1, overflow: TextOverflow.ellipsis),
        ),
        FieldError(error: err),
        const SizedBox(height: 14),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final v in presets)
            AppChip(buy ? f.naira(v) : f.usd(v).replaceAll('.00', ''), active: a == v, onTap: () => setState(() => _setAmount(f.numFmt(v).replaceAll(',', '')))),
          AppChip('Max', icon: 'bi-lightning', onTap: () => setState(() {
            final m = buy ? store.balance.floorToDouble() : store.usd;
            _setAmount(m == m.roundToDouble() ? m.toInt().toString() : m.toString());
          })),
        ]),
        const SizedBox(height: 16),
        Summary([SRow('Rate', '\$1 = ${f.naira(buy ? buyRate : sellRate)}'), SRow('Fee', 'Free', color: c.success)]),
      ],
    );
  }
}
