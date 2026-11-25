import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/random.dart';
import '../../features/esim/components.dart';
import '../../features/esim/logic.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /esim/install/:id — QR code, manual codes and install steps (members only).
class EsimInstallScreen extends StatefulWidget {
  final String id;
  /// query parameters
  final Map<String, String> q;
  const EsimInstallScreen({super.key, required this.id, this.q = const {}});
  @override
  State<EsimInstallScreen> createState() => _EsimInstallScreenState();
}

const _steps = {
  'ios': [
    'Connect to Wi‑Fi and open **Settings → Mobile Service** (or Cellular).',
    'Tap **Add eSIM** → **Use QR Code** and scan the code (or tap *Enter details manually*).',
    'Label the line **“Travel”** and set it for **Mobile Data** only. Keep your Nigerian line for iMessage & calls.',
    'On arrival, turn on **Data Roaming** for the Travel line. Your plan activates automatically.',
  ],
  'android': [
    'Connect to Wi‑Fi and open **Settings → Connections → SIM manager** (Samsung) or **Network & internet → SIMs** (Pixel).',
    'Tap **Add eSIM** → **Scan QR code**, or choose *Enter activation code* and paste the SM-DP+ address and code.',
    'Set the new eSIM as your **Mobile data** SIM. Keep your local SIM for calls & SMS.',
    'On arrival, enable **Roaming** for the eSIM. It connects to a partner network automatically.',
  ],
};

class _EsimInstallScreenState extends State<EsimInstallScreen> {
  String os = Platform.isAndroid ? 'android' : 'ios';
  bool busy = false;

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    final c = context.c;
    Esim? e;
    for (final x in s.esims) { if (x.id == widget.id) e = x; }
    if (e == null) {
      return AppScreen(
        header: const AppHeader(title: 'Install eSIM', fallback: '/esim?tab=mine'),
        children: [EmptyState(icon: 'bi-sim', title: 'eSIM not found', message: 'It may have been deleted.', action: 'My eSIMs', onAction: () => context.go('/esim?tab=mine'))],
      );
    }
    final esim = e;
    final notInstalled = computeStatus(esim) == 'Not installed';
    return AppScreen(
      header: AppHeader(title: 'Install ${esim.country} eSIM', subtitle: '${esim.plan} · ICCID ${esim.iccid}', fallback: '/esim?tab=mine'),
      footer: notInstalled
          ? Btn("I've installed it — activate now", icon: 'bi-check2-circle', size: BtnSize.lg, full: true, loading: busy, onPressed: () async {
              setState(() => busy = true);
              await sleep(900);
              if (!mounted) return;
              setState(() => busy = false);
              activate(esim.id);
              goBack(this.context, '/esim?tab=mine');
            })
          : Btn('Done', size: BtnSize.lg, full: true, onPressed: () => goBack(context, '/esim?tab=mine')),
      children: [
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              CountryArt.esim(esim, size: 40),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppText(esim.country, weight: FontWeight.w700),
                AppText(esim.plan, v: TV.xs, muted: true),
              ])),
            ]),
            const SizedBox(height: 14),
            InstallBlock(code: esim.activationCode),
          ]),
        ),
        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Segment<String>(value: os, onChanged: (v) => setState(() => os = v), options: const [SegOption('ios', 'iPhone', icon: 'bi-apple'), SegOption('android', 'Android', icon: 'ion:logo-android')]),
            const SizedBox(height: 14),
            for (var i = 0; i < _steps[os]!.length; i++)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Container(
                    width: 26, height: 26,
                    decoration: BoxDecoration(color: c.primarySoft, shape: BoxShape.circle),
                    child: Center(child: AppText('${i + 1}', v: TV.xs, weight: FontWeight.w700, color: c.primary)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: RichSteps(_steps[os]![i])),
                ]),
              ),
          ]),
        ),
        const SizedBox(height: 16),
        const Notice("Each QR code can be installed **once**. Don't delete the eSIM from your phone after installing.", tone: 'warning', icon: 'bi-exclamation-triangle'),
      ],
    );
  }
}
