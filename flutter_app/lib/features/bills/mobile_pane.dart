/// Airtime + Data pane (shares phone / network state across both tabs).
/// Port of mobile_app/src/features/bills/MobilePane.tsx.
library;

import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../data/catalog.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';
import 'panels.dart';
import 'shared.dart';

final _phoneRe = RegExp(r'^0[789][01]\d{8}$');

class MobilePane extends StatefulWidget {
  /// 'airtime' | 'data'
  final String mode;
  final String? initialPhone;
  const MobilePane({super.key, required this.mode, this.initialPhone});
  @override
  State<MobilePane> createState() => _MobilePaneState();
}

class _MobilePaneState extends State<MobilePane> {
  String? net;
  bool auto = false;
  String phone = '';
  String? phoneErr;
  String amount = '';
  String? amountErr;
  String ptype = 'All';
  DataPlan? plan;
  String? planErr;
  bool save = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialPhone != null && widget.initialPhone!.isNotEmpty) _onPhone(widget.initialPhone!);
  }

  @override
  void didUpdateWidget(MobilePane old) {
    super.didUpdateWidget(old);
    final p = widget.initialPhone;
    if (p != null && p.isNotEmpty && p != old.initialPhone) setState(() => _onPhone(p));
  }

  void _changeNet(String id) {
    if (id != net) { plan = null; ptype = 'All'; }
    net = id;
  }

  void _onPhone(String t) {
    final v = digits(t, 11);
    phone = v;
    phoneErr = null;
    final d = detectNetwork(v);
    if (d != null && d != net) { _changeNet(d); auto = true; }
  }

  double get _a => double.tryParse(amount) ?? 0;

  bool _checkPhone() {
    if (!_phoneRe.hasMatch(phone)) { setState(() => phoneErr = 'Enter a valid 11-digit Nigerian phone number'); return false; }
    return true;
  }

  String _benLabel(String name) => phone == store.user.phone ? 'My number' : '$name ${phone.substring(phone.length - 4)}';

  Future<void> _buyAirtime() async {
    final a = _a;
    final cashback = round2(a * 0.02);
    var ok = _checkPhone();
    if (amount.isEmpty) { amountErr = 'Enter an amount'; ok = false; }
    else if (a < 50) { amountErr = 'Minimum airtime is ₦50'; ok = false; }
    else if (a > 50000) { amountErr = 'Maximum airtime is ₦50,000'; ok = false; }
    setState(() {});
    final n = net != null ? networkById(net!) : null;
    if (n == null) { toast('Select a network', type: ToastType.warning); return; }
    if (!ok) return;
    final confirmed = await confirmPay(PayOpts(
      title: 'Confirm airtime',
      amount: a,
      rows: [SRow('Network', NetworkName(n.id)), SRow('Phone', phone), SRow('Amount', f.naira(a, 2)), SRow('Cashback', '+${f.naira(cashback, 2)}')],
    ));
    if (!confirmed) return;
    final tx = record(a, TxInput(type: 'airtime', title: '${n.name} Airtime', subtitle: phone, icon: 'bi-phone', tone: 'warning'),
        {'Network': n.name, 'Phone': phone, 'Amount': f.naira(a, 2), 'Cashback': f.naira(cashback, 2)});
    if (tx == null) return;
    if (save) saveBeneficiary(kind: 'phone', value: phone, network: n.id, label: _benLabel(n.name));
    showReceipt(tx,
        title: 'Airtime sent',
        message: '${f.naira(a)} ${n.name} airtime sent to **$phone**.',
        rows: [SRow('Network', n.name), SRow('Phone', phone), SRow('Amount', f.naira(a, 2)), SRow('Cashback earned', '+${f.naira(cashback, 2)}')]);
    if (mounted) setState(() { amount = ''; save = false; });
  }

  Future<void> _buyData() async {
    var ok = _checkPhone();
    final n = net != null ? networkById(net!) : null;
    if (n == null) { toast('Select a network', type: ToastType.warning); return; }
    if (plan == null) { setState(() => planErr = 'Select a data plan'); ok = false; }
    final p = plan;
    if (!ok || p == null) return;
    final confirmed = await confirmPay(PayOpts(
      title: 'Confirm data purchase',
      amount: p.price,
      rows: [SRow('Network', NetworkName(n.id)), SRow('Phone', phone), SRow('Plan', '${p.name} ${p.type}'), SRow('Validity', p.validity)],
    ));
    if (!confirmed) return;
    final tx = record(p.price, TxInput(type: 'data', title: '${n.name} Data ${p.name}', subtitle: phone, icon: 'bi-wifi', tone: 'primary'),
        {'Network': n.name, 'Phone': phone, 'Plan': '${p.name} (${p.type})', 'Validity': p.validity});
    if (tx == null) return;
    if (save) saveBeneficiary(kind: 'phone', value: phone, network: n.id, label: _benLabel(n.name));
    showReceipt(tx,
        title: 'Data activated',
        message: '**${p.name}** ${n.name} data sent to **$phone**.',
        rows: [SRow('Plan', '${p.name} · ${p.type}'), SRow('Validity', p.validity), SRow('Phone', phone), SRow('Amount', f.naira(p.price, 2))]);
    if (mounted) setState(() { plan = null; save = false; });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final n = net != null ? networkById(net!) : null;
    final plans = net != null ? (dataPlans[net] ?? const <DataPlan>[]) : const <DataPlan>[];
    final types = ['All', ...{for (final p in plans) p.type}];
    final shown = ptype == 'All' ? plans : plans.where((p) => p.type == ptype).toList();
    final a = _a;
    final cashback = round2(a * 0.02);
    final airtime = widget.mode == 'airtime';

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      BeneficiaryStrip(
        kind: 'phone',
        emptyText: 'Tick “Save as beneficiary” to add numbers you top up often.',
        onPick: (b) => setState(() {
          phone = b.value;
          _changeNet(b.network ?? detectNetwork(b.value) ?? net ?? 'mtn');
          auto = false;
          phoneErr = null;
        }),
      ),
      const PaneLabel('Network'),
      Row(children: [
        for (var i = 0; i < networks.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: PickTile(
              selected: networks[i].id == net,
              onTap: () => setState(() { _changeNet(networks[i].id); auto = false; }),
              art: NetworkLogo(networks[i].logo, size: 34),
              label: networks[i].name,
            ),
          ),
        ],
      ]),
      const SizedBox(height: 14),
      AppTextField(
        label: 'Phone number',
        labelRight: auto && n != null ? Pill('Auto-detected ${n.name}', tone: 'success', icon: 'bi-check-circle') : null,
        placeholder: '080 0000 0000',
        keyboardType: TextInputType.phone,
        maxLength: 11,
        value: phone,
        inputFormatters: [AppTextField.digits],
        onChanged: (t) => setState(() => _onPhone(t)),
        error: phoneErr,
        prefix: n != null ? NetworkLogo(n.logo, size: 22) : AppIcon('bi-phone', size: 18, color: c.muted),
        suffix: GestureDetector(
          onTap: () => setState(() => _onPhone(store.user.phone)),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(R.pill)),
            child: AppText('Me', size: 12, weight: FontWeight.w700, color: c.primary),
          ),
        ),
      ),
      if (airtime) ...[
        const SizedBox(height: 14),
        AppTextField(
          label: 'Amount', prefix: '₦', big: true, keyboardType: TextInputType.number, placeholder: '50 – 50,000',
          value: amount, inputFormatters: [AppTextField.digits], error: amountErr,
          onChanged: (t) => setState(() { amount = amountOnly(t); amountErr = null; }),
        ),
        const SizedBox(height: 10),
        AmountChips(values: const [100, 200, 500, 1000, 2000, 5000], current: a, onPick: (v) => setState(() { amount = '$v'; amountErr = null; })),
        const SizedBox(height: 14),
        Summary([
          SRow('Network', n?.name ?? '—'),
          SRow('Recipient', phone.isEmpty ? '—' : phone),
          SRow('Cashback (2%)', '+${f.naira(cashback, 2)}', color: c.success),
        ], total: ('You pay', f.naira(a, 2))),
      ] else ...[
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(children: [
            const Expanded(child: AppText('Choose a plan', v: TV.sm, weight: FontWeight.w600)),
            if (n != null) AppText('${shown.length} plan${shown.length == 1 ? '' : 's'}', v: TV.xs, muted: true),
          ]),
        ),
        if (n == null)
          const EmptyState(icon: 'bi-wifi', title: 'Select a network', message: 'Enter a phone number or pick a network to see plans.')
        else ...[
          Wrap(spacing: 8, runSpacing: 8, children: [for (final t in types) AppChip(t, active: ptype == t, onTap: () => setState(() => ptype = t))]),
          const SizedBox(height: 10),
          TileGrid(cols: 2, gap: 10, children: [
            for (final p in shown)
              OptionCard(
                selected: plan?.id == p.id,
                onTap: () => setState(() { plan = p; planErr = null; }),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Pill(p.type),
                  const SizedBox(height: 6),
                  AppText(p.name, v: TV.h2),
                  AppText(p.validity, v: TV.xs, muted: true),
                  const SizedBox(height: 6),
                  AppText(f.naira(p.price), weight: FontWeight.w700, color: c.primary, tabular: true),
                ]),
              ),
          ]),
          if (planErr != null) Padding(padding: const EdgeInsets.only(top: 8), child: AppText(planErr!, v: TV.xs, color: c.danger)),
        ],
      ],
      const SizedBox(height: 14),
      AppCheckbox(checked: save, onChanged: (v) => setState(() => save = v), label: 'Save as beneficiary'),
      const SizedBox(height: 14),
      Btn(
        airtime ? 'Buy airtime' : plan != null ? 'Buy data · ${f.naira(plan!.price)}' : 'Buy data',
        size: BtnSize.lg, full: true, icon: 'bi-lightning-charge-fill',
        onPressed: airtime ? _buyAirtime : _buyData,
      ),
    ]);
  }
}
