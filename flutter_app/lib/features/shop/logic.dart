/// Marketplace helpers — port of mobile_app/src/features/shop/logic.ts (web window.SHOP).
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../data/catalog.dart';
import '../../store/app_store.dart';
import '../../ui/overlay.dart';

const states = ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'];
const _zone2 = ['Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti', 'FCT - Abuja', 'Rivers', 'Edo', 'Delta', 'Anambra', 'Enugu'];
const zones = {
  1: (fee: 2000.0, days: [1, 2]),
  2: (fee: 3000.0, days: [2, 4]),
  3: (fee: 4500.0, days: [3, 6]),
};
const expressFee = 3500.0;
const pickupHubs = {
  1: ['AutoBiz Hub — Ikeja City Mall', 'AutoBiz Hub — Lekki Phase 1', 'AutoBiz Hub — Yaba Tech Plaza'],
  2: ['AutoBiz Hub — City Centre', 'Partner Pickup — Shoprite Mall'],
  3: ['Partner Pickup — GIG Logistics office'],
};
int zoneOf(String state) => state == 'Lagos' ? 1 : _zone2.contains(state) ? 2 : 3;
List<String> hubsFor(String state) => pickupHubs[zoneOf(state)]!;

const _colorNames = {
  '#1b1f3b': 'Midnight', '#a3b8ff': 'Sky Blue', '#e9e3d5': 'Cream', '#3b3b3d': 'Black Titanium', '#c9c2b6': 'Natural Titanium', '#f2f2f2': 'White Titanium',
  '#111': 'Black', '#6ad': 'Ocean Blue', '#a8e': 'Lavender', '#2e3440': 'Midnight', '#d8dee9': 'Starlight', '#e8e4dc': 'Silver', '#fff': 'White',
  '#e64980': 'Rose', '#f59f00': 'Mustard', '#12b886': 'Emerald', '#8b5e3c': 'Brown', '#c0c0c0': 'Silver', '#ff8fab': 'Pink',
};
String colorName(String? hex) => hex == null || hex.isEmpty ? '' : (_colorNames[hex.toLowerCase()] ?? hex);
Color swatch(String hex) {
  var h = hex.replaceAll('#', '');
  if (h.length == 3) h = h.split('').map((x) => x + x).join();
  return Color(int.parse('FF$h', radix: 16));
}

int disc(Product p) => p.oldPrice != null && p.oldPrice! > p.price ? ((1 - p.price / p.oldPrice!) * 100).round() : 0;
String catName(String id) => categoryById(id)?.name ?? id;

const shortDescs = {
  'phones': 'Flagship performance, all-day battery and a stunning display — with official warranty.',
  'electronics': 'Genuine, brand-new and covered by manufacturer warranty. Shipped sealed.',
  'fashion': 'Quality materials, comfortable fit and made to turn heads at any occasion.',
  'home': 'Built for Nigerian homes — durable, energy efficient and easy to use.',
  'beauty': 'Dermatologically tested, cruelty free and loved by thousands of customers.',
  'groceries': 'Fresh stock from trusted distributors, sealed and delivered to your door.',
  'gaming': 'Next-level play with genuine hardware and full seller warranty.',
  'digital': 'Code delivered instantly to your orders page and email after payment.',
};
String shortDesc(Product p) => shortDescs[p.category] ?? catName(p.category);

const features = {
  'phones': ['Super-bright AMOLED display for crisp viewing outdoors', 'All-day battery with fast charging support', 'Pro-grade camera system for low-light shots', 'Official Nigerian warranty & genuine accessories'],
  'electronics': ['Genuine brand-new unit, sealed in original box', 'Covered by manufacturer warranty', 'Energy efficient and built to last', 'Free technical support from the seller'],
  'fashion': ['Premium fabric, colour-fast and breathable', 'Tailored fit — check size guide before ordering', 'Hand-finished by Nigerian artisans', 'Easy 7-day exchange for size issues'],
  'home': ['Designed for Nigerian voltage & power conditions', 'Durable build with easy-clean surfaces', 'Energy-saving operation', 'Seller warranty included'],
  'beauty': ['Dermatologically tested ingredients', 'Suitable for all skin types', 'Cruelty free, no harsh chemicals', 'Sealed for hygiene'],
  'groceries': ['Fresh stock from trusted distributors', 'Sealed, tamper-proof packaging', 'Long shelf life', 'Bulk-friendly pricing'],
  'gaming': ['Genuine hardware from authorised distributors', 'Ultra-low latency for competitive play', 'Plug & play setup', 'Full seller warranty'],
  'digital': ['Code delivered instantly after payment', 'Redeemable on the official platform', 'Step-by-step redemption guide included', 'Full refund if the code fails to redeem'],
};

/* ---------------- Cart / wishlist ---------------- */
int inCartQty(String id) => store.cart.where((l) => l.id == id).fold(0, (a, l) => a + l.qty);

CartLine lineFor(Product p, String? color) =>
    CartLine(id: p.id, name: p.name, price: p.price, icon: p.icon, tone: p.tone, qty: 0, color: color, seller: p.seller, digital: p.digital);

int _existingQty(String id, String? color) {
  for (final l in store.cart) { if (l.id == id && l.color == color) return l.qty; }
  return 0;
}

/// Adds to cart honouring stock. Returns false if nothing could be added.
bool addToCart(String id, {int qty = 1, String? color, bool useDefaultColor = true, bool silent = false, VoidCallback? onView}) {
  final p = productById(id);
  if (p == null) return false;
  final left = p.stock - inCartQty(id);
  if (left <= 0) {
    toast('You already have the maximum available (${p.stock}) in your cart', type: ToastType.warning);
    return false;
  }
  final c = color ?? (useDefaultColor && p.colors != null && p.colors!.isNotEmpty ? p.colors!.first : null);
  store.cartAdd(lineFor(p, c), math.min(qty, left), _existingQty(id, c) + left);
  if (!silent) toast('**${p.name}** added to cart', actionLabel: onView != null ? 'View cart' : null, onAction: onView);
  return true;
}

bool toggleWish(String id, [VoidCallback? onView]) {
  final p = productById(id);
  final added = store.wishlistToggle(id);
  if (added) {
    toast('**${p?.name}** saved to your wishlist', actionLabel: onView != null ? 'View wishlist' : null, onAction: onView);
  } else {
    toast('Removed from wishlist', type: ToastType.info);
  }
  return added;
}

/* ---------------- Delivery ---------------- */
bool allFree(List<CartLine> items) => items.every((l) { final p = productById(l.id); return l.digital || (p?.freeShipping ?? false) || (p?.digital ?? false); });
bool allDigital(List<CartLine> items) => items.isNotEmpty && items.every((l) => l.digital);
bool anyDigital(List<CartLine> items) => items.any((l) => l.digital);

double deliveryFee(List<CartLine> items, String method, String state) {
  if (items.isEmpty || allDigital(items) || method == 'pickup' || method == 'digital') return 0;
  final base = allFree(items) ? 0.0 : zones[zoneOf(state)]!.fee;
  return method == 'express' ? base + expressFee : base;
}

DateTime _addBusinessDays(int n) {
  var d = DateTime.now();
  var left = n;
  while (left > 0) {
    d = DateTime(d.year, d.month, d.day + 1, d.hour, d.minute);
    if (d.weekday != DateTime.sunday) left--;
  }
  return d;
}

String _etaFmt(DateTime d) => '${f.days[d.weekday % 7]} ${d.day} ${f.months[d.month - 1]}';

String eta(String state, String method) {
  if (method == 'digital') return 'Instant';
  final ab = zones[zoneOf(state)]!.days;
  final a = ab[0], b = ab[1];
  final r = method == 'express' ? [1, math.max(1, a)] : method == 'pickup' ? [a, (b - 1) == 0 ? a : b - 1] : [a, b];
  final x = _etaFmt(_addBusinessDays(r[0])), y = _etaFmt(_addBusinessDays(r[1]));
  return x == y ? x : '$x – $y';
}

/// single-product delivery fee estimate (product page)
double productDeliveryFee(Product p, String method, String state) {
  if (p.digital || method == 'pickup') return 0;
  final base = p.freeShipping ? 0.0 : zones[zoneOf(state)]!.fee;
  return method == 'express' ? base + expressFee : base;
}

const methodLabel = {'standard': 'Standard delivery', 'express': 'Express delivery', 'pickup': 'Pickup station', 'digital': 'Instant digital delivery'};

/* ---------------- Orders ---------------- */
const orderStatus = {
  'processing': (label: 'Processing', tone: 'warning', icon: 'bi-hourglass-split'),
  'shipped': (label: 'Shipped', tone: 'primary', icon: 'bi-truck'),
  'delivered': (label: 'Delivered', tone: 'success', icon: 'bi-check2-circle'),
  'cancelled': (label: 'Cancelled', tone: 'danger', icon: 'bi-x-circle'),
};

String voucherCode(String orderId, String itemId, int n) {
  final r = seeded('$orderId$itemId$n');
  final b = StringBuffer();
  for (var i = 0; i < 16; i++) {
    if (i > 0 && i % 4 == 0) b.write('-');
    b.write(codeAlphabet[(r() * codeAlphabet.length).floor()]);
  }
  return b.toString();
}

List<TimelineStep> buildTimeline(String method) {
  final now = f.now();
  if (method == 'digital') {
    return [
      TimelineStep(key: 'placed', label: 'Order placed', note: 'Payment received', done: true, date: now),
      TimelineStep(key: 'confirmed', label: 'Code generated', note: 'Vouchers issued by supplier'),
      TimelineStep(key: 'delivered', label: 'Delivered', note: 'Sent to your orders page & email'),
    ];
  }
  final pickup = method == 'pickup';
  return [
    TimelineStep(key: 'placed', label: 'Order placed', note: "We've received your order", done: true, date: now),
    TimelineStep(key: 'confirmed', label: 'Confirmed by seller', note: 'Seller is packing your items'),
    TimelineStep(key: 'shipped', label: 'Shipped', note: pickup ? 'On the way to pickup hub' : 'Handed to logistics partner'),
    TimelineStep(key: 'out', label: pickup ? 'Ready for pickup' : 'Out for delivery', note: pickup ? 'Bring your order ID' : 'Rider is on the way'),
    TimelineStep(key: 'delivered', label: pickup ? 'Picked up' : 'Delivered', note: 'Enjoy your purchase!'),
  ];
}

bool isDigitalOrder(Order o) => o.items.any((i) => i.digital);
bool canCancel(Order o) => o.status == 'processing' && !isDigitalOrder(o);
int orderUnits(Order o) => o.items.fold(0, (a, i) => a + i.qty);

/// Demo auto-progression of orders (main.dart calls this on launch and every 15s).
void advanceOrders() {
  if (store.orders.isEmpty) return;
  final now = f.now();
  var changed = false;
  for (final o in store.orders) {
    if (o.status == 'cancelled' || o.status == 'delivered') continue;
    final age = now - o.date;
    bool mark(String key, num offset) {
      for (final st in o.timeline) {
        if (st.key == key && !st.done) { st.done = true; st.date = o.date + offset.round(); changed = true; return true; }
      }
      return false;
    }
    if (o.method == 'digital') {
      if (age >= 20000) {
        mark('confirmed', 5000);
        mark('delivered', 20000);
        if (o.status != 'delivered') { o.status = 'delivered'; o.paid = true; changed = true; }
      }
    } else {
      final speed = o.method == 'express' ? 0.5 : 1.0;
      if (age >= 30000) mark('confirmed', 30000);
      if (age >= 180000 * speed) { mark('shipped', 180000 * speed); if (o.status == 'processing') { o.status = 'shipped'; changed = true; } }
      if (age >= 480000 * speed) mark('out', 480000 * speed);
      if (age >= 900000 * speed) {
        mark('delivered', 900000 * speed);
        if (o.status != 'delivered') { o.status = 'delivered'; o.paid = true; changed = true; }
      }
    }
  }
  if (changed) store.commit();
}

/// Re-add an order's items to the cart, capped by stock.
void reorder(Order o, [VoidCallback? onView]) {
  var added = 0;
  var limited = false;
  for (final it in o.items) {
    final p = productById(it.id);
    if (p == null) continue;
    final left = p.stock - inCartQty(p.id);
    final q = math.min(it.qty, left);
    if (q < it.qty) limited = true;
    if (q <= 0) continue;
    store.cartAdd(lineFor(p, it.color), q, _existingQty(p.id, it.color) + q);
    added += q;
  }
  if (added == 0) { toast('These items are already in your cart at maximum stock', type: ToastType.warning); return; }
  toast('$added item${added > 1 ? 's' : ''} added to your cart${limited ? ' (limited by stock)' : ''}', actionLabel: onView != null ? 'Go to cart' : null, onAction: onView);
}

/* ---------------- Reviews / seller (seeded) ---------------- */
const _good = [
  ['Exactly as described', 'Original product, well packaged and delivery was faster than I expected. Will buy again.'],
  ['Worth every naira', 'Compared prices across 3 stores and this was the best deal. Seller was responsive too.'],
  ['Very impressed', 'Quality is top notch. Paid from my AutoBiz wallet and got it in 2 days.'],
  ['Great value', 'Does everything I need. The discount made it a no-brainer.'],
  ['Fast delivery', 'Rider called before arriving, item was sealed. 10/10 experience.'],
];
const _mid = [['Good but…', 'Product is good, but delivery took a day longer than estimated.'], ['Decent', 'Works fine. Packaging could be better but item was intact.']];
const _low = [['Not for me', "Item is okay but didn't meet my expectations. Customer support helped with a return."]];
const _rnames = ['Chinedu O.', 'Aisha B.', 'Tunde A.', 'Ngozi E.', 'Ibrahim M.', 'Funke L.', 'Emeka N.', 'Zainab Y.', 'Segun F.', 'Blessing K.', 'Kelechi U.', 'Halima S.'];
const _cities = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Enugu', 'Kano', 'Benin City', 'Owerri'];

class Review {
  final int id, stars, date, helpful;
  final String title, body, name, city;
  final String? variant;
  const Review({required this.id, required this.stars, required this.title, required this.body, required this.name, required this.city, required this.date, required this.helpful, this.variant});
}

List<Review> genReviews(Product p) {
  final r = seeded(p.id);
  final out = <Review>[];
  for (var i = 0; i < 8; i++) {
    final x = r();
    final stars = x < 0.62 ? 5 : x < 0.86 ? 4 : x < 0.95 ? 3 : 2;
    final pool = stars >= 4 ? _good : stars == 3 ? _mid : _low;
    final tb = pool[(r() * pool.length).floor()];
    final name = _rnames[(r() * _rnames.length).floor()];
    final city = _cities[(r() * _cities.length).floor()];
    final days = (r() * 60 + i * 3).floor();
    final helpful = (r() * 40).floor();
    final variant = p.colors != null ? colorName(p.colors![(r() * p.colors!.length).floor()]) : null;
    out.add(Review(id: i, stars: stars, title: tb[0], body: tb[1], name: name, city: city, date: f.now() - days * 86400000, helpful: helpful, variant: variant));
  }
  out.sort((a, b) => b.date.compareTo(a.date));
  return out;
}

List<({int k, int count})> ratingBreakdown(Product p) {
  final w = [5, 4, 3, 2, 1].map((k) => math.exp(-(5 - k) * (5.25 - p.rating) * 1.9)).toList();
  final sum = w.fold(0.0, (a, b) => a + b);
  return [for (var i = 0; i < 5; i++) (k: 5 - i, count: (p.reviews * w[i] / sum).round())];
}

({String rating, int score, int followers, int years, int items}) sellerStats(String seller) {
  final r = seeded(seller);
  return (
    rating: (4.3 + r() * 0.6).toStringAsFixed(1),
    score: 86 + (r() * 13).floor(),
    followers: 2 + (r() * 80).floor(),
    years: 1 + (r() * 6).floor(),
    items: products.where((x) => x.seller == seller).length,
  );
}

int flashClaimed(String id) => 40 + (seeded('${id}f')() * 55).floor();

String warranty(Product p) {
  if (p.digital) return 'Code validity guaranteed';
  if (p.category == 'phones' || p.category == 'electronics') return '12 months manufacturer';
  if (p.category == 'gaming') return '12 months seller';
  if (p.category == 'home') return '6 months seller';
  return '7-day return policy';
}

/// 1,284 style grouping used in rating counts
String grouped(int n) => f.numFmt(n);
