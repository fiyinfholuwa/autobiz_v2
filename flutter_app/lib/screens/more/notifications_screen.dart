import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /notifications
class NotificationsScreen extends StatelessWidget {
  /// query parameters
  final Map<String, String> q;
  const NotificationsScreen({super.key, this.q = const {}});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final list = s.notifications;
    final unread = s.unreadCount;
    return AppScreen(
      header: AppHeader(
        title: 'Notifications',
        subtitle: unread > 0 ? '$unread unread' : "You're all caught up",
        actions: [
          if (list.isNotEmpty)
            GestureDetector(
              onTap: () async {
                if (unread > 0) { store.markAllRead(); return; }
                if (await confirmDialog(const ConfirmOpts(title: 'Clear all notifications?', confirmLabel: 'Clear', tone: 'danger', icon: 'bi-trash'))) {
                  store.mutate(() => store.notifications = []);
                }
              },
              child: AppText(unread > 0 ? 'Mark all read' : 'Clear', v: TV.sm, weight: FontWeight.w700, color: c.primary),
            ),
        ],
      ),
      children: [
        if (list.isEmpty)
          const EmptyState(icon: 'bi-bell', title: "You're all caught up", message: 'Payment alerts, offers and account updates will appear here.')
        else
          CardBox(
            padding: const EdgeInsets.all(6),
            child: Column(children: [
              for (final n in list)
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Material(
                    color: n.read ? Colors.transparent : c.primarySoft,
                    borderRadius: BorderRadius.circular(R.lg),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(R.lg),
                      onTap: () => store.mutate(() => n.read = true),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          IconTile(n.icon, tone: n.tone, size: 42),
                          const SizedBox(width: 12),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            AppText(n.title, weight: n.read ? FontWeight.w600 : FontWeight.w700),
                            const SizedBox(height: 2),
                            AppText(n.body, v: TV.sm, muted: true),
                            const SizedBox(height: 4),
                            AppText(f.ago(n.time), v: TV.xs, muted: true),
                          ])),
                          if (!n.read) Container(margin: const EdgeInsets.only(top: 6, left: 8), width: 9, height: 9, decoration: BoxDecoration(color: c.primary, shape: BoxShape.circle)),
                        ]),
                      ),
                    ),
                  ),
                ),
            ]),
          ),
      ],
    );
  }
}
