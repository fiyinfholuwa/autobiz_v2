/// Education (exam PINs) pane. Port of mobile_app/src/features/bills/EducationPane.tsx.
library;

import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';
import 'shared.dart';

class Exam {
  final String id, name, short, bg, abbr;
  final double price;
  final bool needsId;
  const Exam(this.id, this.name, this.short, this.price, this.bg, this.abbr, {this.needsId = false});
}

const exams = [
  Exam('waec', 'WAEC Result Checker', 'WAEC', 3900, '#1c7ed6', 'WA'),
  Exam('waecreg', 'WAEC Registration PIN', 'WAEC Reg', 18500, '#1864ab', 'WR'),
  Exam('neco', 'NECO Result Token', 'NECO', 1300, '#2b8a3e', 'NE'),
  Exam('nabteb', 'NABTEB Result PIN', 'NABTEB', 1000, '#c2255c', 'NA'),
  Exam('jamb', 'JAMB UTME ePIN', 'JAMB UTME', 7700, '#2f9e44', 'JB', needsId: true),
  Exam('jambde', 'JAMB Direct Entry ePIN', 'JAMB DE', 7700, '#5c940d', 'DE', needsId: true),
];

class EducationPane extends StatefulWidget {
  const EducationPane({super.key});
  @override
  State<EducationPane> createState() => _EducationPaneState();
}

class _EducationPaneState extends State<EducationPane> {
  String exam = 'waec';
  String qty = '1';
  late String phone = store.user.phone;
  String? phoneErr;
  String code = '';
  String? codeErr;
  String? cand;
  bool verifying = false;
  int _token = 0;

  Exam get _e => exams.firstWhere((e) => e.id == exam);

  void _clearVerify() { cand = null; _token++; verifying = false; }

  Future<String?> _verify() async {
    if (!RegExp(r'^\d{10}$').hasMatch(code)) { setState(() => codeErr = 'Profile code must be 10 digits'); return null; }
    final my = ++_token;
    setState(() { codeErr = null; verifying = true; });
    await sleep(800);
    if (!mounted || my != _token) return null;
    final n = pickBy(mockNames, code);
    setState(() { verifying = false; cand = n; });
    return n;
  }

  Future<void> _buy() async {
    final E = _e;
    final q = E.needsId ? 1 : int.parse(qty);
    final total = E.price * q;
    if (!RegExp(r'^0\d{10}$').hasMatch(phone)) { setState(() => phoneErr = 'Enter a valid phone number for PIN delivery'); return; }
    var candidate = cand;
    if (E.needsId && candidate == null) { candidate = await _verify(); if (candidate == null) return; }
    final ok = await confirmPay(PayOpts(
      title: 'Confirm PIN purchase',
      amount: total,
      rows: [SRow('Exam', E.name), SRow('Quantity', '$q'), if (E.needsId) SRow('Candidate', candidate ?? ''), SRow('Deliver to', phone)],
    ));
    if (!ok) return;
    final pins = List.generate(q, (_) => (serial: 'WRN${rndDigits(10)}', pin: rndDigits(12)));
    final meta = <String, String>{'Exam': E.name, 'Quantity': '$q', 'Phone': phone};
    if (E.needsId) { meta['Profile code'] = code; meta['Candidate'] = candidate ?? ''; }
    for (var i = 0; i < pins.length; i++) { meta['PIN ${i + 1}'] = '${pins[i].pin} (Serial ${pins[i].serial})'; }
    final tx = record(total, TxInput(type: 'education', title: '${E.short} PIN${q > 1 ? ' ×$q' : ''}', subtitle: E.name, icon: 'bi-mortarboard', tone: 'violet'), meta);
    if (tx == null) return;
    showReceipt(tx,
        title: 'PIN purchased',
        message: '$q ${E.name}${q > 1 ? 's' : ''} — also sent by SMS to $phone.',
        rows: [SRow('Exam', E.name), SRow('Quantity', '$q'), SRow('Amount', f.naira(total, 2))],
        extra: Column(children: [
          for (var i = 0; i < pins.length; i++)
            TokenBox(label: 'PIN ${i + 1}', sub: 'Serial ${pins[i].serial}', value: pins[i].pin.replaceAllMapped(RegExp(r'(\d{4})(?=\d)'), (m) => '${m[1]} '), copyValue: pins[i].pin),
        ]));
  }

  @override
  Widget build(BuildContext context) {
    final E = _e;
    final q = E.needsId ? 1 : int.parse(qty);
    final total = E.price * q;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const PaneLabel('Exam'),
      TileGrid(cols: 3, children: [
        for (final e in exams)
          PickTile(
            selected: e.id == exam,
            onTap: () => setState(() { exam = e.id; _clearVerify(); if (e.needsId) qty = '1'; }),
            art: BrandTile(color: hexColor(e.bg), text: e.abbr, size: 38),
            label: e.short,
            sub: f.naira(e.price),
          ),
      ]),
      if (E.needsId) ...[
        const SizedBox(height: 14),
        AppTextField(
          label: 'JAMB profile code', placeholder: '10-digit profile code', keyboardType: TextInputType.number, maxLength: 10,
          value: code, inputFormatters: [AppTextField.digits], error: codeErr, success: cand != null,
          onChanged: (t) => setState(() { code = digits(t); codeErr = null; _clearVerify(); }),
          suffix: VerifyChip(verifying: verifying, verified: cand != null, onTap: () => _verify()),
        ),
        if (cand != null) VerifiedBox(title: cand!, lines: ['${E.name} candidate']),
      ],
      const SizedBox(height: 14),
      SelectField<String>(
        label: 'Quantity',
        value: E.needsId ? '1' : qty,
        options: [for (final v in ['1', '2', '3', '4', '5']) SelectOption(v, v, disabled: E.needsId && v != '1')],
        onChanged: (v) { if (!E.needsId) setState(() => qty = v); },
        hint: E.needsId ? 'JAMB ePINs are issued one per candidate' : null,
      ),
      const SizedBox(height: 14),
      AppTextField(
        label: 'Phone (PIN delivery)', keyboardType: TextInputType.phone, maxLength: 11,
        value: phone, inputFormatters: [AppTextField.digits], error: phoneErr,
        onChanged: (t) => setState(() { phone = digits(t); phoneErr = null; }),
      ),
      const SizedBox(height: 14),
      Summary([SRow(E.name, '${f.naira(E.price)} × $q')], total: ('Total', f.naira(total, 2))),
      const SizedBox(height: 14),
      Btn('Buy PIN${q > 1 ? 's' : ''}', size: BtnSize.lg, full: true, icon: 'bi-mortarboard', onPressed: _buy),
    ]);
  }
}
