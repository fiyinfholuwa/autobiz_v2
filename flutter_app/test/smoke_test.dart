// Smoke test: opens every route (signed in, light + dark) and fails on any
// build/layout exception (e.g. RenderFlex overflow). Run: flutter test
import 'package:autobiz/main.dart';
import 'package:autobiz/store/app_store.dart';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

const routes = [
  '/', '/shop', '/shop?cat=phones', '/pay', '/pay?tab=data', '/pay?tab=electricity', '/pay?tab=cable', '/pay?tab=betting', '/pay?tab=education',
  '/cards', '/more', '/notifications',
  '/wallet', '/wallet/withdraw', '/wallet/transfer', '/wallet/convert',
  '/transactions', '/transactions/__first__',
  '/product/p1', '/product/p20', '/product/missing', '/cart', '/checkout', '/orders', '/orders?tab=wishlist', '/orders/missing',
  '/esim', '/esim?tab=mine', '/esim?tab=how', '/esim/gh', '/esim/install/missing',
  '/flights', '/flights?view=trips', '/flights/results', '/flights/book', '/flights/ticket/missing',
  '/giftcards', '/giftcards?tab=buy', '/giftcards?tab=rates', '/giftcards?tab=trades', '/giftcards/trade/missing',
  '/cards/create',
  '/settings', '/settings/profile', '/settings/security', '/settings/verification', '/settings/notifications', '/settings/appearance', '/settings/refer', '/settings/help',
  '/onboarding', '/login', '/register', '/forgot-password',
];

Future<void> _loadFont(String family, List<String> files) async {
  final loader = FontLoader(family);
  for (final f in files) {
    final bytes = File(f).readAsBytesSync();
    loader.addFont(Future.value(ByteData.view(bytes.buffer)));
  }
  await loader.load();
}

void main() {
  setUpAll(() async {
    // real fonts so text metrics (and overflow detection) match a device
    await _loadFont('Jakarta', ['400Regular', '500Medium', '600SemiBold', '700Bold', '800ExtraBold'].map((w) => 'assets/fonts/PlusJakartaSans_$w.ttf').toList());
    await _loadFont('Ionicons', ['assets/fonts/Ionicons.ttf']);
    await _loadFont('MaterialCommunityIcons', ['assets/fonts/MaterialCommunityIcons.ttf']);
    await _loadFont('FontAwesome5Brands', ['assets/fonts/FontAwesome5_Brands.ttf']);
  });
  SharedPreferences.setMockInitialValues({});
  store = AppStore();

  for (final mode in ['light', 'dark']) {
    testWidgets('all routes render without exceptions ($mode)', (t) async {
      store.resetDemo();
      store.auth..authed = true..onboarded = true;
      store.settings.themeMode = mode;
      // put something in the cart so cart/checkout render their full UI
      store.cart = [CartLine(id: 'p6', name: 'Oraimo FreePods 4 ANC', price: 32500, icon: 'bi-earbuds', tone: 'success', qty: 2, seller: 'Oraimo Official')];
      await t.binding.setSurfaceSize(const Size(390, 844));
      await t.pumpWidget(ChangeNotifierProvider<AppStore>.value(value: store, child: const AutoBizApp()));
      await t.pump(const Duration(milliseconds: 500));
      final router = GoRouter.of(t.element(find.byType(Navigator).first));

      final failures = <String>[];
      for (var r in routes) {
        if (r.contains('__first__')) r = r.replaceFirst('__first__', Uri.encodeComponent(store.transactions.first.id));
        router.go(r);
        if (const bool.fromEnvironment('VERBOSE')) debugPrint('ROUTE $r');
        for (var i = 0; i < 6; i++) { await t.pump(const Duration(milliseconds: 400)); }
        final e = t.takeException();
        if (e != null) failures.add('$r → ${e.toString().split('\n').take(3).join(' | ')}');
      }
      // tear down (cancels periodic simulator timers)
      await t.pumpWidget(const SizedBox());
      await t.pump(const Duration(seconds: 5));
      expect(failures, isEmpty, reason: failures.join('\n'));
    });
  }
}
