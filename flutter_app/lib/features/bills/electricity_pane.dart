/// Electricity pane. Port of mobile_app/src/features/bills/ElectricityPane.tsx.
library;

import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../data/catalog.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';
import 'panels.dart';
import 'shared.dart';

const _tariff = 68.2;
const _fee = 100.0;

class _Customer { final String name, address; final double arrears; const _Customer(this.name, this.address, this.arrears); }

class ElectricityPane extends StatefulWidget {
  const ElectricityPane({super.key});
  @override
  State<ElectricityPane> createState() => _ElectricityPaneState();
}

class _ElectricityPaneState extends State<ElectricityPane> {
  String disco = discos[0];
  String type = 'Prepaid';
  String meter = '';
  String? meterErr;
  _Customer? cust;
  bool verifying = false;
  String amount = '';
  String? amountErr;
  String phone = '';
  bool phoneBad = false;
  bool save = false;
  int _token = 0;

  double get _a => double.tryParse(amount) ?? 0;
  String _discoShort(String d) => d.replaceFirst(RegExp(r'\s*\(.*\)\s*$'), '');

  void _clearVerify() { cust = null; _token++; verifying = false; }

  Future<_Customer?> _verify([String? m0, String? d0, String? t0]) async {
    final m = m0 ?? meter, d = d0 ?? disco, t = t0 ?? type;
    if (!RegExp(r'^\d{11,13}$').hasMatch(m)) { setState(() => meterErr = 'Meter number must be 11 – 13 digits'); return null; }
    final my = ++_token;
    setState(() { meterErr = null; verifying = true; cust = null; });
    await sleep(900);
    if (!mounted || my != _token) return null;
    setState(() => verifying = false);
    if (m.startsWith('000')) { setState(() => meterErr = 'Meter not found on $d. Check the number and try again.'); return null; }
    final cu = _Customer(pickBy(mockNames, m).toUpperCase(), pickBy(streets, '${m}a'), t == 'Postpaid' ? ((hash31(m) % 9000) + 1500).toDouble() : 0);
    setState(() {
      cust = cu;
      if (cu.arrears > 0 && amount.isEmpty) amount = cu.arrears.toStringAsFixed(0);
    });
    return cu;
  }

  Future<void> _buy() async {
    final a = _a;
    var errs = false;
    if (amount.isEmpty) { amountErr = 'Enter an amount'; errs = true; }
    else if (a < 1000) { amountErr = 'Minimum is ₦1,000'; errs = true; }
    else if (a > 500000) { amountErr = 'Maximum is ₦500,000'; errs = true; }
    if (phone.isNotEmpty && !RegExp(r'^0\d{10}$').hasMatch(phone)) { phoneBad = true; errs = true; }
    setState(() {});
    var cu = cust;
    if (cu == null) {
      if (errs) { _verify(); return; }
      cu = await _verify();
      if (cu == null) return;
    }
    if (errs) return;
    final total = a + _fee;
    final units = (a / _tariff).toStringAsFixed(1);
    final ok = await confirmPay(PayOpts(
      title: 'Confirm electricity payment',
      amount: total,
      rows: [SRow('Disco', disco), SRow('Meter', '$meter · $type'), SRow('Customer', cu.name), SRow('Amount', f.naira(a, 2)), SRow('Service fee', f.naira(_fee))],
    ));
    if (!ok) return;
    final prepaid = type == 'Prepaid';
    final raw = rndDigits(20);
    final tok = raw.replaceAllMapped(RegExp(r'(\d{4})(?=\d)'), (m) => '${m[1]}-');
    final ds = _discoShort(disco);
    final meta = <String, String>{'Disco': disco, 'Meter number': meter, 'Meter type': type, 'Customer': cu.name, 'Address': cu.address, 'Amount': f.naira(a, 2), 'Service fee': f.naira(_fee)};
    if (prepaid) { meta['Token'] = tok; meta['Units'] = '$units kWh'; }
    final tx = record(total, TxInput(type: 'electricity', title: prepaid ? '$ds Token' : '$ds Bill', subtitle: 'Meter $meter', icon: 'bi-lightning-charge', tone: 'orange'), meta);
    if (tx == null) return;
    if (save) saveBeneficiary(kind: 'meter', value: meter, provider: disco, meterType: type, label: '${cu.name.split(' ').first} · ${ds.split(' ').first}');
    showReceipt(tx,
        title: prepaid ? 'Token generated' : 'Bill paid',
        message: prepaid ? 'Your $ds token is ready.${phone.isNotEmpty ? ' We also sent it to $phone.' : ''}' : 'Payment posted to meter $meter.',
        rows: [SRow('Customer', cu.name), SRow('Meter', meter), if (prepaid) SRow('Units', '$units kWh'), SRow('Amount paid', f.naira(total, 2))],
        extra: prepaid ? TokenBox(label: 'Electricity token', value: tok, copyValue: raw) : null);
    if (mounted) setState(() { amount = ''; save = false; });
  }

  @override
  Widget build(BuildContext context) {
    final a = _a;
    final cu = cust;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      BeneficiaryStrip(
        kind: 'meter',
        onPick: (b) {
          final d = b.provider != null && discos.contains(b.provider) ? b.provider! : disco;
          final t = b.meterType ?? 'Prepaid';
          setState(() { disco = d; type = t; meter = b.value; _clearVerify(); });
          _verify(b.value, d, t);
        },
      ),
      SelectField<String>(
        label: 'Distribution company', title: 'Choose your disco', value: disco,
        options: [for (final d in discos) SelectOption(d, d)],
        onChanged: (d) => setState(() { disco = d; _clearVerify(); }),
      ),
      const SizedBox(height: 14),
      const PaneLabel('Meter type'),
      Segment<String>(value: type, onChanged: (t) => setState(() { type = t; _clearVerify(); }), options: const [SegOption('Prepaid', 'Prepaid'), SegOption('Postpaid', 'Postpaid')]),
      const SizedBox(height: 14),
      AppTextField(
        label: 'Meter number', placeholder: '11 – 13 digit meter number', keyboardType: TextInputType.number, maxLength: 13,
        value: meter, inputFormatters: [AppTextField.digits], error: meterErr, success: cu != null,
        onChanged: (t) => setState(() { meter = digits(t); meterErr = null; _clearVerify(); }),
        suffix: VerifyChip(verifying: verifying, verified: cu != null, onTap: () => _verify()),
      ),
      if (verifying)
        const Padding(padding: EdgeInsets.only(top: 10), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Skeleton(w: 180, h: 14), SizedBox(height: 6), Skeleton(w: 260, h: 12)]))
      else if (cu != null)
        VerifiedBox(title: cu.name, lines: [
          cu.address,
          Text.rich(TextSpan(style: tvStyle(context, TV.xs, muted: true), children: [
            TextSpan(text: '$type · $disco'),
            if (cu.arrears > 0) ...[const TextSpan(text: ' · Outstanding '), TextSpan(text: f.naira(cu.arrears), style: const TextStyle(fontWeight: FontWeight.w700))],
          ])),
        ]),
      const SizedBox(height: 14),
      AppTextField(
        label: 'Amount', prefix: '₦', big: true, keyboardType: TextInputType.number, placeholder: 'Min ₦1,000',
        value: amount, inputFormatters: [AppTextField.digits], error: amountErr,
        onChanged: (t) => setState(() { amount = amountOnly(t); amountErr = null; }),
      ),
      const SizedBox(height: 10),
      AmountChips(values: const [2000, 5000, 10000, 20000, 50000], current: a, onPick: (v) => setState(() { amount = '$v'; amountErr = null; })),
      const SizedBox(height: 14),
      AppTextField(
        label: 'Phone for token SMS (optional)', placeholder: '080…', keyboardType: TextInputType.phone, maxLength: 11,
        value: phone, inputFormatters: [AppTextField.digits], error: phoneBad ? ' ' : null,
        onChanged: (t) => setState(() { phone = digits(t); phoneBad = false; }),
      ),
      const SizedBox(height: 14),
      Summary([
        if (type == 'Prepaid') SRow('Estimated units', '${(a / _tariff).toStringAsFixed(1)} kWh'),
        SRow('Service fee', a > 0 ? f.naira(_fee) : '—'),
      ], total: ('Total', f.naira(a > 0 ? a + _fee : 0, 2))),
      const SizedBox(height: 12),
      AppCheckbox(checked: save, onChanged: (v) => setState(() => save = v), label: 'Save meter as beneficiary'),
      const SizedBox(height: 14),
      Btn(type == 'Prepaid' ? 'Buy token' : 'Pay postpaid bill', size: BtnSize.lg, full: true, icon: 'bi-lightning-charge-fill', onPressed: _buy),
    ]);
  }
}
