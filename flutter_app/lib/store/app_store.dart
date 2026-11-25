/// ==========================================================================
/// AutoBiz — persistent app store (ChangeNotifier + SharedPreferences)
/// The demo "backend", mirroring mobile_app/src/store/index.ts.
///
///   final s = context.watch<AppStore>();   // rebuild on change
///   store.debit(1000, TxInput(type: 'airtime', title: 'MTN Airtime'));  // imperative (global `store`)
///   store.mutate(() => order.status = 'shipped');   // mutate models in place + persist
/// ==========================================================================
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/format.dart' as f;
import 'models.dart';

export 'models.dart';

const _key = 'autobiz_v2';

/// Global singleton (set in main). Use for imperative access outside widgets.
late final AppStore store;

class AppStore extends ChangeNotifier {
  late User user;
  double balance = 0; // NGN wallet
  double usd = 0; // USD wallet
  List<Tx> transactions = [];
  List<CartLine> cart = [];
  List<String> wishlist = [];
  List<Order> orders = [];
  List<Esim> esims = [];
  List<Booking> bookings = [];
  List<VirtualCard> cards = [];
  List<Trade> trades = [];
  List<AppNotification> notifications = [];
  List<Beneficiary> beneficiaries = [];
  List<BankAccount> bankAccounts = [];
  List<Session> sessions = [];
  Settings settings = Settings();
  AuthState auth = AuthState();
  /// coupon applied in the cart
  String? coupon;

  SharedPreferences? _prefs;
  Timer? _saveTimer;

  AppStore() { _applyDefaults(keepAuth: false); }

  /* ---------------- defaults ---------------- */
  void _applyDefaults({required bool keepAuth}) {
    final now = f.now();
    const h = 3600000;
    user = User(firstName: 'Adaeze', lastName: 'Okafor', email: 'adaeze@example.com', phone: '08031234567', tier: 'Tier 2', username: 'adaeze');
    balance = 285750.5;
    usd = 120;
    transactions = [
      Tx(id: 'TX${now - 2 * h}', type: 'airtime', title: 'MTN Airtime', subtitle: '08031234567', amount: 2000, direction: 'out', status: 'success', icon: 'bi-phone', tone: 'warning', date: now - 2 * h),
      Tx(id: 'TX${now - 5 * h}', type: 'funding', title: 'Wallet Funding', subtitle: 'Bank transfer · Wema', amount: 150000, direction: 'in', status: 'success', icon: 'bi-arrow-down-left', tone: 'success', date: now - 5 * h),
      Tx(id: 'TX${now - 26 * h}', type: 'giftcard', title: 'Steam Card Sold', subtitle: '\$100 · E-code', amount: 116500, direction: 'in', status: 'success', icon: 'bi-gift', tone: 'pink', date: now - 26 * h),
      Tx(id: 'TX${now - 30 * h}', type: 'data', title: 'Airtel Data 5GB', subtitle: '08021234567', amount: 1425, direction: 'out', status: 'success', icon: 'bi-wifi', tone: 'primary', date: now - 30 * h),
      Tx(id: 'TX${now - 50 * h}', type: 'electricity', title: 'Ikeja Electric Token', subtitle: 'Meter 4502 1123 990', amount: 10000, direction: 'out', status: 'success', icon: 'bi-lightning-charge', tone: 'warning', date: now - 50 * h),
      Tx(id: 'TX${now - 75 * h}', type: 'shop', title: 'Marketplace Order', subtitle: 'Oraimo FreePods 4', amount: 32500, direction: 'out', status: 'pending', icon: 'bi-bag', tone: 'violet', date: now - 75 * h),
      Tx(id: 'TX${now - 120 * h}', type: 'cable', title: 'DStv Compact', subtitle: 'IUC 7023 4411 09', amount: 19000, direction: 'out', status: 'failed', icon: 'bi-tv', tone: 'cyan', date: now - 120 * h),
    ];
    cart = [];
    wishlist = [];
    orders = [];
    esims = [];
    bookings = [];
    cards = [];
    trades = [];
    notifications = [
      AppNotification(id: 1, icon: 'bi-gift', tone: 'pink', title: 'Gift card rates are up', body: 'Apple & Steam cards now trade at up to ₦1,210/\$', time: now - h),
      AppNotification(id: 2, icon: 'bi-airplane', tone: 'cyan', title: 'Fly Lagos → Dubai from ₦890k', body: 'Limited Emirates fares this week only.', time: now - 24 * h),
      AppNotification(id: 3, icon: 'bi-sim', tone: 'violet', title: 'Travel with eSIM', body: 'Stay connected in 120+ countries. No roaming fees.', time: now - 48 * h, read: true),
    ];
    beneficiaries = [];
    bankAccounts = [BankAccount(id: 'BA1', bank: 'GTBank', number: '0123456789', name: 'ADAEZE OKAFOR')];
    sessions = [
      Session(id: 's1', device: 'Android phone · AutoBiz app', loc: 'Lagos, Nigeria', ip: '102.89.40.7', last: now, icon: 'bi-phone', current: true),
      Session(id: 's2', device: 'MacBook Pro · Chrome', loc: 'Lagos, Nigeria', ip: '102.89.34.12', last: now - 2 * h, icon: 'bi-laptop'),
      Session(id: 's3', device: 'Windows PC · Edge', loc: 'Abuja, Nigeria', ip: '197.210.55.81', last: now - 72 * h, icon: 'bi-pc-display'),
    ];
    settings = Settings();
    if (!keepAuth) auth = AuthState();
    coupon = null;
  }

  /* ---------------- persistence ---------------- */
  Future<void> load() async {
    _prefs = await SharedPreferences.getInstance();
    final raw = _prefs!.getString(_key);
    if (raw == null) return;
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      List<T> l<T>(String k, T Function(Json) fn) => j[k] is List ? (j[k] as List).whereType<Map>().map((e) => fn(Json.from(e))).toList() : <T>[];
      if (j['user'] is Map) user = User.fromJson(Json.from(j['user']));
      final w = (j['wallet'] as Map?) ?? {};
      balance = (w['balance'] as num?)?.toDouble() ?? balance;
      usd = (w['usd'] as num?)?.toDouble() ?? usd;
      if (j.containsKey('transactions')) transactions = l('transactions', Tx.fromJson);
      cart = l('cart', CartLine.fromJson);
      wishlist = (j['wishlist'] as List?)?.whereType<String>().toList() ?? [];
      orders = l('orders', Order.fromJson);
      esims = l('esims', Esim.fromJson);
      bookings = l('bookings', Booking.fromJson);
      cards = l('cards', VirtualCard.fromJson);
      trades = l('trades', Trade.fromJson);
      if (j.containsKey('notifications')) notifications = l('notifications', AppNotification.fromJson);
      beneficiaries = l('beneficiaries', Beneficiary.fromJson);
      if (j.containsKey('bankAccounts')) bankAccounts = l('bankAccounts', BankAccount.fromJson);
      if (j.containsKey('sessions')) sessions = l('sessions', Session.fromJson);
      if (j['settings'] is Map) settings = Settings.fromJson(Json.from(j['settings']));
      if (j['auth'] is Map) auth = AuthState.fromJson(Json.from(j['auth']));
      coupon = j['coupon'] as String?;
    } catch (e) {
      debugPrint('Store load failed, using defaults: $e');
    }
  }

  Json toJson() => {
        'user': user.toJson(),
        'wallet': {'balance': balance, 'usd': usd},
        'transactions': transactions.map((e) => e.toJson()).toList(),
        'cart': cart.map((e) => e.toJson()).toList(),
        'wishlist': wishlist,
        'orders': orders.map((e) => e.toJson()).toList(),
        'esims': esims.map((e) => e.toJson()).toList(),
        'bookings': bookings.map((e) => e.toJson()).toList(),
        'cards': cards.map((e) => e.toJson()).toList(),
        'trades': trades.map((e) => e.toJson()).toList(),
        'notifications': notifications.map((e) => e.toJson()).toList(),
        'beneficiaries': beneficiaries.map((e) => e.toJson()).toList(),
        'bankAccounts': bankAccounts.map((e) => e.toJson()).toList(),
        'sessions': sessions.map((e) => e.toJson()).toList(),
        'settings': settings.toJson(),
        // "Keep me signed in" off → don't persist the session across launches
        'auth': (auth.remember ? auth : AuthState(authed: false, remember: false, onboarded: auth.onboarded)).toJson(),
        'coupon': coupon,
      };

  void _save() {
    _saveTimer?.cancel();
    _saveTimer = Timer(const Duration(milliseconds: 250), () => _prefs?.setString(_key, jsonEncode(toJson())));
  }

  /// Notify listeners + persist. Call after any direct field change.
  void commit() { notifyListeners(); _save(); }

  /// Run a mutation then commit.
  T mutate<T>(T Function() fn) { final r = fn(); commit(); return r; }

  /* ---------------- wallet ---------------- */
  bool get authed => auth.authed;
  /// spendable NGN balance (0 for guests)
  double get spendable => auth.authed ? balance : 0;
  bool canAfford(double amount) => spendable >= amount;
  double _r2(double n) => (n * 100).round() / 100;

  Tx _addTx(TxInput t, double amount, String direction) {
    final tx = Tx(
      id: t.id ?? f.ref('TX'), type: t.type, title: t.title, subtitle: t.subtitle, amount: amount, direction: direction,
      status: t.status ?? 'success', icon: t.icon ?? 'bi-receipt', tone: t.tone ?? 'primary', date: f.now(), ref: t.ref, meta: t.meta,
    );
    transactions.insert(0, tx);
    return tx;
  }

  Tx addTx(TxInput t, double amount, String direction) => mutate(() => _addTx(t, amount, direction));

  /// Debit wallet + add an "out" tx. Returns null when balance is insufficient.
  Tx? debit(double amount, TxInput t) {
    if (!canAfford(amount)) return null;
    balance = _r2(balance - amount);
    return mutate(() => _addTx(t, amount, 'out'));
  }

  /// Credit wallet + add an "in" tx.
  Tx credit(double amount, TxInput t) {
    balance = _r2(balance + amount);
    return mutate(() => _addTx(t, amount, 'in'));
  }

  void notify({required String title, required String body, String icon = 'bi-bell', String tone = 'primary'}) {
    notifications.insert(0, AppNotification(id: f.now() + notifications.length, icon: icon, tone: tone, title: title, body: body, time: f.now()));
    if (notifications.length > 30) notifications = notifications.sublist(0, 30);
    commit();
  }

  void markAllRead() => mutate(() { for (final n in notifications) { n.read = true; } });
  int get unreadCount => notifications.where((n) => !n.read).length;

  /* ---------------- cart / wishlist ---------------- */
  int get cartCount => cart.fold(0, (a, l) => a + l.qty);
  double get cartSubtotal => cart.fold(0.0, (a, l) => a + l.price * l.qty);

  void cartAdd(CartLine line, int qty, int maxQty) => mutate(() {
        final i = cart.indexWhere((l) => l.id == line.id && l.color == line.color);
        if (i > -1) {
          cart[i].qty = (cart[i].qty + qty).clamp(0, maxQty);
        } else {
          cart.add(line.copy()..qty = qty > maxQty ? maxQty : qty);
        }
      });
  void cartSetQty(int index, int qty) => mutate(() { if (qty <= 0) { cart.removeAt(index); } else { cart[index].qty = qty; } });
  CartLine? cartRemove(int index) => index < 0 || index >= cart.length ? null : mutate(() => cart.removeAt(index));
  void cartInsert(CartLine line, [int? index]) => mutate(() => cart.insert((index ?? cart.length).clamp(0, cart.length), line));
  void cartClear() => mutate(() { cart = []; coupon = null; });

  bool wishlistToggle(String id) => mutate(() {
        if (wishlist.contains(id)) { wishlist.remove(id); return false; }
        wishlist.add(id);
        return true;
      });

  /* ---------------- auth ---------------- */
  void login({bool remember = true}) => mutate(() { auth.authed = true; auth.remember = remember; auth.onboarded = true; });
  void logout() => mutate(() => auth.authed = false);
  void completeOnboarding() => mutate(() => auth.onboarded = true);
  void resetDemo() => mutate(() => _applyDefaults(keepAuth: true));
}
