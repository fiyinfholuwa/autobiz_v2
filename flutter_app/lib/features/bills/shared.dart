/// Shared bills helpers: record(), receipts, beneficiaries, mock verification data.
/// Port of mobile_app/src/features/bills/shared.tsx.
library;

import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../data/catalog.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

class BillTabMeta {
  final String id, label, icon, tone;
  const BillTabMeta(this.id, this.label, this.icon, this.tone);
}

const billTabs = [
  BillTabMeta('airtime', 'Airtime', 'bi-phone', 'warning'),
  BillTabMeta('data', 'Data', 'bi-wifi', 'primary'),
  BillTabMeta('electricity', 'Electricity', 'bi-lightning-charge', 'orange'),
  BillTabMeta('cable', 'Cable TV', 'bi-tv', 'cyan'),
  BillTabMeta('betting', 'Betting', 'bi-trophy', 'success'),
  BillTabMeta('education', 'Education', 'bi-mortarboard', 'violet'),
];

bool isBillTab(String? t) => t != null && billTabs.any((x) => x.id == t);
BillTabMeta billTab(String id) => billTabs.firstWhere((t) => t.id == id);

const streets = [
  '14 Adeola Odeku St, Victoria Island', '7 Allen Avenue, Ikeja', '22 Wuse Zone 4, Abuja', '3 Ring Road, Ibadan',
  '18 Ogui Road, Enugu', '9 Aba Road, Port Harcourt', '41 Zoo Road, Kano',
];

/// Network prefix → id
const _prefixes = {
  'mtn': ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'],
  'airtel': ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'],
  'glo': ['0805', '0807', '0705', '0815', '0811', '0905', '0915'],
  '9mobile': ['0809', '0817', '0818', '0909', '0908'],
};
final Map<String, String> _prefixMap = {for (final e in _prefixes.entries) for (final p in e.value) p: e.key};
String? detectNetwork(String phone) => phone.length >= 4 ? _prefixMap[phone.substring(0, 4)] : null;

/// digits only, max 9 chars
String amountOnly(String t) {
  final d = t.replaceAll(RegExp(r'\D'), '');
  return d.length > 9 ? d.substring(0, 9) : d;
}

String digits(String t, [int? max]) {
  final d = t.replaceAll(RegExp(r'\D'), '');
  return max != null && d.length > max ? d.substring(0, max) : d;
}

/// Debit + notify. Returns the tx, or null when the wallet is short (toast shown).
Tx? record(double amount, TxInput tx, Map<String, String> meta) {
  final t = store.debit(amount, TxInput(type: tx.type, title: tx.title, subtitle: tx.subtitle, icon: tx.icon, tone: tx.tone, ref: f.ref('AB'), meta: meta));
  if (t == null) {
    toast('Insufficient balance', type: ToastType.error);
    return null;
  }
  store.notify(icon: tx.icon ?? 'bi-bell', tone: tx.tone ?? 'primary', title: '${tx.title} successful', body: '${f.naira(amount)} · ${tx.subtitle ?? ''}');
  return t;
}

/// Receipt with Reference / Date / Status rows + Share & Copy actions.
void showReceipt(Tx tx, {required String title, required String message, required List<SRow> rows, Widget? extra}) {
  final all = [
    ...rows,
    SRow('Reference', tx.ref ?? tx.id),
    SRow('Date', f.datetime(tx.date)),
    const SRow('Status', StatusPill('success', label: 'Successful')),
  ];
  final text = receiptText(title, [...all.sublist(0, all.length - 1), const SRow('Status', 'Successful')]);
  success(SuccessOpts(
    title: title,
    message: message,
    rows: all,
    extra: extra,
    actions: [
      SuccessAction('Share', () => shareText('AutoBiz receipt', text), icon: 'bi-share', keepOpen: true),
      SuccessAction('Copy', () => copyText(text, 'Receipt copied to clipboard'), icon: 'bi-copy', keepOpen: true),
    ],
  ));
}

/* ---------------- Beneficiaries ---------------- */
void saveBeneficiary({required String kind, required String value, String? network, String? provider, String? meterType, required String label}) {
  store.mutate(() {
    final list = store.beneficiaries.where((x) => !(x.kind == kind && x.value == value)).toList();
    list.insert(0, Beneficiary(id: 'BN${f.now()}', kind: kind, value: value, network: network, provider: provider, meterType: meterType, label: label));
    store.beneficiaries = list.length > 20 ? list.sublist(0, 20) : list;
  });
}

void removeBeneficiary(String id) {
  store.mutate(() => store.beneficiaries = store.beneficiaries.where((x) => x.id != id).toList());
  toast('Beneficiary removed', type: ToastType.info);
}

String maskValue(String v) {
  final last4 = v.length > 4 ? v.substring(v.length - 4) : v;
  final len = v.length > 6 ? 7 : 4;
  final dots = len - last4.length;
  return '${'•' * (dots > 0 ? dots : 0)}$last4';
}

/* ---------------- Small shared UI ---------------- */
class NetworkLogo extends StatelessWidget {
  final String asset;
  final double size;
  const NetworkLogo(this.asset, {super.key, this.size = 20});
  @override
  Widget build(BuildContext context) => ClipOval(child: Image.asset(asset, width: size, height: size, fit: BoxFit.cover));
}

class NetworkName extends StatelessWidget {
  final String id;
  final double size;
  const NetworkName(this.id, {super.key, this.size = 20});
  @override
  Widget build(BuildContext context) {
    final n = networkById(id);
    if (n == null) return const AppText('—', v: TV.sm, weight: FontWeight.w600);
    return Row(mainAxisSize: MainAxisSize.min, children: [NetworkLogo(n.logo, size: size), const SizedBox(width: 6), AppText(n.name, v: TV.sm, weight: FontWeight.w600)]);
  }
}

/// Dashed-look box showing a token / PIN with a copy button.
class TokenBox extends StatelessWidget {
  final String label, value, copyValue;
  final String? sub;
  const TokenBox({super.key, required this.label, required this.value, required this.copyValue, this.sub});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(R.lg), border: Border.all(color: c.primary300, width: 1.5)),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          AppText(label, v: TV.label, muted: true),
          if (sub != null) AppText(sub!, v: TV.xs, muted: true),
          const SizedBox(height: 4),
          AppText(value, weight: FontWeight.w800, size: 17, tabular: true, selectable: true, color: c.text),
        ])),
        Btn('Copy', icon: 'bi-copy', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: () => copyText(copyValue, 'Copied')),
      ]),
    );
  }
}

/// Green "verified" box. [lines] items are String or Widget.
class VerifiedBox extends StatelessWidget {
  final String title;
  final List<Object> lines;
  const VerifiedBox({super.key, required this.title, required this.lines});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: c.successSoft, borderRadius: BorderRadius.circular(R.md)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 22, height: 22, margin: const EdgeInsets.only(top: 1),
          decoration: BoxDecoration(color: c.success, shape: BoxShape.circle),
          child: const Center(child: AppText('✓', size: 12, weight: FontWeight.w700, color: Colors.white)),
        ),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          AppText(title, weight: FontWeight.w700),
          for (final l in lines) Padding(padding: const EdgeInsets.only(top: 2), child: l is Widget ? l : AppText('$l', v: TV.xs, muted: true)),
        ])),
      ]),
    );
  }
}

/// Small pill button used as the "Verify" suffix of inputs.
class VerifyChip extends StatelessWidget {
  final bool verifying, verified;
  final VoidCallback onTap;
  const VerifyChip({super.key, required this.verifying, required this.verified, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return GestureDetector(
      onTap: verifying ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(R.pill)),
        child: verifying
            ? SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: c.primary))
            : AppText(verified ? 'Verified' : 'Verify', size: 12, weight: FontWeight.w700, color: c.primary),
      ),
    );
  }
}

/// Selectable brand tile with label (networks, providers, platforms, exams).
class PickTile extends StatelessWidget {
  final bool selected;
  final VoidCallback onTap;
  final Widget art;
  final String label;
  final String? sub;
  const PickTile({super.key, required this.selected, required this.onTap, required this.art, required this.label, this.sub});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      selected: selected, button: true, label: label,
      child: Material(
        color: selected ? c.primarySoft : c.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.lg), side: BorderSide(color: selected ? c.primary : c.border, width: 1.5)),
        child: InkWell(
          borderRadius: BorderRadius.circular(R.lg),
          onTap: () { tapHaptic(); onTap(); },
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              art,
              const SizedBox(height: 6),
              AppText(label, size: 12, weight: selected ? FontWeight.w700 : FontWeight.w600, color: selected ? c.primary : c.text, maxLines: 1),
              if (sub != null) AppText(sub!, size: 11, muted: true, tabular: true),
            ]),
          ),
        ),
      ),
    );
  }
}

/// Grid of [cols] equal-width tiles.
class TileGrid extends StatelessWidget {
  final int cols;
  final double gap;
  final List<Widget> children;
  const TileGrid({super.key, required this.cols, required this.children, this.gap = 8});
  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < children.length; i += cols) {
      final slice = children.sublist(i, i + cols > children.length ? children.length : i + cols);
      rows.add(Padding(
        padding: EdgeInsets.only(top: i == 0 ? 0 : gap),
        child: IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (var j = 0; j < cols; j++) ...[
            if (j > 0) SizedBox(width: gap),
            Expanded(child: j < slice.length ? slice[j] : const SizedBox.shrink()),
          ],
        ])),
      ));
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: rows);
  }
}

/// Wrap of amount preset chips.
class AmountChips extends StatelessWidget {
  final List<int> values;
  final double current;
  final ValueChanged<int> onPick;
  const AmountChips({super.key, required this.values, required this.current, required this.onPick});
  @override
  Widget build(BuildContext context) => Wrap(spacing: 8, runSpacing: 8, children: [
        for (final v in values) AppChip(f.naira(v), active: current == v, onTap: () => onPick(v)),
      ]);
}

/// Field label used above custom pickers.
class PaneLabel extends StatelessWidget {
  final String text;
  const PaneLabel(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 8), child: AppText(text, v: TV.sm, weight: FontWeight.w600));
}
