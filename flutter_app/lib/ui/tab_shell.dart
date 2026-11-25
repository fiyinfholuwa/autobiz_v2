import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../store/app_store.dart';
import 'app_icon.dart';
import 'text.dart';

/// Home · Shop · Pay (FAB) · Cards · More — mirrors mobile_app/src/app/(tabs)/_layout.tsx.
class TabShell extends StatelessWidget {
  final StatefulNavigationShell shell;
  const TabShell({super.key, required this.shell});

  static const _tabs = [
    ('Home', 'ion:home-outline', 'ion:home'),
    ('Shop', 'ion:storefront-outline', 'ion:storefront'),
    ('Pay', 'ion:flash', 'ion:flash'),
    ('Cards', 'ion:card-outline', 'ion:card'),
    ('More', 'ion:grid-outline', 'ion:grid'),
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final bottom = MediaQuery.paddingOf(context).bottom;
    void go(int i) {
      HapticFeedback.selectionClick();
      shell.goBranch(i, initialLocation: i == shell.currentIndex);
    }

    return Scaffold(
      extendBody: true,
      resizeToAvoidBottomInset: false,
      body: shell,
      bottomNavigationBar: Container(
        padding: EdgeInsets.fromLTRB(10, 8, 10, bottom > 10 ? bottom : 10),
        decoration: BoxDecoration(color: c.surface, border: c.dark ? Border(top: BorderSide(color: c.border)) : null, boxShadow: shadow(c, 2)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          for (var i = 0; i < _tabs.length; i++)
            Expanded(
              child: i == 2
                  ? GestureDetector(
                      onTap: () => go(i),
                      behavior: HitTestBehavior.opaque,
                      child: Semantics(
                        button: true, label: 'Pay bills',
                        child: Column(mainAxisSize: MainAxisSize.min, children: [
                          Transform.translate(
                            offset: const Offset(0, -22),
                            child: Container(
                              width: 56, height: 56,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(colors: [c.primary300, c.primary700], begin: Alignment.topLeft, end: Alignment.bottomRight),
                                border: Border.all(color: c.surface, width: 4),
                                boxShadow: [BoxShadow(color: c.primary.withValues(alpha: 0.4), blurRadius: 14, offset: const Offset(0, 6))],
                              ),
                              child: const Center(child: AppIcon('ion:flash', size: 24, color: Colors.white)),
                            ),
                          ),
                          Transform.translate(offset: const Offset(0, -18), child: AppText('Pay', size: 11, weight: shell.currentIndex == 2 ? FontWeight.w700 : FontWeight.w500, color: shell.currentIndex == 2 ? c.primary : c.muted)),
                        ]),
                      ),
                    )
                  : _TabItem(
                      label: _tabs[i].$1,
                      icon: shell.currentIndex == i ? _tabs[i].$3 : _tabs[i].$2,
                      active: shell.currentIndex == i,
                      badge: i == 1 ? s.cartCount : i == 4 ? s.unreadCount : 0,
                      onTap: () => go(i),
                    ),
            ),
        ]),
      ),
    );
  }
}

class _TabItem extends StatelessWidget {
  final String label, icon;
  final bool active;
  final int badge;
  final VoidCallback onTap;
  const _TabItem({required this.label, required this.icon, required this.active, required this.badge, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      selected: active, button: true, label: label,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Stack(clipBehavior: Clip.none, children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 48, height: 28,
                decoration: BoxDecoration(color: active ? c.primarySoft : Colors.transparent, borderRadius: BorderRadius.circular(R.pill)),
                child: Center(child: AppIcon(icon, size: 21, color: active ? c.primary : c.muted)),
              ),
              if (badge > 0)
                Positioned(
                  top: -3, right: 4,
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 16), height: 16, padding: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(color: c.danger, borderRadius: BorderRadius.circular(8), border: Border.all(color: c.surface, width: 1.5)),
                    child: Center(child: AppText(badge > 9 ? '9+' : '$badge', size: 9, weight: FontWeight.w700, color: Colors.white)),
                  ),
                ),
            ]),
            const SizedBox(height: 3),
            AppText(label, size: 11, weight: active ? FontWeight.w700 : FontWeight.w500, color: active ? c.primary : c.muted),
          ]),
        ),
      ),
    );
  }
}
