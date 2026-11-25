import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../features/settings/settings_shared.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _prefs = [
  ('txPush', 'Transaction alerts', 'Push notification for every debit and credit', 'bi-bell', 'primary', false),
  ('txEmail', 'Email receipts', 'Get a receipt by email for each payment', 'bi-envelope', 'violet', false),
  ('security', 'Security alerts', 'New logins, password and PIN changes · always on', 'bi-shield-lock', 'success', true),
  ('priceAlerts', 'Rate alerts', 'Gift card and USD rate changes', 'bi-graph-up', 'cyan', false),
  ('promo', 'Offers & promotions', 'Cashback deals, flight and eSIM promos', 'bi-tag', 'pink', false),
  ('newsletter', 'Monthly statement', 'A summary of your spending each month', 'bi-file-earmark-text', 'orange', false),
];

/// Route: /settings/notifications
class NotificationPrefsScreen extends StatelessWidget {
  /// query parameters
  final Map<String, String> q;
  const NotificationPrefsScreen({super.key, this.q = const {}});
  @override
  Widget build(BuildContext context) {
    final notif = context.watch<AppStore>().settings.notif;
    return AppScreen(
      header: const AppHeader(title: 'Notifications', subtitle: 'Choose what we tell you about'),
      children: [
        Group(margin: const EdgeInsets.only(top: 6), children: [
          for (final p in _prefs)
            SwitchRow(
              icon: p.$4, tone: p.$5, title: p.$2, subtitle: p.$3, disabled: p.$6,
              value: p.$6 ? true : (notif[p.$1] ?? false),
              onChanged: (v) {
                store.mutate(() => store.settings.notif[p.$1] = v);
                toast('Notification preferences saved');
              },
            ),
        ]),
      ],
    );
  }
}
