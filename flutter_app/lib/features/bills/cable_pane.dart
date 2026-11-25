/// Cable TV pane. Port of mobile_app/src/features/bills/CablePane.tsx.
library;

import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../data/catalog.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';
import 'panels.dart';
import 'shared.dart';

const _day = 86400000;
const _abbr = {'dstv': 'DStv', 'gotv': 'GOtv', 'startimes': 'ST'};

class _Customer { final String name, plan; final double price; final int due; const _Customer(this.name, this.plan, this.price, this.due); }

class CablePane extends StatefulWidget {
  const CablePane({super.key});
  @override
  State<CablePane> createState() => _CablePaneState();
}

class _CablePaneState extends State<CablePane> {
  String prov = 'dstv';
  String iuc = '';
  String? iucErr;
  _Customer? cust;
  bool verifying = false;
  String mode = 'renew';
  String? pick;
  String months = '1';
  bool save = false;
  int _token = 0;

  CableProvider get _p => cableProviders[prov]!;

  void _clearVerify() { cust = null; _token++; verifying = false; mode = 'renew'; pick = null; }

  Future<_Customer?> _verify([String? v0, String? pid0]) async {
    final v = v0 ?? iuc, pid = pid0 ?? prov;
    if (!RegExp(r'^\d{10,12}$').hasMatch(v)) { setState(() => iucErr = 'Smartcard/IUC number must be 10 – 12 digits'); return null; }
    final my = ++_token;
    setState(() { iucErr = null; verifying = true; cust = null; });
    await sleep(900);
    if (!mounted || my != _token) return null;
    final plans = cableProviders[pid]!.plans;
    final pl = plans[hash31(v) % plans.length];
    final cu = _Customer(pickBy(mockNames, v + pid).toUpperCase(), pl.name, pl.price, f.now() + ((hash31(v) % 20) - 6) * _day);
    setState(() { verifying = false; cust = cu; mode = 'renew'; pick = null; });
    return cu;
  }

  Future<void> _buy() async {
    final cu = cust;
    if (cu == null) { _verify(); return; }
    final selName = mode == 'renew' ? cu.plan : pick;
    CablePlan? sel;
    for (final p in _p.plans) { if (p.name == selName) sel = p; }
    if (sel == null) { toast('Select a bouquet', type: ToastType.warning); return; }
    final m = int.parse(months);
    final total = sel.price * m;
    final change = mode == 'change';
    final dur = '$m month${m > 1 ? 's' : ''}';
    final ok = await confirmPay(PayOpts(
      title: 'Confirm subscription',
      amount: total,
      rows: [SRow('Provider', _p.name), SRow('Smartcard', iuc), SRow('Customer', cu.name), SRow('Bouquet', '${sel.name} (${change ? 'change' : 'renewal'})'), SRow('Duration', dur)],
    ));
    if (!ok) return;
    final base = f.now() > cu.due ? f.now() : cu.due;
    final newDue = base + m * 30 * _day;
    final tx = record(total, TxInput(type: 'cable', title: '${_p.name} ${sel.name}', subtitle: 'IUC $iuc', icon: 'bi-tv', tone: 'cyan'), {
      'Provider': _p.name, 'Smartcard/IUC': iuc, 'Customer': cu.name, 'Bouquet': sel.name, 'Action': change ? 'Plan change' : 'Renewal', 'Duration': dur, 'Next due': f.date(newDue),
    });
    if (tx == null) return;
    if (save) saveBeneficiary(kind: 'smartcard', value: iuc, provider: prov, label: '${cu.name.split(' ').first} · ${_p.name}');
    showReceipt(tx,
        title: 'Subscription active',
        message: '${_p.name} **${sel.name}** activated for ${cu.name}.',
        rows: [SRow('Smartcard', iuc), SRow('Bouquet', '${_p.name} ${sel.name}'), SRow('Duration', dur), SRow('Next due date', f.date(newDue)), SRow('Amount', f.naira(total, 2))]);
    if (mounted) setState(() { cust = _Customer(cu.name, sel!.name, sel.price, newDue); mode = 'renew'; pick = null; save = false; });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final cu = cust;
    final P = _p;
    final selName = mode == 'renew' ? cu?.plan : pick;
    CablePlan? sel;
    for (final p in P.plans) { if (p.name == selName) sel = p; }
    final m = int.parse(months);
    final total = (sel?.price ?? 0) * m;
    final expired = cu != null && cu.due < f.now();

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      BeneficiaryStrip(
        kind: 'smartcard',
        onPick: (b) {
          final pid = b.provider != null && cableProviders.containsKey(b.provider) ? b.provider! : prov;
          setState(() { prov = pid; iuc = b.value; _clearVerify(); });
          _verify(b.value, pid);
        },
      ),
      const PaneLabel('Provider'),
      Row(children: [
        for (final (i, e) in cableProviders.entries.indexed) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(child: PickTile(
            selected: e.key == prov,
            onTap: () => setState(() { prov = e.key; _clearVerify(); }),
            art: BrandTile(color: Color(e.value.color), text: _abbr[e.key], size: 40),
            label: e.value.name,
          )),
        ],
      ]),
      const SizedBox(height: 14),
      AppTextField(
        label: 'Smartcard / IUC number', placeholder: '10 – 12 digit number', keyboardType: TextInputType.number, maxLength: 12,
        value: iuc, inputFormatters: [AppTextField.digits], error: iucErr, success: cu != null,
        onChanged: (t) => setState(() { iuc = digits(t); iucErr = null; _clearVerify(); }),
        suffix: VerifyChip(verifying: verifying, verified: cu != null, onTap: () => _verify()),
      ),
      if (verifying)
        const Padding(padding: EdgeInsets.only(top: 10), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Skeleton(w: 170, h: 14), SizedBox(height: 6), Skeleton(w: 250, h: 12)]))
      else if (cu != null)
        VerifiedBox(title: cu.name, lines: [
          Text.rich(TextSpan(style: tvStyle(context, TV.xs, muted: true), children: [
            const TextSpan(text: 'Current bouquet: '),
            TextSpan(text: '${P.name} ${cu.plan}', style: const TextStyle(fontWeight: FontWeight.w700)),
            TextSpan(text: ' · ${f.naira(cu.price)}/mo'),
          ])),
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: expired ? StatusPill('failed', label: 'Expired · since ${f.date(cu.due)}') : StatusPill('success', label: 'Active · due ${f.date(cu.due)}'),
          ),
        ]),
      if (cu != null) ...[
        const SizedBox(height: 16),
        Segment<String>(value: mode, onChanged: (v) => setState(() { mode = v; pick = null; }), options: const [SegOption('renew', 'Renew current plan'), SegOption('change', 'Change plan')]),
        const SizedBox(height: 12),
        if (mode == 'renew')
          OptionCard(
            selected: true,
            child: Padding(
              padding: const EdgeInsets.only(right: 22),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  AppText('${P.name} ${cu.plan}', weight: FontWeight.w700),
                  const AppText('Renew your current bouquet', v: TV.xs, muted: true),
                ])),
                AppText(f.naira(cu.price), weight: FontWeight.w700, tabular: true),
              ]),
            ),
          )
        else
          TileGrid(cols: 2, gap: 10, children: [
            for (final p in P.plans)
              OptionCard(
                selected: pick == p.name,
                onTap: () => setState(() => pick = p.name),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  if (p.name == cu.plan) const Pill('Current', tone: 'cyan'),
                  const SizedBox(height: 4),
                  AppText(p.name, weight: FontWeight.w700),
                  const SizedBox(height: 4),
                  AppText(f.naira(p.price), weight: FontWeight.w700, color: c.primary, tabular: true),
                ]),
              ),
          ]),
        const SizedBox(height: 14),
        SelectField<String>(
          label: 'Duration', value: months,
          options: [for (final v in ['1', '2', '3', '6']) SelectOption(v, '$v month${v == '1' ? '' : 's'}')],
          onChanged: (v) => setState(() => months = v),
        ),
        const SizedBox(height: 8),
        const AppText('Convenience fee: ₦0', v: TV.xs, muted: true),
        const SizedBox(height: 12),
        Summary([
          SRow('Bouquet', sel != null ? '${P.name} ${sel.name}' : 'Select a plan'),
          SRow('Duration', '$m month${m > 1 ? 's' : ''}'),
        ], total: ('Total', f.naira(total, 2))),
        const SizedBox(height: 12),
        AppCheckbox(checked: save, onChanged: (v) => setState(() => save = v), label: 'Save smartcard as beneficiary'),
      ],
      const SizedBox(height: 14),
      Btn(cu != null ? 'Pay subscription' : 'Verify smartcard', size: BtnSize.lg, full: true, icon: cu != null ? 'bi-tv' : 'bi-search', loading: verifying, loadingText: 'Verifying…', onPressed: _buy),
    ]);
  }
}
