/// App routes — same paths as the React Native app (mobile_app/src/app).
/// Members-only paths redirect guests to /login?next=… ; first launch → /onboarding.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'core/nav.dart';
import 'screens/auth/forgot_password_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/bills/pay_screen.dart';
import 'screens/cards/card_create_screen.dart';
import 'screens/cards/cards_screen.dart';
import 'screens/esim/esim_install_screen.dart';
import 'screens/esim/esim_plans_screen.dart';
import 'screens/esim/esim_screen.dart';
import 'screens/flights/flight_book_screen.dart';
import 'screens/flights/flight_results_screen.dart';
import 'screens/flights/flight_ticket_screen.dart';
import 'screens/flights/flights_screen.dart';
import 'screens/giftcards/giftcards_screen.dart';
import 'screens/giftcards/trade_detail_screen.dart';
import 'screens/home/home_screen.dart';
import 'screens/more/more_screen.dart';
import 'screens/more/notifications_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/settings/appearance_screen.dart';
import 'screens/settings/help_screen.dart';
import 'screens/settings/notification_prefs_screen.dart';
import 'screens/settings/profile_screen.dart';
import 'screens/settings/refer_screen.dart';
import 'screens/settings/security_screen.dart';
import 'screens/settings/settings_screen.dart';
import 'screens/settings/verification_screen.dart';
import 'screens/shop/cart_screen.dart';
import 'screens/shop/checkout_screen.dart';
import 'screens/shop/order_detail_screen.dart';
import 'screens/shop/orders_screen.dart';
import 'screens/shop/product_screen.dart';
import 'screens/shop/shop_screen.dart';
import 'screens/transactions/transaction_detail_screen.dart';
import 'screens/transactions/transactions_screen.dart';
import 'screens/wallet/convert_screen.dart';
import 'screens/wallet/transfer_screen.dart';
import 'screens/wallet/wallet_screen.dart';
import 'screens/wallet/withdraw_screen.dart';
import 'store/app_store.dart';
import 'ui/tab_shell.dart';

const protectedPrefixes = ['/notifications', '/wallet', '/transactions', '/checkout', '/orders', '/esim/install', '/giftcards/trade', '/flights/ticket', '/cards/create', '/settings'];

/// Open to guests even though they live under a protected prefix (matches the RN app).
const publicPaths = ['/settings/help', '/settings/appearance'];

bool isProtected(String path) => !publicPaths.contains(path) && protectedPrefixes.any((p) => path == p || path.startsWith('$p/'));

GoRouter buildRouter() => GoRouter(
  navigatorKey: rootNavigatorKey,
  initialLocation: '/',
  refreshListenable: store,
  redirect: (context, state) {
    final path = state.uri.path;
    if (!store.auth.onboarded && path == '/') return '/onboarding';
    if (!store.authed && isProtected(path)) return Uri(path: '/login', queryParameters: {'next': state.uri.toString()}).toString();
    return null;
  },
  routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, shell) => TabShell(shell: shell),
      branches: [
      StatefulShellBranch(routes: [GoRoute(path: '/', builder: (c, s) => HomeScreen(q: s.uri.queryParameters))]),
      StatefulShellBranch(routes: [GoRoute(path: '/shop', builder: (c, s) => ShopScreen(q: s.uri.queryParameters))]),
      StatefulShellBranch(routes: [GoRoute(path: '/pay', builder: (c, s) => PayScreen(q: s.uri.queryParameters))]),
      StatefulShellBranch(routes: [GoRoute(path: '/cards', builder: (c, s) => CardsScreen(q: s.uri.queryParameters))]),
      StatefulShellBranch(routes: [GoRoute(path: '/more', builder: (c, s) => MoreScreen(q: s.uri.queryParameters))]),
      ],
    ),
    GoRoute(path: '/onboarding', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => OnboardingScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/login', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => LoginScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/register', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => RegisterScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/forgot-password', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => ForgotPasswordScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/notifications', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => NotificationsScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/wallet', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => WalletScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/wallet/withdraw', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => WithdrawScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/wallet/transfer', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => TransferScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/wallet/convert', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => ConvertScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/transactions', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => TransactionsScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/transactions/:id', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => TransactionDetailScreen(id: s.pathParameters['id']!, q: s.uri.queryParameters)),
    GoRoute(path: '/product/:id', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => ProductScreen(id: s.pathParameters['id']!, q: s.uri.queryParameters)),
    GoRoute(path: '/cart', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => CartScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/checkout', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => CheckoutScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/orders', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => OrdersScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/orders/:id', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => OrderDetailScreen(id: s.pathParameters['id']!, q: s.uri.queryParameters)),
    GoRoute(path: '/esim', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => EsimScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/esim/install/:id', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => EsimInstallScreen(id: s.pathParameters['id']!, q: s.uri.queryParameters)),
    GoRoute(path: '/esim/:id', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => EsimPlansScreen(id: s.pathParameters['id']!, q: s.uri.queryParameters)),
    GoRoute(path: '/flights', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => FlightsScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/flights/results', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => FlightResultsScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/flights/book', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => FlightBookScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/flights/ticket/:id', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => FlightTicketScreen(id: s.pathParameters['id']!, q: s.uri.queryParameters)),
    GoRoute(path: '/giftcards', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => GiftcardsScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/giftcards/trade/:id', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => TradeDetailScreen(id: s.pathParameters['id']!, q: s.uri.queryParameters)),
    GoRoute(path: '/cards/create', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => CardCreateScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/settings', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => SettingsScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/settings/profile', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => ProfileScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/settings/security', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => SecurityScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/settings/verification', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => VerificationScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/settings/notifications', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => NotificationPrefsScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/settings/appearance', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => AppearanceScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/settings/refer', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => ReferScreen(q: s.uri.queryParameters)),
    GoRoute(path: '/settings/help', parentNavigatorKey: rootNavigatorKey, builder: (c, s) => HelpScreen(q: s.uri.queryParameters)),
  ],
  errorBuilder: (c, s) => const Scaffold(body: Center(child: Text('Page not found'))),
);
