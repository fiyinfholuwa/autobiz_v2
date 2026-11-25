import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../features/settings/settings_shared.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _sections = [
  ('Profile', 'Name, email, phone & username', 'bi-person', 'primary', '/settings/profile'),
  ('Security', 'Password, transaction PIN, 2FA & devices', 'bi-shield-lock', 'success', '/settings/security'),
  ('Verification', 'Account tier & limits', 'bi-patch-check', 'violet', '/settings/verification'),
  ('Notifications', 'Alerts, receipts & promotions', 'bi-bell', 'orange', '/settings/notifications'),
  ('Appearance', 'Light, dark or system theme', 'bi-palette', 'cyan', '/settings/appearance'),
  ('Refer & earn', 'Earn ₦500 for every friend', 'bi-people', 'pink', '/settings/refer'),
  ('Help & support', "We're available 24/7", 'bi-question-circle', 'warning', '/settings/help'),
];

/// Route: /settings
class SettingsScreen extends StatelessWidget {
  /// query parameters
  final Map<String, String> q;
  const SettingsScreen({super.key, this.q = const {}});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppStore>().user;
    return AppScreen(
      header: const AppHeader(title: 'Settings'),
      children: [
        CardBox(
          onTap: () => context.push('/settings/profile'),
          child: Row(children: [
            Avatar(f.initials(user.firstName, user.lastName), size: 56),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText('${user.firstName} ${user.lastName}', v: TV.h3, maxLines: 1),
              AppText('@${user.username.isEmpty ? 'user' : user.username} · ${user.email}', v: TV.sm, muted: true, maxLines: 1),
              const SizedBox(height: 6),
              Pill(user.tier),
            ])),
          ]),
        ),
        Group(title: 'Preferences', children: [
          for (final s in _sections) ListRow(icon: s.$3, tone: s.$4, title: s.$1, subtitle: s.$2, chevron: true, onTap: () => context.push(s.$5)),
        ]),
        const Group(title: 'Account', children: [
          ListRow(icon: 'bi-arrow-counterclockwise', tone: 'warning', title: 'Reset demo data', subtitle: 'Restore the wallet, transactions, cart and settings to defaults', onTap: confirmReset),
          ListRow(icon: 'bi-box-arrow-right', danger: true, title: 'Log out', subtitle: 'Sign out of AutoBiz on this device', onTap: confirmLogout),
        ]),
      ],
    );
  }
}
