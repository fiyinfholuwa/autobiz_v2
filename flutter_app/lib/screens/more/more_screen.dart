import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../features/settings/settings_shared.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

class _Svc { final String label, icon, tone, href; final bool auth; const _Svc(this.label, this.icon, this.tone, this.href, {this.auth = false}); }

const _services = [
  _Svc('Wallet', 'bi-wallet2', 'primary', '/wallet', auth: true),
  _Svc('Transactions', 'bi-receipt-cutoff', 'violet', '/transactions', auth: true),
  _Svc('Marketplace', 'bi-shop', 'orange', '/shop'),
  _Svc('Cart', 'bi-cart3', 'pink', '/cart'),
  _Svc('My Orders', 'bi-box-seam', 'cyan', '/orders', auth: true),
  _Svc('Wishlist', 'bi-heart', 'danger', '/orders?tab=wishlist', auth: true),
  _Svc('eSIM', 'bi-sim', 'violet', '/esim'),
  _Svc('Flights', 'bi-airplane', 'cyan', '/flights'),
  _Svc('Virtual Cards', 'bi-credit-card-2-front', 'success', '/cards'),
  _Svc('Gift Cards', 'bi-gift', 'pink', '/giftcards'),
  _Svc('Bills & Airtime', 'bi-lightning-charge', 'warning', '/pay'),
  _Svc('Notifications', 'bi-bell', 'primary', '/notifications'),
];

const _account = [
  ('Profile', 'Name, email, phone & username', 'bi-person', 'primary', '/settings/profile'),
  ('Security', 'Password, PIN, 2FA & devices', 'bi-shield-lock', 'success', '/settings/security'),
  ('Verification & limits', 'Upgrade your account tier', 'bi-patch-check', 'violet', '/settings/verification'),
  ('Notification preferences', 'Alerts, receipts & promos', 'bi-bell', 'orange', '/settings/notifications'),
  ('Appearance', 'Theme & balance privacy', 'bi-palette', 'cyan', '/settings/appearance'),
  ('Refer & earn', 'Earn ₦500 for every friend', 'bi-people', 'pink', '/settings/refer'),
  ('Help & support', 'Chat, call, FAQs', 'bi-question-circle', 'warning', '/settings/help'),
];

const _tabs = {'/', '/shop', '/pay', '/cards', '/more'};

/// Route: /more (tab)
class MoreScreen extends StatelessWidget {
  /// query parameters
  final Map<String, String> q;
  const MoreScreen({super.key, this.q = const {}});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final authed = s.authed;
    final user = s.user;
    final unread = s.unreadCount;
    final mode = s.settings.themeMode;
    final dark = c.dark;
    final white = Colors.white;

    void go(String href, [bool needsAuth = false]) {
      if (needsAuth && !authed) { context.push(loc('/login', {'next': href})); return; }
      final path = Uri.parse(href).path;
      if (_tabs.contains(path)) { context.go(href); } else { context.push(href); }
    }

    return AppScreen(
      padded: false,
      scroll: false,
      // Fixed top bar — stays put while the page scrolls
      header: Container(
        color: c.primary600,
        padding: EdgeInsets.fromLTRB(20, MediaQuery.paddingOf(context).top + 8, 20, 10),
        child: Row(children: [
          const Logo(size: 30, light: true),
          const Spacer(),
          IconBtn(dark ? 'bi-sun' : 'bi-moon-stars', color: white, bg: white.withValues(alpha: 0.16), tooltip: 'Toggle theme', onPressed: () => store.mutate(() => store.settings.themeMode = dark ? 'light' : 'dark')),
          const SizedBox(width: 8),
          IconBtn('bi-bell', color: white, bg: white.withValues(alpha: 0.16), badge: unread, tooltip: 'Notifications', onPressed: () => go('/notifications', true)),
        ]),
      ),
      // own scroll view so the hero gradient starts flush under the fixed header (no seam)
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: EdgeInsets.only(bottom: MediaQuery.paddingOf(context).bottom + tabBarSpace - 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 64),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [c.primary600, c.primary700], begin: Alignment.topCenter, end: Alignment.bottomCenter),
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
          ),
          child: authed
              ? GestureDetector(
                  onTap: () => context.push('/settings/profile'),
                  behavior: HitTestBehavior.opaque,
                  child: Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Row(children: [
                      Avatar(f.initials(user.firstName, user.lastName), size: 58, bg: white.withValues(alpha: 0.2), color: white),
                      const SizedBox(width: 14),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        AppText('${user.firstName} ${user.lastName}', v: TV.h2, color: white, maxLines: 1),
                        AppText('@${user.username.isEmpty ? 'user' : user.username} · ${user.email}', v: TV.sm, color: white.withValues(alpha: 0.8), maxLines: 1),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(color: white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(99)),
                          child: AppText(user.tier, size: 11, weight: FontWeight.w700, color: white),
                        ),
                      ])),
                      AppIcon('bi-chevron-right', size: 20, color: white),
                    ]),
                  ),
                )
              : Padding(
                  padding: const EdgeInsets.only(top: 22),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    AppText('Welcome to AutoBiz', v: TV.h2, color: white),
                    const SizedBox(height: 4),
                    AppText('Sign in or create a free account to fund your wallet, track orders and pay bills.', v: TV.sm, color: white.withValues(alpha: 0.85)),
                  ]),
                ),
        ),
        Transform.translate(
          offset: const Offset(0, -44),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              CardBox(
                child: authed
                    ? Row(children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const AppText('Wallet balance', v: TV.xs, muted: true),
                          AppText(s.settings.hideBalance ? '₦ ••••••' : f.naira(s.balance, 2), v: TV.h2, tabular: true),
                        ])),
                        Btn('Add money', size: BtnSize.sm, icon: 'bi-plus-lg', onPressed: openFund),
                        const SizedBox(width: 8),
                        IconBtn('bi-wallet2', bg: c.primarySoft, color: c.primary, tooltip: 'Open wallet', onPressed: () => context.push('/wallet')),
                      ])
                    : Row(children: [
                        Expanded(child: Btn('Log in', onPressed: () => context.push('/login'))),
                        const SizedBox(width: 10),
                        Expanded(child: Btn('Create account', variant: BtnVariant.soft, onPressed: () => context.push('/register'))),
                      ]),
              ),
              const SizedBox(height: 22),
              const AppText('All services', v: TV.h3),
              const SizedBox(height: 12),
              CardBox(
                child: LayoutBuilder(builder: (context, cons) {
                  final w = cons.maxWidth / 4;
                  return Wrap(runSpacing: 18, children: [
                    for (final sv in _services)
                      SizedBox(
                        width: w,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(R.md),
                          onTap: () => go(sv.href, sv.auth),
                          child: Column(children: [
                            Stack(clipBehavior: Clip.none, children: [
                              IconTile(sv.icon, tone: sv.tone, size: 48),
                              if (sv.label == 'Notifications' && unread > 0)
                                Positioned(top: -2, right: -2, child: Container(width: 12, height: 12, decoration: BoxDecoration(color: c.danger, shape: BoxShape.circle, border: Border.all(color: c.surface, width: 2)))),
                            ]),
                            const SizedBox(height: 6),
                            AppText(sv.label, size: 11, weight: FontWeight.w600, center: true, maxLines: 2),
                          ]),
                        ),
                      ),
                  ]);
                }),
              ),
              const SizedBox(height: 22),
              const AppText('Account', v: TV.h3),
              const SizedBox(height: 12),
              CardBox(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Column(children: [
                  for (var i = 0; i < _account.length; i++)
                    Container(
                      decoration: BoxDecoration(border: i > 0 ? Border(top: BorderSide(color: c.border)) : null),
                      child: ListRow(
                        icon: _account[i].$3, tone: _account[i].$4, title: _account[i].$1, subtitle: _account[i].$2, chevron: true,
                        onTap: () => go(_account[i].$5, _account[i].$5 != '/settings/help' && _account[i].$5 != '/settings/appearance'),
                      ),
                    ),
                ]),
              ),
              const SizedBox(height: 14),
              CardBox(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Column(children: [
                  ListRow(
                    icon: mode == 'system' ? 'bi-circle-half' : dark ? 'bi-moon-stars' : 'bi-sun', tone: 'neutral', title: 'Theme',
                    subtitle: mode == 'system' ? 'System default' : dark ? 'Dark' : 'Light', chevron: true,
                    onTap: () => context.push('/settings/appearance'),
                  ),
                  if (authed)
                    Container(
                      decoration: BoxDecoration(border: Border(top: BorderSide(color: c.border))),
                      child: const ListRow(icon: 'bi-box-arrow-right', danger: true, title: 'Log out', subtitle: 'Sign out of AutoBiz on this device', onTap: confirmLogout),
                    ),
                ]),
              ),
              const SizedBox(height: 18),
              const AppText('AutoBiz v1.0.0 · Shop, travel & pay smarter', v: TV.xs, muted: true, center: true),
            ]),
          ),
        ),
        ]),
      ),
    );
  }
}
