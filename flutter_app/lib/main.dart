import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/theme.dart';
import 'features/giftcards/logic.dart';
import 'features/shop/logic.dart';
import 'router.dart';
import 'store/app_store.dart';
import 'ui/overlay.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  store = AppStore();
  await store.load();
  runApp(ChangeNotifierProvider<AppStore>.value(value: store, child: const AutoBizApp()));
}

class AutoBizApp extends StatefulWidget {
  const AutoBizApp({super.key});
  @override
  State<AutoBizApp> createState() => _AutoBizAppState();
}

class _AutoBizAppState extends State<AutoBizApp> with WidgetsBindingObserver {
  late final GoRouter _router = buildRouter();
  Timer? _trades, _orders;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Background demo "backend" jobs: gift-card trade review + order progression.
    tickTrades();
    advanceOrders();
    _trades = Timer.periodic(const Duration(seconds: 1), (_) => tickTrades());
    _orders = Timer.periodic(const Duration(seconds: 15), (_) => advanceOrders());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) { tickTrades(); advanceOrders(); }
  }

  @override
  void didChangePlatformBrightness() => setState(() {});

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _trades?.cancel();
    _orders?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mode = context.select<AppStore, String>((s) => s.settings.themeMode);
    return MaterialApp.router(
      title: 'AutoBiz',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(lightPalette),
      darkTheme: buildTheme(darkPalette),
      themeMode: mode == 'dark' ? ThemeMode.dark : mode == 'light' ? ThemeMode.light : ThemeMode.system,
      routerConfig: _router,
      builder: (context, child) => Stack(children: [child!, const ToastHost()]),
    );
  }
}
