/// Domain models — mirror mobile_app/src/store/types.ts. Fields are mutable: mutate inside
/// `store.mutate(() { ... })` so listeners are notified and the change is persisted.
library;

typedef Json = Map<String, dynamic>;

double _d(Object? v, [double f = 0]) => v is num ? v.toDouble() : f;
int _i(Object? v, [int f = 0]) => v is num ? v.toInt() : f;
int? _in(Object? v) => v is num ? v.toInt() : null;
String _s(Object? v, [String f = '']) => v is String ? v : f;
String? _sn(Object? v) => v is String ? v : null;
bool _b(Object? v, [bool f = false]) => v is bool ? v : f;
List<T> _l<T>(Object? v, T Function(Json) f) => v is List ? v.whereType<Map>().map((e) => f(Json.from(e))).toList() : <T>[];
List<String> _ls(Object? v) => v is List ? v.whereType<String>().toList() : <String>[];
Map<String, String> _ms(Object? v) => v is Map ? v.map((k, x) => MapEntry('$k', '$x')) : <String, String>{};

/* ---------------- Transactions ---------------- */
class Tx {
  String id, type, title, icon, tone;
  String? subtitle, ref, reported;
  double amount;
  /// 'in' | 'out'
  String direction;
  /// 'success' | 'pending' | 'failed'
  String status;
  int date;
  Map<String, String> meta;
  Tx({required this.id, required this.type, required this.title, this.subtitle, required this.amount, required this.direction, this.status = 'success', this.icon = 'bi-receipt', this.tone = 'primary', required this.date, this.ref, Map<String, String>? meta, this.reported}) : meta = meta ?? {};
  factory Tx.fromJson(Json j) => Tx(id: _s(j['id']), type: _s(j['type']), title: _s(j['title']), subtitle: _sn(j['subtitle']), amount: _d(j['amount']), direction: _s(j['direction'], 'out'), status: _s(j['status'], 'success'), icon: _s(j['icon'], 'bi-receipt'), tone: _s(j['tone'], 'primary'), date: _i(j['date']), ref: _sn(j['ref']), meta: _ms(j['meta']), reported: _sn(j['reported']));
  Json toJson() => {'id': id, 'type': type, 'title': title, 'subtitle': subtitle, 'amount': amount, 'direction': direction, 'status': status, 'icon': icon, 'tone': tone, 'date': date, 'ref': ref, 'meta': meta, 'reported': reported};
}

/// Input for debit/credit/addTx (amount & direction supplied separately).
class TxInput {
  final String type, title;
  final String? subtitle, ref, icon, tone, status, id;
  final Map<String, String>? meta;
  const TxInput({required this.type, required this.title, this.subtitle, this.ref, this.icon, this.tone, this.status, this.meta, this.id});
}

/* ---------------- User / notifications ---------------- */
class User {
  String firstName, lastName, email, phone, tier, username;
  String? referral;
  int? joined;
  bool bvnVerified, ninVerified;
  User({required this.firstName, required this.lastName, required this.email, required this.phone, this.tier = 'Tier 1', required this.username, this.referral, this.joined, this.bvnVerified = false, this.ninVerified = false});
  String get fullName => '$firstName $lastName';
  factory User.fromJson(Json j) => User(firstName: _s(j['firstName']), lastName: _s(j['lastName']), email: _s(j['email']), phone: _s(j['phone']), tier: _s(j['tier'], 'Tier 1'), username: _s(j['username']), referral: _sn(j['referral']), joined: _in(j['joined']), bvnVerified: _b(j['bvnVerified']), ninVerified: _b(j['ninVerified']));
  Json toJson() => {'firstName': firstName, 'lastName': lastName, 'email': email, 'phone': phone, 'tier': tier, 'username': username, 'referral': referral, 'joined': joined, 'bvnVerified': bvnVerified, 'ninVerified': ninVerified};
}

class AppNotification {
  int id, time;
  String icon, tone, title, body;
  bool read;
  AppNotification({required this.id, this.icon = 'bi-bell', this.tone = 'primary', required this.title, required this.body, required this.time, this.read = false});
  factory AppNotification.fromJson(Json j) => AppNotification(id: _i(j['id']), icon: _s(j['icon'], 'bi-bell'), tone: _s(j['tone'], 'primary'), title: _s(j['title']), body: _s(j['body']), time: _i(j['time']), read: _b(j['read']));
  Json toJson() => {'id': id, 'icon': icon, 'tone': tone, 'title': title, 'body': body, 'time': time, 'read': read};
}

/* ---------------- Shop ---------------- */
class CartLine {
  String id, name, icon, tone, seller;
  double price;
  int qty;
  String? color;
  bool digital;
  List<String>? codes;
  CartLine({required this.id, required this.name, required this.price, required this.icon, required this.tone, required this.qty, this.color, required this.seller, this.digital = false, this.codes});
  CartLine copy() => CartLine(id: id, name: name, price: price, icon: icon, tone: tone, qty: qty, color: color, seller: seller, digital: digital, codes: codes == null ? null : [...codes!]);
  factory CartLine.fromJson(Json j) => CartLine(id: _s(j['id']), name: _s(j['name']), price: _d(j['price']), icon: _s(j['icon']), tone: _s(j['tone']), qty: _i(j['qty'], 1), color: _sn(j['color']), seller: _s(j['seller']), digital: _b(j['digital']), codes: j['codes'] is List ? _ls(j['codes']) : null);
  Json toJson() => {'id': id, 'name': name, 'price': price, 'icon': icon, 'tone': tone, 'qty': qty, 'color': color, 'seller': seller, 'digital': digital, if (codes != null) 'codes': codes};
}

class TimelineStep {
  String key, label, note;
  bool done;
  int? date;
  TimelineStep({required this.key, required this.label, required this.note, this.done = false, this.date});
  factory TimelineStep.fromJson(Json j) => TimelineStep(key: _s(j['key']), label: _s(j['label']), note: _s(j['note']), done: _b(j['done']), date: _in(j['date']));
  Json toJson() => {'key': key, 'label': label, 'note': note, 'done': done, 'date': date};
}

class Address {
  String name, phone, email, state, city, street, landmark;
  Address({this.name = '', this.phone = '', this.email = '', this.state = 'Lagos', this.city = '', this.street = '', this.landmark = ''});
  Address copy() => Address(name: name, phone: phone, email: email, state: state, city: city, street: street, landmark: landmark);
  factory Address.fromJson(Json j) => Address(name: _s(j['name']), phone: _s(j['phone']), email: _s(j['email']), state: _s(j['state'], 'Lagos'), city: _s(j['city']), street: _s(j['street']), landmark: _s(j['landmark']));
  Json toJson() => {'name': name, 'phone': phone, 'email': email, 'state': state, 'city': city, 'street': street, 'landmark': landmark};
}

class Order {
  String id;
  int date;
  /// processing | shipped | delivered | cancelled
  String status;
  List<CartLine> items;
  double subtotal, discount, deliveryFee, total;
  String? coupon, pickupHub, txId, cancelReason, refundTxId;
  Address address;
  /// standard | express | pickup | digital
  String method;
  /// wallet | pod
  String payment;
  bool paid, refunded;
  String eta;
  List<TimelineStep> timeline;
  Order({required this.id, required this.date, required this.status, required this.items, required this.subtotal, required this.discount, this.coupon, required this.deliveryFee, required this.total, required this.address, required this.method, this.pickupHub, required this.payment, required this.paid, this.txId, required this.eta, required this.timeline, this.cancelReason, this.refunded = false, this.refundTxId});
  factory Order.fromJson(Json j) => Order(id: _s(j['id']), date: _i(j['date']), status: _s(j['status'], 'processing'), items: _l(j['items'], CartLine.fromJson), subtotal: _d(j['subtotal']), discount: _d(j['discount']), coupon: _sn(j['coupon']), deliveryFee: _d(j['deliveryFee']), total: _d(j['total']), address: Address.fromJson(Json.from((j['address'] as Map?) ?? {})), method: _s(j['method'], 'standard'), pickupHub: _sn(j['pickupHub']), payment: _s(j['payment'], 'wallet'), paid: _b(j['paid']), txId: _sn(j['txId']), eta: _s(j['eta']), timeline: _l(j['timeline'], TimelineStep.fromJson), cancelReason: _sn(j['cancelReason']), refunded: _b(j['refunded']), refundTxId: _sn(j['refundTxId']));
  Json toJson() => {'id': id, 'date': date, 'status': status, 'items': items.map((e) => e.toJson()).toList(), 'subtotal': subtotal, 'discount': discount, 'coupon': coupon, 'deliveryFee': deliveryFee, 'total': total, 'address': address.toJson(), 'method': method, 'pickupHub': pickupHub, 'payment': payment, 'paid': paid, 'txId': txId, 'eta': eta, 'timeline': timeline.map((e) => e.toJson()).toList(), 'cancelReason': cancelReason, 'refunded': refunded, 'refundTxId': refundTxId};
}

/* ---------------- eSIM ---------------- */
class EsimTopup {
  String data; double gb; int days; double price; int at;
  EsimTopup({required this.data, required this.gb, required this.days, required this.price, required this.at});
  factory EsimTopup.fromJson(Json j) => EsimTopup(data: _s(j['data']), gb: _d(j['gb']), days: _i(j['days']), price: _d(j['price']), at: _i(j['at']));
  Json toJson() => {'data': data, 'gb': gb, 'days': days, 'price': price, 'at': at};
}

class Esim {
  String id, iccid, country, code, plan, data, txId, activationCode;
  String? icon;
  bool regional, archived;
  double gb, price, usd;
  int days, purchasedAt;
  int? activatedAt, expiresAt;
  /// 'Not installed' | 'Active' | 'Expired'
  String status;
  List<EsimTopup> topups;
  Esim({required this.id, required this.iccid, required this.country, required this.code, this.regional = false, this.icon, required this.plan, required this.data, required this.gb, required this.days, required this.price, required this.usd, this.status = 'Not installed', required this.purchasedAt, this.activatedAt, this.expiresAt, List<EsimTopup>? topups, this.archived = false, required this.txId, required this.activationCode}) : topups = topups ?? [];
  factory Esim.fromJson(Json j) => Esim(id: _s(j['id']), iccid: _s(j['iccid']), country: _s(j['country']), code: _s(j['code']), regional: _b(j['regional']), icon: _sn(j['icon']), plan: _s(j['plan']), data: _s(j['data']), gb: _d(j['gb']), days: _i(j['days']), price: _d(j['price']), usd: _d(j['usd']), status: _s(j['status'], 'Not installed'), purchasedAt: _i(j['purchasedAt']), activatedAt: _in(j['activatedAt']), expiresAt: _in(j['expiresAt']), topups: _l(j['topups'], EsimTopup.fromJson), archived: _b(j['archived']), txId: _s(j['txId']), activationCode: _s(j['activationCode']));
  Json toJson() => {'id': id, 'iccid': iccid, 'country': country, 'code': code, 'regional': regional, 'icon': icon, 'plan': plan, 'data': data, 'gb': gb, 'days': days, 'price': price, 'usd': usd, 'status': status, 'purchasedAt': purchasedAt, 'activatedAt': activatedAt, 'expiresAt': expiresAt, 'topups': topups.map((e) => e.toJson()).toList(), 'archived': archived, 'txId': txId, 'activationCode': activationCode};
}

/* ---------------- Flights ---------------- */
class FlightSegment {
  String from, to, fromCity, toCity, flightNo; int dep, arr, mins;
  FlightSegment({required this.from, required this.to, required this.fromCity, required this.toCity, required this.dep, required this.arr, required this.mins, required this.flightNo});
  factory FlightSegment.fromJson(Json j) => FlightSegment(from: _s(j['from']), to: _s(j['to']), fromCity: _s(j['fromCity']), toCity: _s(j['toCity']), dep: _i(j['dep']), arr: _i(j['arr']), mins: _i(j['mins']), flightNo: _s(j['flightNo']));
  Json toJson() => {'from': from, 'to': to, 'fromCity': fromCity, 'toCity': toCity, 'dep': dep, 'arr': arr, 'mins': mins, 'flightNo': flightNo};
}

class Flight {
  String id, airline, flightNo, from, to, date;
  int dep, arr, duration, stops, layover, seatsLeft;
  /// {code, city} of the connection airport, or null for direct flights
  ({String code, String city})? via;
  List<FlightSegment> segments;
  double price;
  bool refundable, domestic;
  Flight({required this.id, required this.airline, required this.flightNo, required this.from, required this.to, required this.date, required this.dep, required this.arr, required this.duration, required this.stops, this.via, required this.segments, required this.layover, required this.price, required this.refundable, required this.seatsLeft, required this.domestic});
  factory Flight.fromJson(Json j) {
    final v = j['via'];
    return Flight(id: _s(j['id']), airline: _s(j['airline']), flightNo: _s(j['flightNo']), from: _s(j['from']), to: _s(j['to']), date: _s(j['date']), dep: _i(j['dep']), arr: _i(j['arr']), duration: _i(j['duration']), stops: _i(j['stops']), via: v is Map ? (code: _s(v['code']), city: _s(v['city'])) : null, segments: _l(j['segments'], FlightSegment.fromJson), layover: _i(j['layover']), price: _d(j['price']), refundable: _b(j['refundable']), seatsLeft: _i(j['seatsLeft']), domestic: _b(j['domestic']));
  }
  Json toJson() => {'id': id, 'airline': airline, 'flightNo': flightNo, 'from': from, 'to': to, 'date': date, 'dep': dep, 'arr': arr, 'duration': duration, 'stops': stops, 'via': via == null ? null : {'code': via!.code, 'city': via!.city}, 'segments': segments.map((e) => e.toJson()).toList(), 'layover': layover, 'price': price, 'refundable': refundable, 'seatsLeft': seatsLeft, 'domestic': domestic};
}

class Passenger {
  /// adult | child | infant
  String type, label, title, first, last, dob, passport, nationality;
  String? expiry;
  Passenger({required this.type, required this.label, this.title = '', this.first = '', this.last = '', this.dob = '', this.passport = '', this.expiry, this.nationality = 'Nigerian'});
  factory Passenger.fromJson(Json j) => Passenger(type: _s(j['type']), label: _s(j['label']), title: _s(j['title']), first: _s(j['first']), last: _s(j['last']), dob: _s(j['dob']), passport: _s(j['passport']), expiry: _sn(j['expiry']), nationality: _s(j['nationality'], 'Nigerian'));
  Json toJson() => {'type': type, 'label': label, 'title': title, 'first': first, 'last': last, 'dob': dob, 'passport': passport, 'expiry': expiry, 'nationality': nationality};
}

class BookingLeg {
  String from, to, date; Flight flight;
  BookingLeg({required this.from, required this.to, required this.date, required this.flight});
  factory BookingLeg.fromJson(Json j) => BookingLeg(from: _s(j['from']), to: _s(j['to']), date: _s(j['date']), flight: Flight.fromJson(Json.from((j['flight'] as Map?) ?? {})));
  Json toJson() => {'from': from, 'to': to, 'date': date, 'flight': flight.toJson()};
}

class Booking {
  String id, pnr, trip, cabin, status, txId;
  List<BookingLeg> legs;
  List<Passenger> passengers;
  /// key "legIdx-travellerIdx" → (seat, price)
  Map<String, ({String seat, double price})> seats;
  bool seatsSkipped, refundable;
  ({int bags, bool insurance, bool priority}) addons;
  ({String email, String phone}) contact;
  double fare, taxes, total;
  double? refund;
  int createdAt;
  int? cancelledAt;
  Booking({required this.id, required this.pnr, required this.trip, required this.cabin, required this.legs, required this.passengers, required this.seats, required this.seatsSkipped, required this.addons, required this.contact, required this.fare, required this.taxes, required this.total, required this.refundable, this.status = 'Confirmed', required this.createdAt, required this.txId, this.refund, this.cancelledAt});
  factory Booking.fromJson(Json j) {
    final seats = <String, ({String seat, double price})>{};
    if (j['seats'] is Map) {
      (j['seats'] as Map).forEach((k, v) { if (v is Map) seats['$k'] = (seat: _s(v['seat']), price: _d(v['price'])); });
    }
    final a = (j['addons'] as Map?) ?? {};
    final c = (j['contact'] as Map?) ?? {};
    return Booking(id: _s(j['id']), pnr: _s(j['pnr']), trip: _s(j['trip'], 'oneway'), cabin: _s(j['cabin'], 'Economy'), legs: _l(j['legs'], BookingLeg.fromJson), passengers: _l(j['passengers'], Passenger.fromJson), seats: seats, seatsSkipped: _b(j['seatsSkipped']), addons: (bags: _i(a['bags']), insurance: _b(a['insurance']), priority: _b(a['priority'])), contact: (email: _s(c['email']), phone: _s(c['phone'])), fare: _d(j['fare']), taxes: _d(j['taxes']), total: _d(j['total']), refundable: _b(j['refundable']), status: _s(j['status'], 'Confirmed'), createdAt: _i(j['createdAt']), txId: _s(j['txId']), refund: j['refund'] is num ? _d(j['refund']) : null, cancelledAt: _in(j['cancelledAt']));
  }
  Json toJson() => {'id': id, 'pnr': pnr, 'trip': trip, 'cabin': cabin, 'legs': legs.map((e) => e.toJson()).toList(), 'passengers': passengers.map((e) => e.toJson()).toList(), 'seats': seats.map((k, v) => MapEntry(k, {'seat': v.seat, 'price': v.price})), 'seatsSkipped': seatsSkipped, 'addons': {'bags': addons.bags, 'insurance': addons.insurance, 'priority': addons.priority}, 'contact': {'email': contact.email, 'phone': contact.phone}, 'fare': fare, 'taxes': taxes, 'total': total, 'refundable': refundable, 'status': status, 'createdAt': createdAt, 'txId': txId, 'refund': refund, 'cancelledAt': cancelledAt};
}

/* ---------------- Virtual cards ---------------- */
class CardTx {
  String id, kind, direction, title, note, status;
  String? merchant;
  double amount;
  int date;
  CardTx({required this.id, required this.kind, required this.direction, required this.title, this.merchant, required this.note, required this.amount, required this.status, required this.date});
  factory CardTx.fromJson(Json j) => CardTx(id: _s(j['id']), kind: _s(j['kind']), direction: _s(j['direction']), title: _s(j['title']), merchant: _sn(j['merchant']), note: _s(j['note']), amount: _d(j['amount']), status: _s(j['status']), date: _i(j['date']));
  Json toJson() => {'id': id, 'kind': kind, 'direction': direction, 'title': title, 'merchant': merchant, 'note': note, 'amount': amount, 'status': status, 'date': date};
}

class VirtualCard {
  String id, name, brand, number, expiry, cvv, status, themeId, label;
  List<int> gradient;
  double balance, limit;
  int createdAt;
  List<CardTx> txns;
  VirtualCard({required this.id, required this.name, required this.brand, required this.number, required this.expiry, required this.cvv, required this.balance, this.status = 'active', required this.gradient, required this.themeId, required this.label, this.limit = 1000, required this.createdAt, List<CardTx>? txns}) : txns = txns ?? [];
  factory VirtualCard.fromJson(Json j) => VirtualCard(id: _s(j['id']), name: _s(j['name']), brand: _s(j['brand'], 'visa'), number: _s(j['number']), expiry: _s(j['expiry']), cvv: _s(j['cvv']), balance: _d(j['balance']), status: _s(j['status'], 'active'), gradient: j['gradient'] is List ? (j['gradient'] as List).whereType<num>().map((e) => e.toInt()).toList() : [0xFF2B3A9E, 0xFF141B4D], themeId: _s(j['themeId'], 'midnight'), label: _s(j['label']), limit: _d(j['limit'], 1000), createdAt: _i(j['createdAt']), txns: _l(j['txns'], CardTx.fromJson));
  Json toJson() => {'id': id, 'name': name, 'brand': brand, 'number': number, 'expiry': expiry, 'cvv': cvv, 'balance': balance, 'status': status, 'gradient': gradient, 'themeId': themeId, 'label': label, 'limit': limit, 'createdAt': createdAt, 'txns': txns.map((e) => e.toJson()).toList()};
}

/* ---------------- Gift card trades ---------------- */
class TradeEvent { String s; int at; TradeEvent(this.s, this.at);
  factory TradeEvent.fromJson(Json j) => TradeEvent(_s(j['s']), _i(j['at'])); Json toJson() => {'s': s, 'at': at}; }

class Trade {
  String id, side, card, cardName, country, type, status;
  double face, usd, rate, bonus, naira;
  double? fee;
  int qty, createdAt;
  int? images;
  List<String> codes;
  String? note, email, failReason, reason, txId;
  List<TradeEvent> timeline;
  bool credited;
  Trade({required this.id, required this.side, required this.card, required this.cardName, required this.country, required this.type, required this.face, required this.qty, required this.usd, required this.rate, this.bonus = 0, required this.naira, this.fee, required this.status, this.images, List<String>? codes, this.note, this.email, required this.createdAt, required this.timeline, this.credited = false, this.failReason, this.reason, this.txId}) : codes = codes ?? [];
  factory Trade.fromJson(Json j) => Trade(id: _s(j['id']), side: _s(j['side'], 'sell'), card: _s(j['card']), cardName: _s(j['cardName']), country: _s(j['country']), type: _s(j['type']), face: _d(j['face']), qty: _i(j['qty'], 1), usd: _d(j['usd']), rate: _d(j['rate']), bonus: _d(j['bonus']), naira: _d(j['naira']), fee: j['fee'] is num ? _d(j['fee']) : null, status: _s(j['status'], 'Pending'), images: _in(j['images']), codes: _ls(j['codes']), note: _sn(j['note']), email: _sn(j['email']), createdAt: _i(j['createdAt']), timeline: _l(j['timeline'], TradeEvent.fromJson), credited: _b(j['credited']), failReason: _sn(j['failReason']), reason: _sn(j['reason']), txId: _sn(j['txId']));
  Json toJson() => {'id': id, 'side': side, 'card': card, 'cardName': cardName, 'country': country, 'type': type, 'face': face, 'qty': qty, 'usd': usd, 'rate': rate, 'bonus': bonus, 'naira': naira, 'fee': fee, 'status': status, 'images': images, 'codes': codes, 'note': note, 'email': email, 'createdAt': createdAt, 'timeline': timeline.map((e) => e.toJson()).toList(), 'credited': credited, 'failReason': failReason, 'reason': reason, 'txId': txId};
}

/* ---------------- Misc ---------------- */
class Beneficiary {
  String id, kind, value, label;
  String? network, provider, meterType;
  Beneficiary({required this.id, required this.kind, required this.value, this.network, this.provider, this.meterType, required this.label});
  factory Beneficiary.fromJson(Json j) => Beneficiary(id: _s(j['id']), kind: _s(j['kind']), value: _s(j['value']), network: _sn(j['network']), provider: _sn(j['provider']), meterType: _sn(j['meterType']), label: _s(j['label']));
  Json toJson() => {'id': id, 'kind': kind, 'value': value, 'network': network, 'provider': provider, 'meterType': meterType, 'label': label};
}

class BankAccount {
  String id, bank, number, name;
  BankAccount({required this.id, required this.bank, required this.number, required this.name});
  factory BankAccount.fromJson(Json j) => BankAccount(id: _s(j['id']), bank: _s(j['bank']), number: _s(j['number']), name: _s(j['name']));
  Json toJson() => {'id': id, 'bank': bank, 'number': number, 'name': name};
}

class Session {
  String id, device, loc, ip, icon; int last; bool current;
  Session({required this.id, required this.device, required this.loc, required this.ip, required this.last, required this.icon, this.current = false});
  factory Session.fromJson(Json j) => Session(id: _s(j['id']), device: _s(j['device']), loc: _s(j['loc']), ip: _s(j['ip']), last: _i(j['last']), icon: _s(j['icon']), current: _b(j['current']));
  Json toJson() => {'id': id, 'device': device, 'loc': loc, 'ip': ip, 'last': last, 'icon': icon, 'current': current};
}

const defaultNotifPrefs = {'txPush': true, 'txEmail': true, 'security': true, 'priceAlerts': false, 'promo': false, 'newsletter': true};

class Settings {
  /// light | dark | system
  String themeMode;
  bool hideBalance, pinSet, twoFA;
  /// demo-only transaction PIN. null → any PIN except 0000 works.
  String? pin;
  int? pinChangedAt;
  double budget;
  Map<String, bool> notif;
  /// grid | list
  String marketView;
  Map<String, bool> following;
  Settings({this.themeMode = 'system', this.hideBalance = false, this.pinSet = true, this.pin, this.pinChangedAt, this.twoFA = false, this.budget = 300000, Map<String, bool>? notif, this.marketView = 'grid', Map<String, bool>? following})
      : notif = notif ?? {...defaultNotifPrefs}, following = following ?? {};
  factory Settings.fromJson(Json j) => Settings(themeMode: _s(j['themeMode'], 'system'), hideBalance: _b(j['hideBalance']), pinSet: _b(j['pinSet'], true), pin: _sn(j['pin']), pinChangedAt: _in(j['pinChangedAt']), twoFA: _b(j['twoFA']), budget: _d(j['budget'], 300000), notif: {...defaultNotifPrefs, ...(j['notif'] is Map ? (j['notif'] as Map).map((k, v) => MapEntry('$k', v == true)) : {})}, marketView: _s(j['marketView'], 'grid'), following: j['following'] is Map ? (j['following'] as Map).map((k, v) => MapEntry('$k', v == true)) : {});
  Json toJson() => {'themeMode': themeMode, 'hideBalance': hideBalance, 'pinSet': pinSet, 'pin': pin, 'pinChangedAt': pinChangedAt, 'twoFA': twoFA, 'budget': budget, 'notif': notif, 'marketView': marketView, 'following': following};
}

class AuthState {
  bool authed, remember, onboarded;
  AuthState({this.authed = false, this.remember = true, this.onboarded = false});
  factory AuthState.fromJson(Json j) => AuthState(authed: _b(j['authed']), remember: _b(j['remember'], true), onboarded: _b(j['onboarded']));
  Json toJson() => {'authed': authed, 'remember': remember, 'onboarded': onboarded};
}

const txTypeLabels = {
  'airtime': 'Airtime', 'data': 'Data', 'electricity': 'Electricity', 'cable': 'Cable TV', 'betting': 'Betting', 'education': 'Education',
  'funding': 'Wallet funding', 'withdrawal': 'Withdrawal', 'transfer': 'Transfer', 'convert': 'Conversion', 'giftcard': 'Gift card',
  'shop': 'Marketplace', 'esim': 'eSIM', 'flight': 'Flight', 'card': 'Virtual card', 'refund': 'Refund',
};
String txTypeLabel(String? t) => t == null || t.isEmpty ? 'Other' : (txTypeLabels[t] ?? t[0].toUpperCase() + t.substring(1));
