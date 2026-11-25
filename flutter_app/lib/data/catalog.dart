// GENERATED from autobiz_v2/assets/js/data.js — catalog data. Replace with API responses when wiring a backend.
// ignore_for_file: prefer_single_quotes, lines_longer_than_80_chars

class Category { final String id, name, icon, tone; const Category(this.id, this.name, this.icon, this.tone); }

class Product {
  final String id, name, category, brand, icon, tone, seller;
  final double price, rating;
  final double? oldPrice;
  final int reviews, stock;
  final String? badge;
  final bool freeShipping, digital;
  final List<String>? colors;
  const Product({required this.id, required this.name, required this.category, required this.brand, required this.price, this.oldPrice, required this.rating, required this.reviews, required this.stock, required this.icon, required this.tone, required this.seller, this.badge, this.freeShipping = false, this.digital = false, this.colors});
}

class EsimCountry {
  final String code, name, region, networks, speed;
  final double from;
  final bool regional;
  final String? icon;
  const EsimCountry({required this.code, required this.name, required this.region, required this.from, required this.networks, required this.speed, this.regional = false, this.icon});
}

class EsimPlanTemplate { final String data; final double gb; final int days; final double mult; final bool popular, unlimited;
  const EsimPlanTemplate({required this.data, required this.gb, required this.days, required this.mult, this.popular = false, this.unlimited = false}); }

class Airport { final String code, city, name, country; const Airport(this.code, this.city, this.name, this.country); }
class Airline { final String code, name; final int color; const Airline(this.code, this.name, this.color); }

class GiftCardBrand {
  final String id, name, icon; final int color; final List<String> countries; final Map<String, double> types; final List<double> range; final bool hot;
  const GiftCardBrand({required this.id, required this.name, required this.icon, required this.color, required this.countries, required this.types, required this.range, this.hot = false});
}

class Network { final String id, name, logo; final int color; const Network(this.id, this.name, this.logo, this.color); }
class DataPlan { final String id, name, validity, type; final double price; const DataPlan(this.id, this.name, this.validity, this.price, this.type); }
class CablePlan { final String name; final double price; const CablePlan(this.name, this.price); }
class CableProvider { final String name; final int color; final List<CablePlan> plans; const CableProvider(this.name, this.color, this.plans); }


const categories = <Category>[
  Category('phones', 'Phones & Tablets', 'bi-phone', 'primary'),
  Category('electronics', 'Electronics', 'bi-laptop', 'violet'),
  Category('fashion', 'Fashion', 'bi-bag-heart', 'pink'),
  Category('home', 'Home & Kitchen', 'bi-house-heart', 'orange'),
  Category('beauty', 'Health & Beauty', 'bi-stars', 'cyan'),
  Category('groceries', 'Groceries', 'bi-basket', 'success'),
  Category('gaming', 'Gaming', 'bi-controller', 'danger'),
  Category('digital', 'Digital Goods', 'bi-cloud-download', 'warning'),
];

const products = <Product>[
  Product(id: 'p1', name: 'Galaxy A55 5G (8GB/256GB)', category: 'phones', brand: 'Samsung', price: 485000.0, oldPrice: 545000.0, rating: 4.7, reviews: 1284, stock: 23, icon: 'bi-phone', tone: 'primary', seller: 'TechHub NG', badge: 'Hot', freeShipping: true, colors: ['#1b1f3b', '#a3b8ff', '#e9e3d5']),
  Product(id: 'p2', name: 'iPhone 15 Pro Max 256GB', category: 'phones', brand: 'Apple', price: 1650000.0, oldPrice: 1790000.0, rating: 4.9, reviews: 3401, stock: 8, icon: 'bi-apple', tone: 'violet', seller: 'iStore Lagos', badge: 'Top', freeShipping: true, colors: ['#3b3b3d', '#c9c2b6', '#f2f2f2']),
  Product(id: 'p3', name: 'Redmi Note 13 Pro', category: 'phones', brand: 'Xiaomi', price: 315000.0, oldPrice: 349000.0, rating: 4.5, reviews: 862, stock: 41, icon: 'bi-phone-vibrate', tone: 'orange', seller: 'MobileMart', colors: ['#111', '#6ad', '#a8e']),
  Product(id: 'p4', name: 'MacBook Air M3 13"', category: 'electronics', brand: 'Apple', price: 1890000.0, oldPrice: 2050000.0, rating: 4.9, reviews: 977, stock: 5, icon: 'bi-laptop', tone: 'cyan', seller: 'iStore Lagos', badge: 'New', freeShipping: true, colors: ['#2e3440', '#d8dee9']),
  Product(id: 'p5', name: 'Sony WH-1000XM5 Headphones', category: 'electronics', brand: 'Sony', price: 465000.0, oldPrice: 520000.0, rating: 4.8, reviews: 2110, stock: 17, icon: 'bi-headphones', tone: 'violet', seller: 'SoundCity', freeShipping: true, colors: ['#111', '#e8e4dc']),
  Product(id: 'p6', name: 'Oraimo FreePods 4 ANC', category: 'electronics', brand: 'Oraimo', price: 32500.0, oldPrice: 41000.0, rating: 4.4, reviews: 5120, stock: 120, icon: 'bi-earbuds', tone: 'success', seller: 'Oraimo Official', badge: '-21%', colors: ['#111', '#fff']),
  Product(id: 'p7', name: 'Hisense 55" 4K UHD Smart TV', category: 'electronics', brand: 'Hisense', price: 545000.0, oldPrice: 610000.0, rating: 4.6, reviews: 640, stock: 12, icon: 'bi-tv', tone: 'primary', seller: 'HomeVision', freeShipping: true),
  Product(id: 'p8', name: 'Ankara Two-Piece Set', category: 'fashion', brand: 'Lagos Thread', price: 28500.0, oldPrice: 35000.0, rating: 4.6, reviews: 412, stock: 60, icon: 'bi-person-standing-dress', tone: 'pink', seller: 'Lagos Thread', badge: 'Local', colors: ['#e64980', '#f59f00', '#12b886']),
  Product(id: 'p9', name: 'Men\'s Leather Sneakers', category: 'fashion', brand: 'Kicks NG', price: 42000.0, oldPrice: 55000.0, rating: 4.3, reviews: 233, stock: 34, icon: 'bi-bag', tone: 'orange', seller: 'Kicks NG', colors: ['#fff', '#111', '#8b5e3c']),
  Product(id: 'p10', name: 'Smart Watch Series Fit 3', category: 'electronics', brand: 'Oraimo', price: 38900.0, oldPrice: 49000.0, rating: 4.2, reviews: 1902, stock: 88, icon: 'bi-smartwatch', tone: 'cyan', seller: 'Oraimo Official', freeShipping: true, colors: ['#111', '#c0c0c0', '#ff8fab']),
  Product(id: 'p11', name: 'Air Fryer 6.5L Digital', category: 'home', brand: 'Silver Crest', price: 74500.0, oldPrice: 92000.0, rating: 4.7, reviews: 3011, stock: 45, icon: 'bi-fire', tone: 'orange', seller: 'KitchenPlus', badge: 'Deal', freeShipping: true),
  Product(id: 'p12', name: 'Standing Fan 18" Rechargeable', category: 'home', brand: 'Binatone', price: 56000.0, oldPrice: 64000.0, rating: 4.1, reviews: 780, stock: 30, icon: 'bi-fan', tone: 'cyan', seller: 'HomeVision'),
  Product(id: 'p13', name: 'Shea Butter Glow Kit', category: 'beauty', brand: 'Naija Glow', price: 15800.0, oldPrice: 19500.0, rating: 4.8, reviews: 940, stock: 150, icon: 'bi-droplet-half', tone: 'warning', seller: 'Naija Glow'),
  Product(id: 'p14', name: 'Premium Perfume 100ml', category: 'beauty', brand: 'Scentique', price: 48500.0, oldPrice: 60000.0, rating: 4.5, reviews: 365, stock: 22, icon: 'bi-flower1', tone: 'pink', seller: 'Scentique', freeShipping: true),
  Product(id: 'p15', name: 'Family Rice 50kg (Local)', category: 'groceries', brand: 'Mama Gold', price: 78000.0, oldPrice: 85000.0, rating: 4.6, reviews: 2210, stock: 70, icon: 'bi-basket2', tone: 'success', seller: 'FoodMart'),
  Product(id: 'p16', name: 'Groundnut Oil 5L', category: 'groceries', brand: 'Kings', price: 16500.0, oldPrice: 18200.0, rating: 4.4, reviews: 1188, stock: 200, icon: 'bi-droplet', tone: 'warning', seller: 'FoodMart'),
  Product(id: 'p17', name: 'PlayStation 5 Slim Digital', category: 'gaming', brand: 'Sony', price: 820000.0, oldPrice: 899000.0, rating: 4.9, reviews: 1540, stock: 6, icon: 'bi-controller', tone: 'primary', seller: 'GameZone', badge: 'Hot', freeShipping: true),
  Product(id: 'p18', name: 'Gaming Mouse RGB 16000DPI', category: 'gaming', brand: 'Redragon', price: 18900.0, oldPrice: 24000.0, rating: 4.5, reviews: 670, stock: 95, icon: 'bi-mouse', tone: 'danger', seller: 'GameZone'),
  Product(id: 'p19', name: 'Microsoft 365 Personal (1yr)', category: 'digital', brand: 'Microsoft', price: 42000.0, oldPrice: 55000.0, rating: 4.7, reviews: 512, stock: 999, icon: 'bi-microsoft', tone: 'primary', seller: 'AutoBiz Digital', badge: 'Instant', freeShipping: true, digital: true),
  Product(id: 'p20', name: 'Netflix Premium Voucher (1 month)', category: 'digital', brand: 'Netflix', price: 9500.0, oldPrice: 11000.0, rating: 4.6, reviews: 2880, stock: 999, icon: 'bi-play-btn', tone: 'danger', seller: 'AutoBiz Digital', badge: 'Instant', freeShipping: true, digital: true),
  Product(id: 'p21', name: 'Power Bank 30000mAh 22.5W', category: 'electronics', brand: 'Oraimo', price: 27500.0, oldPrice: 33000.0, rating: 4.6, reviews: 4410, stock: 140, icon: 'bi-battery-charging', tone: 'success', seller: 'Oraimo Official'),
  Product(id: 'p22', name: 'Solar Inverter 3.5kVA Kit', category: 'home', brand: 'Felicity', price: 1150000.0, oldPrice: 1290000.0, rating: 4.7, reviews: 211, stock: 4, icon: 'bi-sun', tone: 'warning', seller: 'PowerHub', badge: 'New', freeShipping: true),
  Product(id: 'p23', name: 'Wireless Keyboard & Mouse', category: 'electronics', brand: 'Logitech', price: 29500.0, oldPrice: 34000.0, rating: 4.5, reviews: 820, stock: 54, icon: 'bi-keyboard', tone: 'violet', seller: 'TechHub NG'),
  Product(id: 'p24', name: 'Steam Wallet \$20 Code', category: 'digital', brand: 'Steam', price: 33000.0, oldPrice: 36000.0, rating: 4.8, reviews: 1022, stock: 999, icon: 'bi-steam', tone: 'cyan', seller: 'AutoBiz Digital', badge: 'Instant', freeShipping: true, digital: true),
];

const esimRegions = <({String id, String name})>[
  (id: 'all', name: 'All'),
  (id: 'africa', name: 'Africa'),
  (id: 'europe', name: 'Europe'),
  (id: 'americas', name: 'Americas'),
  (id: 'asia', name: 'Asia'),
  (id: 'middle-east', name: 'Middle East'),
  (id: 'global', name: 'Regional & Global'),
];

const esimCountries = <EsimCountry>[
  EsimCountry(code: 'us', name: 'United States', region: 'americas', from: 4.5, networks: 'T-Mobile, AT&T', speed: '5G'),
  EsimCountry(code: 'gb', name: 'United Kingdom', region: 'europe', from: 3.9, networks: 'EE, Vodafone', speed: '5G'),
  EsimCountry(code: 'ae', name: 'United Arab Emirates', region: 'middle-east', from: 5.5, networks: 'Etisalat, du', speed: '5G'),
  EsimCountry(code: 'ca', name: 'Canada', region: 'americas', from: 6.0, networks: 'Rogers, Bell', speed: '5G'),
  EsimCountry(code: 'gh', name: 'Ghana', region: 'africa', from: 3.0, networks: 'MTN, Telecel', speed: '4G'),
  EsimCountry(code: 'ke', name: 'Kenya', region: 'africa', from: 3.5, networks: 'Safaricom', speed: '4G'),
  EsimCountry(code: 'za', name: 'South Africa', region: 'africa', from: 4.0, networks: 'Vodacom, MTN', speed: '5G'),
  EsimCountry(code: 'fr', name: 'France', region: 'europe', from: 3.9, networks: 'Orange, SFR', speed: '5G'),
  EsimCountry(code: 'de', name: 'Germany', region: 'europe', from: 3.9, networks: 'Telekom, O2', speed: '5G'),
  EsimCountry(code: 'tr', name: 'Turkey', region: 'europe', from: 4.2, networks: 'Turkcell', speed: '4G'),
  EsimCountry(code: 'sa', name: 'Saudi Arabia', region: 'middle-east', from: 5.9, networks: 'STC, Mobily', speed: '5G'),
  EsimCountry(code: 'qa', name: 'Qatar', region: 'middle-east', from: 5.0, networks: 'Ooredoo', speed: '5G'),
  EsimCountry(code: 'cn', name: 'China', region: 'asia', from: 4.9, networks: 'China Unicom', speed: '5G'),
  EsimCountry(code: 'jp', name: 'Japan', region: 'asia', from: 4.5, networks: 'Docomo, SoftBank', speed: '5G'),
  EsimCountry(code: 'in', name: 'India', region: 'asia', from: 3.2, networks: 'Airtel, Jio', speed: '5G'),
  EsimCountry(code: 'sg', name: 'Singapore', region: 'asia', from: 3.9, networks: 'Singtel', speed: '5G'),
  EsimCountry(code: 'br', name: 'Brazil', region: 'americas', from: 5.0, networks: 'Claro, Vivo', speed: '4G'),
  EsimCountry(code: 'eu', name: 'Europe (39 countries)', region: 'global', from: 6.5, networks: 'Multiple', speed: '5G', regional: true, icon: 'bi-globe-europe-africa'),
  EsimCountry(code: 'af', name: 'Africa (24 countries)', region: 'global', from: 9.0, networks: 'Multiple', speed: '4G', regional: true, icon: 'bi-globe-europe-africa'),
  EsimCountry(code: 'gl', name: 'Global (120+ countries)', region: 'global', from: 12.0, networks: 'Multiple', speed: '4G/5G', regional: true, icon: 'bi-globe2'),
];

const esimPlanTemplates = <EsimPlanTemplate>[
  EsimPlanTemplate(data: '1 GB', gb: 1.0, days: 7, mult: 1.0),
  EsimPlanTemplate(data: '3 GB', gb: 3.0, days: 15, mult: 2.2),
  EsimPlanTemplate(data: '5 GB', gb: 5.0, days: 30, mult: 3.1, popular: true),
  EsimPlanTemplate(data: '10 GB', gb: 10.0, days: 30, mult: 5.2),
  EsimPlanTemplate(data: '20 GB', gb: 20.0, days: 30, mult: 8.4),
  EsimPlanTemplate(data: 'Unlimited', gb: 999.0, days: 7, mult: 6.9, unlimited: true),
];

const airports = <Airport>[
  Airport('LOS', 'Lagos', 'Murtala Muhammed Intl', 'Nigeria'),
  Airport('ABV', 'Abuja', 'Nnamdi Azikiwe Intl', 'Nigeria'),
  Airport('PHC', 'Port Harcourt', 'Port Harcourt Intl', 'Nigeria'),
  Airport('KAN', 'Kano', 'Mallam Aminu Kano Intl', 'Nigeria'),
  Airport('ENU', 'Enugu', 'Akanu Ibiam Intl', 'Nigeria'),
  Airport('QOW', 'Owerri', 'Sam Mbakwe Airport', 'Nigeria'),
  Airport('ACC', 'Accra', 'Kotoka Intl', 'Ghana'),
  Airport('NBO', 'Nairobi', 'Jomo Kenyatta Intl', 'Kenya'),
  Airport('JNB', 'Johannesburg', 'O. R. Tambo Intl', 'South Africa'),
  Airport('DXB', 'Dubai', 'Dubai Intl', 'UAE'),
  Airport('LHR', 'London', 'Heathrow', 'United Kingdom'),
  Airport('JFK', 'New York', 'John F. Kennedy Intl', 'United States'),
  Airport('IAH', 'Houston', 'George Bush Intercontinental', 'United States'),
  Airport('YYZ', 'Toronto', 'Pearson Intl', 'Canada'),
  Airport('CDG', 'Paris', 'Charles de Gaulle', 'France'),
  Airport('IST', 'Istanbul', 'Istanbul Airport', 'Turkey'),
];

const airlines = <Airline>[
  Airline('P4', 'Air Peace', 0xFF1D4ED8),
  Airline('W3', 'Arik Air', 0xFFB91C1C),
  Airline('VK', 'ValueJet', 0xFF0E7490),
  Airline('UN', 'United Nigeria', 0xFF15803D),
  Airline('IBM', 'Ibom Air', 0xFF7C3AED),
  Airline('EK', 'Emirates', 0xFFC8102E),
  Airline('BA', 'British Airways', 0xFF1E3A8A),
  Airline('TK', 'Turkish Airlines', 0xFFDC2626),
  Airline('ET', 'Ethiopian', 0xFF16A34A),
  Airline('QR', 'Qatar Airways', 0xFF5C0632),
  Airline('KQ', 'Kenya Airways', 0xFFBE123C),
  Airline('AF', 'Air France', 0xFF0B2A6B),
];

const giftcards = <GiftCardBrand>[
  GiftCardBrand(id: 'apple', name: 'Apple / iTunes', icon: 'bi-apple', color: 0xFF111827, countries: ['USA', 'UK', 'Canada', 'Australia'], types: <String, double>{'Physical': 1180.0, 'E-code': 1120.0}, range: <double>[25.0, 500.0], hot: true),
  GiftCardBrand(id: 'amazon', name: 'Amazon', icon: 'bi-amazon', color: 0xFFFF9900, countries: ['USA', 'UK', 'Germany'], types: <String, double>{'Cash receipt': 1150.0, 'No receipt': 1040.0, 'E-code': 1090.0}, range: <double>[25.0, 1000.0], hot: true),
  GiftCardBrand(id: 'steam', name: 'Steam', icon: 'bi-steam', color: 0xFF1B2838, countries: ['USA', 'UK', 'Euro', 'Canada'], types: <String, double>{'Physical': 1210.0, 'E-code': 1165.0}, range: <double>[10.0, 500.0], hot: true),
  GiftCardBrand(id: 'google', name: 'Google Play', icon: 'bi-google-play', color: 0xFF01875F, countries: ['USA', 'UK'], types: <String, double>{'Physical': 990.0, 'E-code': 940.0}, range: <double>[10.0, 500.0]),
  GiftCardBrand(id: 'razer', name: 'Razer Gold', icon: 'bi-controller', color: 0xFF44D62C, countries: ['Global', 'USA'], types: <String, double>{'E-code': 1080.0}, range: <double>[10.0, 500.0]),
  GiftCardBrand(id: 'sephora', name: 'Sephora', icon: 'bi-flower2', color: 0xFF000000, countries: ['USA', 'Canada'], types: <String, double>{'Physical': 1020.0, 'E-code': 980.0}, range: <double>[25.0, 500.0]),
  GiftCardBrand(id: 'nike', name: 'Nike', icon: 'bi-lightning-charge', color: 0xFF111111, countries: ['USA'], types: <String, double>{'Physical': 960.0, 'E-code': 930.0}, range: <double>[25.0, 500.0]),
  GiftCardBrand(id: 'visa', name: 'Vanilla Visa', icon: 'bi-credit-card-2-front', color: 0xFF1A1F71, countries: ['USA'], types: <String, double>{'Physical': 900.0}, range: <double>[25.0, 500.0]),
  GiftCardBrand(id: 'ebay', name: 'eBay', icon: 'bi-bag-check', color: 0xFFE53238, countries: ['USA', 'UK'], types: <String, double>{'Physical': 1000.0, 'E-code': 960.0}, range: <double>[25.0, 500.0]),
  GiftCardBrand(id: 'xbox', name: 'Xbox', icon: 'bi-xbox', color: 0xFF107C10, countries: ['USA', 'UK'], types: <String, double>{'E-code': 1050.0}, range: <double>[10.0, 200.0]),
  GiftCardBrand(id: 'playstation', name: 'PlayStation', icon: 'bi-playstation', color: 0xFF003791, countries: ['USA', 'UK'], types: <String, double>{'E-code': 1070.0}, range: <double>[10.0, 200.0]),
  GiftCardBrand(id: 'walmart', name: 'Walmart', icon: 'bi-cart3', color: 0xFF0071CE, countries: ['USA'], types: <String, double>{'Physical': 940.0, 'E-code': 910.0}, range: <double>[25.0, 500.0]),
];

const networks = <Network>[
  Network('mtn', 'MTN', 'assets/networks/mtn.png', 0xFFFFCC00),
  Network('airtel', 'Airtel', 'assets/networks/airtel.png', 0xFFE40000),
  Network('glo', 'Glo', 'assets/networks/glo.png', 0xFF50B651),
  Network('9mobile', '9mobile', 'assets/networks/9mobile.png', 0xFF006E53),
];

const dataPlans = <String, List<DataPlan>>{
  'mtn': [
    DataPlan('m1', '500MB', '30 days', 140.0, 'SME'),
    DataPlan('m2', '1GB', '30 days', 265.0, 'SME'),
    DataPlan('m3', '2GB', '30 days', 530.0, 'SME'),
    DataPlan('m4', '3GB', '30 days', 795.0, 'SME'),
    DataPlan('m5', '5GB', '30 days', 1325.0, 'SME'),
    DataPlan('m6', '10GB', '30 days', 2650.0, 'SME'),
    DataPlan('m7', '1GB', '1 day', 350.0, 'Awoof'),
    DataPlan('m8', '20GB', '30 days', 5500.0, 'Corporate'),
  ],
  'airtel': [
    DataPlan('a1', '500MB', '30 days', 150.0, 'CG'),
    DataPlan('a2', '1GB', '30 days', 285.0, 'CG'),
    DataPlan('a3', '2GB', '30 days', 570.0, 'CG'),
    DataPlan('a4', '5GB', '30 days', 1425.0, 'CG'),
    DataPlan('a5', '10GB', '30 days', 2850.0, 'CG'),
    DataPlan('a6', '1.5GB', '2 days', 450.0, 'Awoof'),
  ],
  'glo': [
    DataPlan('g1', '1GB', '30 days', 250.0, 'CG'),
    DataPlan('g2', '2GB', '30 days', 500.0, 'CG'),
    DataPlan('g3', '3GB', '30 days', 750.0, 'CG'),
    DataPlan('g4', '5GB', '30 days', 1250.0, 'CG'),
    DataPlan('g5', '10GB', '30 days', 2500.0, 'CG'),
  ],
  '9mobile': [
    DataPlan('n1', '1GB', '30 days', 220.0, 'SME'),
    DataPlan('n2', '2GB', '30 days', 440.0, 'SME'),
    DataPlan('n3', '5GB', '30 days', 1100.0, 'SME'),
    DataPlan('n4', '10GB', '30 days', 2200.0, 'SME'),
  ],
};

const discos = <String>['Ikeja Electric (IKEDC)', 'Eko Electric (EKEDC)', 'Abuja Electric (AEDC)', 'Ibadan Electric (IBEDC)', 'Enugu Electric (EEDC)', 'Port Harcourt Electric (PHED)', 'Kano Electric (KEDCO)', 'Jos Electric (JED)', 'Kaduna Electric (KAEDCO)', 'Benin Electric (BEDC)'];

const cableProviders = <String, CableProvider>{
  'dstv': CableProvider('DStv', 0xFF0090D4, [CablePlan('Padi', 4400.0), CablePlan('Yanga', 6000.0), CablePlan('Confam', 11000.0), CablePlan('Compact', 19000.0), CablePlan('Compact Plus', 30000.0), CablePlan('Premium', 44500.0)]),
  'gotv': CableProvider('GOtv', 0xFF7CB342, [CablePlan('Smallie', 1900.0), CablePlan('Jinja', 3900.0), CablePlan('Jolli', 5800.0), CablePlan('Max', 8500.0), CablePlan('Supa', 11400.0)]),
  'startimes': CableProvider('StarTimes', 0xFFF57C00, [CablePlan('Nova', 1900.0), CablePlan('Basic', 3700.0), CablePlan('Smart', 4700.0), CablePlan('Classic', 5500.0), CablePlan('Super', 9000.0)]),
};

/// ₦ per $1 (selling rate for USD services)
const double usdRate = 1580.0;

Product? productById(String id) { for (final p in products) { if (p.id == id) return p; } return null; }
Category? categoryById(String id) { for (final c in categories) { if (c.id == id) return c; } return null; }
Airport? airportByCode(String code) { for (final a in airports) { if (a.code == code) return a; } return null; }
Airline? airlineByCode(String code) { for (final a in airlines) { if (a.code == code) return a; } return null; }
GiftCardBrand? giftcardById(String id) { for (final g in giftcards) { if (g.id == id) return g; } return null; }
Network? networkById(String id) { for (final n in networks) { if (n.id == id) return n; } return null; }
