import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

class _Tier { final String id, title; final List<String> reqs, limits; const _Tier(this.id, this.title, this.reqs, this.limits); }

const _tiers = [
  _Tier('Tier 1', 'Tier 1 · Basic', ['Phone number verified', 'Email verified'], ['₦50,000 daily', '₦300,000 max balance']),
  _Tier('Tier 2', 'Tier 2 · Verified', ['BVN verification', 'Date of birth'], ['₦200,000 daily', '₦500,000 max balance', 'USD virtual cards']),
  _Tier('Tier 3', 'Tier 3 · Premium', ['NIN verification', 'Proof of address'], ['₦5,000,000 daily', 'Unlimited balance', 'Reseller pricing']),
];

/// Route: /settings/verification  (q: upgrade=1 auto-opens the next tier's upgrade sheet)
class VerificationScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const VerificationScreen({super.key, this.q = const {}});
  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  int get _idx => _tiers.indexWhere((t) => t.id == store.user.tier).clamp(0, 2);

  @override
  void initState() {
    super.initState();
    _maybeAutoOpen();
  }

  @override
  void didUpdateWidget(VerificationScreen old) {
    super.didUpdateWidget(old);
    if (old.q['upgrade'] != widget.q['upgrade']) _maybeAutoOpen();
  }

  void _maybeAutoOpen() {
    if (widget.q['upgrade'] == '1' && _idx < 2) {
      Future.delayed(const Duration(milliseconds: 600), () { if (mounted) _open(_tiers[_idx + 1]); });
    }
  }

  void _open(_Tier t) => showSheet(_UpgradeSheet(tier: t));

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final tier = context.watch<AppStore>().user.tier;
    final idx = _idx;
    return AppScreen(
      header: const AppHeader(title: 'Verification & limits', subtitle: 'Verify your identity to raise your limits'),
      children: [
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [const Expanded(child: AppText('Account level', weight: FontWeight.w700)), StatusPill('info', label: 'Current: $tier')]),
            const SizedBox(height: 12),
            ProgressBar((idx + 1) / 3, height: 10),
            const SizedBox(height: 6),
            AppText('${((idx + 1) / 3 * 100).round()}% verified${idx < 2 ? ' · Next: ${_tiers[idx + 1].id}' : ' · Maximum tier reached'}', v: TV.xs, muted: true),
          ]),
        ),
        for (var i = 0; i < _tiers.length; i++)
          Padding(
            padding: const EdgeInsets.only(top: 14),
            child: Container(
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.xl), border: i == idx ? Border.all(color: c.primary, width: 1.5) : null),
              child: CardBox(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(children: [
                    Expanded(child: AppText(_tiers[i].title, v: TV.h3)),
                    if (i == idx) const StatusPill('info', label: 'Current') else if (i < idx) const StatusPill('success', label: 'Done'),
                  ]),
                  const SizedBox(height: 12),
                  for (final r in _tiers[i].reqs)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(children: [
                        AppIcon(i <= idx ? 'bi-check-circle-fill' : 'bi-check-circle', size: 17, color: i <= idx ? c.success : c.muted),
                        const SizedBox(width: 8),
                        AppText(r, v: TV.sm),
                      ]),
                    ),
                  const SizedBox(height: 4),
                  Wrap(spacing: 6, runSpacing: 6, children: [
                    for (final l in _tiers[i].limits)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(R.pill)),
                        child: AppText(l, v: TV.xs, weight: FontWeight.w600),
                      ),
                  ]),
                  if (i == idx + 1) Padding(padding: const EdgeInsets.only(top: 14), child: Btn('Upgrade to ${_tiers[i].id}', icon: 'bi-patch-check', onPressed: () => _open(_tiers[i]))),
                ]),
              ),
            ),
          ),
      ],
    );
  }
}

class _UpgradeSheet extends StatefulWidget {
  final _Tier tier;
  const _UpgradeSheet({required this.tier});
  @override
  State<_UpgradeSheet> createState() => _UpgradeSheetState();
}

class _UpgradeSheetState extends State<_UpgradeSheet> {
  String bvn = '', dob = '', nin = '', addr = '';
  XFile? doc;
  bool consent = false, busy = false;
  Map<String, String?> e = {};

  bool get isT2 => widget.tier.id == 'Tier 2';
  final String maxDob = f.isoDay(f.now() - (18 * 365.25 * 864e5).round());

  Future<void> _pick(bool camera) async {
    try {
      final x = await ImagePicker().pickImage(source: camera ? ImageSource.camera : ImageSource.gallery, imageQuality: 70);
      if (x == null) return;
      if (await x.length() > 5 * 1024 * 1024) { toast('Document is larger than 5MB', type: ToastType.error); return; }
      setState(() { doc = x; e['doc'] = null; });
    } catch (_) {
      toast('Permission needed to upload your document', type: ToastType.warning);
    }
  }

  Future<void> _submit() async {
    final er = <String, String?>{};
    if (isT2) {
      if (!RegExp(r'^\d{11}$').hasMatch(bvn)) er['bvn'] = 'Enter a valid 11-digit BVN';
      if (dob.isEmpty || dob.compareTo(maxDob) > 0) er['dob'] = 'You must be at least 18 years old';
    } else {
      if (!RegExp(r'^\d{11}$').hasMatch(nin)) er['nin'] = 'Enter a valid 11-digit NIN';
      if (addr.trim().length < 8) er['addr'] = 'Enter your address';
      if (doc == null) er['doc'] = 'Upload a document';
    }
    if (!consent) er['consent'] = 'Consent is required';
    setState(() => e = er);
    if (er.values.any((x) => x != null)) return;
    setState(() => busy = true);
    await sleep(1500);
    final t = widget.tier;
    store.mutate(() {
      store.user.tier = t.id;
      if (isT2) { store.user.bvnVerified = true; } else { store.user.ninVerified = true; }
    });
    store.notify(icon: 'bi-patch-check', tone: 'success', title: 'Upgraded to ${t.id}', body: 'Your new limits: ${t.limits.join(', ')}.');
    if (!mounted) return;
    Navigator.of(context).pop();
    Future.delayed(const Duration(milliseconds: 320), () => success(SuccessOpts(
          title: "You're now ${t.id}",
          message: 'Your identity has been verified and your limits increased.',
          rows: [for (var i = 0; i < t.limits.length; i++) SRow(i == 0 ? 'Daily limit' : 'Benefit', t.limits[i])],
        )));
  }

  Widget _dropTile(String icon, String label, bool camera) {
    final c = context.c;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(R.lg),
        onTap: () => _pick(camera),
        child: CustomPaint(
          painter: _DashedBorder(color: e['doc'] != null ? c.danger : c.border),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [AppIcon(icon, size: 24, color: c.primary), const SizedBox(height: 6), AppText(label, v: TV.xs, weight: FontWeight.w600)]),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppSheet(
      title: 'Upgrade to ${widget.tier.id}',
      locked: busy,
      footer: Btn('Verify & upgrade', size: BtnSize.lg, full: true, loading: busy, loadingText: isT2 ? 'Verifying with NIBSS…' : 'Verifying with NIMC…', onPressed: _submit),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Notice(isT2 ? 'We use your BVN only to confirm your identity. It never gives access to your bank account.' : 'Verify your National Identification Number (NIN) and address to unlock premium limits.', tone: 'primary', icon: 'bi-shield-lock'),
        const SizedBox(height: 14),
        if (isT2) ...[
          AppTextField(
            label: 'Bank Verification Number (BVN)', placeholder: '11 digits', keyboardType: TextInputType.number, maxLength: 11, inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            value: bvn, error: e['bvn'], hint: 'Dial *565*0# to get your BVN', onChanged: (v) => setState(() { bvn = v; e['bvn'] = null; }),
          ),
          const SizedBox(height: 14),
          DateField(label: 'Date of birth', value: dob, max: maxDob, error: e['dob'], onChanged: (v) => setState(() { dob = v; e['dob'] = null; })),
        ] else ...[
          AppTextField(
            label: 'National Identification Number (NIN)', placeholder: '11 digits', keyboardType: TextInputType.number, maxLength: 11, inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            value: nin, error: e['nin'], onChanged: (v) => setState(() { nin = v; e['nin'] = null; }),
          ),
          const SizedBox(height: 14),
          AppTextField(label: 'Residential address', placeholder: 'House number, street, city', value: addr, error: e['addr'], onChanged: (v) => setState(() { addr = v; e['addr'] = null; })),
          const SizedBox(height: 14),
          const AppText('Proof of address', v: TV.sm, weight: FontWeight.w600),
          const SizedBox(height: 6),
          if (doc != null)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.lg), border: Border.all(color: c.border)),
              child: Row(children: [
                ClipRRect(borderRadius: BorderRadius.circular(10), child: Image.file(File(doc!.path), width: 52, height: 52, fit: BoxFit.cover)),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  AppText(doc!.name.isEmpty ? 'proof-of-address.jpg' : doc!.name, v: TV.sm, weight: FontWeight.w600, maxLines: 1),
                  AppText('Ready to upload', v: TV.xs, color: c.success),
                ])),
                GestureDetector(onTap: () => setState(() => doc = null), child: Semantics(label: 'Remove document', child: AppIcon('bi-x-circle-fill', size: 22, color: c.muted))),
              ]),
            )
          else
            Row(children: [_dropTile('bi-cloud-upload', 'Choose file', false), const SizedBox(width: 10), _dropTile('bi-camera', 'Take photo', true)]),
          const SizedBox(height: 5),
          AppText(e['doc'] ?? 'Utility bill or bank statement from the last 3 months', v: TV.xs, color: e['doc'] != null ? c.danger : c.muted),
        ],
        const SizedBox(height: 14),
        AppCheckbox(checked: consent, error: e['consent'], onChanged: (v) => setState(() { consent = v; e['consent'] = null; }), label: 'I consent to AutoBiz verifying my identity with ${isT2 ? 'NIBSS' : 'NIMC'}'),
      ]),
    );
  }
}

class _DashedBorder extends CustomPainter {
  final Color color;
  _DashedBorder({required this.color});
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = color..strokeWidth = 1.5..style = PaintingStyle.stroke;
    final path = Path()..addRRect(RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(R.lg)));
    for (final m in path.computeMetrics()) {
      var d = 0.0;
      while (d < m.length) { canvas.drawPath(m.extractPath(d, d + 6), p); d += 10; }
    }
  }
  @override
  bool shouldRepaint(_DashedBorder old) => old.color != color;
}
