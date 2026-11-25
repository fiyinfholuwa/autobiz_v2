import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../features/settings/settings_shared.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _modes = [('light', 'Light', 'bi-sun'), ('dark', 'Dark', 'bi-moon-stars'), ('system', 'System', 'bi-circle-half')];

/// Route: /settings/appearance
class AppearanceScreen extends StatelessWidget {
  /// query parameters
  final Map<String, String> q;
  const AppearanceScreen({super.key, this.q = const {}});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final mode = s.settings.themeMode;
    return AppScreen(
      header: const AppHeader(title: 'Appearance', subtitle: 'Make AutoBiz yours'),
      children: [
        const SizedBox(height: 6),
        const AppText('Theme', v: TV.h3),
        const SizedBox(height: 10),
        IntrinsicHeight(
          child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            for (var i = 0; i < _modes.length; i++) ...[
              if (i > 0) const SizedBox(width: 10),
              Expanded(
                child: Semantics(
                  selected: _modes[i].$1 == mode,
                  button: true,
                  child: GestureDetector(
                    onTap: () { tapHaptic(); store.mutate(() => store.settings.themeMode = _modes[i].$1); },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 160),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(R.lg), border: Border.all(color: _modes[i].$1 == mode ? c.primary : c.border, width: 2)),
                      child: Column(children: [
                        _Preview(_modes[i].$1),
                        const SizedBox(height: 8),
                        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                          AppIcon(_modes[i].$3, size: 15, color: _modes[i].$1 == mode ? c.primary : c.muted),
                          const SizedBox(width: 6),
                          AppText(_modes[i].$2, v: TV.sm, weight: FontWeight.w700, color: _modes[i].$1 == mode ? c.primary : c.text),
                        ]),
                      ]),
                    ),
                  ),
                ),
              ),
            ],
          ]),
        ),
        const SizedBox(height: 8),
        const AppText("System follows your phone's light or dark setting automatically.", v: TV.xs, muted: true),
        if (s.authed)
          Group(title: 'Privacy', children: [
            SwitchRow(
              icon: 'bi-eye-slash', tone: 'violet', title: 'Hide balances', subtitle: 'Mask wallet amounts across the app', value: s.settings.hideBalance,
              onChanged: (v) {
                store.mutate(() => store.settings.hideBalance = v);
                toast(v ? 'Balances hidden' : 'Balances visible', type: ToastType.info);
              },
            ),
          ]),
      ],
    );
  }
}

class _Preview extends StatelessWidget {
  final String mode;
  const _Preview(this.mode);
  Widget _pane(Palette p) => Expanded(
        child: Container(
          color: p.bg,
          padding: const EdgeInsets.all(8),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(height: 14, decoration: BoxDecoration(color: p.primary, borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 5),
            FractionallySizedBox(widthFactor: 0.7, child: Container(height: 8, decoration: BoxDecoration(color: p.border, borderRadius: BorderRadius.circular(3)))),
            const SizedBox(height: 5),
            Container(height: 22, decoration: BoxDecoration(color: p.surface, borderRadius: BorderRadius.circular(5))),
          ]),
        ),
      );
  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(R.md),
        child: SizedBox(
          height: 82,
          child: Row(children: mode == 'system' ? [_pane(lightPalette), _pane(darkPalette)] : [_pane(mode == 'dark' ? darkPalette : lightPalette)]),
        ),
      );
}
