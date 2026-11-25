/* Catalog data — generated from autobiz_v2/assets/js/data.js. Replace with API responses when wiring a backend. */
import type { ImageSourcePropType } from "react-native";

export type Category = { id: string; name: string; icon: string; tone: string };
export type Product = { id: string; name: string; category: string; brand: string; price: number; oldPrice?: number; rating: number; reviews: number; stock: number; icon: string; tone: string; seller: string; badge?: string; freeShipping?: boolean; colors?: string[]; digital?: boolean };
export type EsimCountry = { code: string; name: string; region: string; from: number; networks: string; speed: string; regional?: boolean; icon?: string };
export type EsimPlanTemplate = { data: string; gb: number; days: number; mult: number; popular?: boolean; unlimited?: boolean };
export type Airport = { code: string; city: string; name: string; country: string };
export type Airline = { code: string; name: string; color: string };
export type GiftCard = { id: string; name: string; icon: string; color: string; countries: string[]; types: Record<string, number>; range: [number, number]; hot?: boolean };
export type Network = { id: string; name: string; logo: ImageSourcePropType; color: string };
export type DataPlan = { id: string; name: string; validity: string; price: number; type: string };
export type CableProvider = { name: string; color: string; plans: { name: string; price: number }[] };

export const categories: Category[] = [{"id":"phones","name":"Phones & Tablets","icon":"bi-phone","tone":"primary"},
  {"id":"electronics","name":"Electronics","icon":"bi-laptop","tone":"violet"},
  {"id":"fashion","name":"Fashion","icon":"bi-bag-heart","tone":"pink"},
  {"id":"home","name":"Home & Kitchen","icon":"bi-house-heart","tone":"orange"},
  {"id":"beauty","name":"Health & Beauty","icon":"bi-stars","tone":"cyan"},
  {"id":"groceries","name":"Groceries","icon":"bi-basket","tone":"success"},
  {"id":"gaming","name":"Gaming","icon":"bi-controller","tone":"danger"},
  {"id":"digital","name":"Digital Goods","icon":"bi-cloud-download","tone":"warning"}];

export const products: Product[] = [{"id":"p1","name":"Galaxy A55 5G (8GB/256GB)","category":"phones","brand":"Samsung","price":485000,"oldPrice":545000,"rating":4.7,"reviews":1284,"stock":23,"icon":"bi-phone","tone":"primary","seller":"TechHub NG","badge":"Hot","freeShipping":true,"colors":["#1b1f3b","#a3b8ff","#e9e3d5"]},
  {"id":"p2","name":"iPhone 15 Pro Max 256GB","category":"phones","brand":"Apple","price":1650000,"oldPrice":1790000,"rating":4.9,"reviews":3401,"stock":8,"icon":"bi-apple","tone":"violet","seller":"iStore Lagos","badge":"Top","freeShipping":true,"colors":["#3b3b3d","#c9c2b6","#f2f2f2"]},
  {"id":"p3","name":"Redmi Note 13 Pro","category":"phones","brand":"Xiaomi","price":315000,"oldPrice":349000,"rating":4.5,"reviews":862,"stock":41,"icon":"bi-phone-vibrate","tone":"orange","seller":"MobileMart","freeShipping":false,"colors":["#111","#6ad","#a8e"]},
  {"id":"p4","name":"MacBook Air M3 13\"","category":"electronics","brand":"Apple","price":1890000,"oldPrice":2050000,"rating":4.9,"reviews":977,"stock":5,"icon":"bi-laptop","tone":"cyan","seller":"iStore Lagos","badge":"New","freeShipping":true,"colors":["#2e3440","#d8dee9"]},
  {"id":"p5","name":"Sony WH-1000XM5 Headphones","category":"electronics","brand":"Sony","price":465000,"oldPrice":520000,"rating":4.8,"reviews":2110,"stock":17,"icon":"bi-headphones","tone":"violet","seller":"SoundCity","freeShipping":true,"colors":["#111","#e8e4dc"]},
  {"id":"p6","name":"Oraimo FreePods 4 ANC","category":"electronics","brand":"Oraimo","price":32500,"oldPrice":41000,"rating":4.4,"reviews":5120,"stock":120,"icon":"bi-earbuds","tone":"success","seller":"Oraimo Official","badge":"-21%","freeShipping":false,"colors":["#111","#fff"]},
  {"id":"p7","name":"Hisense 55\" 4K UHD Smart TV","category":"electronics","brand":"Hisense","price":545000,"oldPrice":610000,"rating":4.6,"reviews":640,"stock":12,"icon":"bi-tv","tone":"primary","seller":"HomeVision","freeShipping":true},
  {"id":"p8","name":"Ankara Two-Piece Set","category":"fashion","brand":"Lagos Thread","price":28500,"oldPrice":35000,"rating":4.6,"reviews":412,"stock":60,"icon":"bi-person-standing-dress","tone":"pink","seller":"Lagos Thread","badge":"Local","freeShipping":false,"colors":["#e64980","#f59f00","#12b886"]},
  {"id":"p9","name":"Men's Leather Sneakers","category":"fashion","brand":"Kicks NG","price":42000,"oldPrice":55000,"rating":4.3,"reviews":233,"stock":34,"icon":"bi-bag","tone":"orange","seller":"Kicks NG","freeShipping":false,"colors":["#fff","#111","#8b5e3c"]},
  {"id":"p10","name":"Smart Watch Series Fit 3","category":"electronics","brand":"Oraimo","price":38900,"oldPrice":49000,"rating":4.2,"reviews":1902,"stock":88,"icon":"bi-smartwatch","tone":"cyan","seller":"Oraimo Official","freeShipping":true,"colors":["#111","#c0c0c0","#ff8fab"]},
  {"id":"p11","name":"Air Fryer 6.5L Digital","category":"home","brand":"Silver Crest","price":74500,"oldPrice":92000,"rating":4.7,"reviews":3011,"stock":45,"icon":"bi-fire","tone":"orange","seller":"KitchenPlus","badge":"Deal","freeShipping":true},
  {"id":"p12","name":"Standing Fan 18\" Rechargeable","category":"home","brand":"Binatone","price":56000,"oldPrice":64000,"rating":4.1,"reviews":780,"stock":30,"icon":"bi-fan","tone":"cyan","seller":"HomeVision","freeShipping":false},
  {"id":"p13","name":"Shea Butter Glow Kit","category":"beauty","brand":"Naija Glow","price":15800,"oldPrice":19500,"rating":4.8,"reviews":940,"stock":150,"icon":"bi-droplet-half","tone":"warning","seller":"Naija Glow","freeShipping":false},
  {"id":"p14","name":"Premium Perfume 100ml","category":"beauty","brand":"Scentique","price":48500,"oldPrice":60000,"rating":4.5,"reviews":365,"stock":22,"icon":"bi-flower1","tone":"pink","seller":"Scentique","freeShipping":true},
  {"id":"p15","name":"Family Rice 50kg (Local)","category":"groceries","brand":"Mama Gold","price":78000,"oldPrice":85000,"rating":4.6,"reviews":2210,"stock":70,"icon":"bi-basket2","tone":"success","seller":"FoodMart","freeShipping":false},
  {"id":"p16","name":"Groundnut Oil 5L","category":"groceries","brand":"Kings","price":16500,"oldPrice":18200,"rating":4.4,"reviews":1188,"stock":200,"icon":"bi-droplet","tone":"warning","seller":"FoodMart","freeShipping":false},
  {"id":"p17","name":"PlayStation 5 Slim Digital","category":"gaming","brand":"Sony","price":820000,"oldPrice":899000,"rating":4.9,"reviews":1540,"stock":6,"icon":"bi-controller","tone":"primary","seller":"GameZone","badge":"Hot","freeShipping":true},
  {"id":"p18","name":"Gaming Mouse RGB 16000DPI","category":"gaming","brand":"Redragon","price":18900,"oldPrice":24000,"rating":4.5,"reviews":670,"stock":95,"icon":"bi-mouse","tone":"danger","seller":"GameZone","freeShipping":false},
  {"id":"p19","name":"Microsoft 365 Personal (1yr)","category":"digital","brand":"Microsoft","price":42000,"oldPrice":55000,"rating":4.7,"reviews":512,"stock":999,"icon":"bi-microsoft","tone":"primary","seller":"AutoBiz Digital","badge":"Instant","freeShipping":true,"digital":true},
  {"id":"p20","name":"Netflix Premium Voucher (1 month)","category":"digital","brand":"Netflix","price":9500,"oldPrice":11000,"rating":4.6,"reviews":2880,"stock":999,"icon":"bi-play-btn","tone":"danger","seller":"AutoBiz Digital","badge":"Instant","freeShipping":true,"digital":true},
  {"id":"p21","name":"Power Bank 30000mAh 22.5W","category":"electronics","brand":"Oraimo","price":27500,"oldPrice":33000,"rating":4.6,"reviews":4410,"stock":140,"icon":"bi-battery-charging","tone":"success","seller":"Oraimo Official","freeShipping":false},
  {"id":"p22","name":"Solar Inverter 3.5kVA Kit","category":"home","brand":"Felicity","price":1150000,"oldPrice":1290000,"rating":4.7,"reviews":211,"stock":4,"icon":"bi-sun","tone":"warning","seller":"PowerHub","badge":"New","freeShipping":true},
  {"id":"p23","name":"Wireless Keyboard & Mouse","category":"electronics","brand":"Logitech","price":29500,"oldPrice":34000,"rating":4.5,"reviews":820,"stock":54,"icon":"bi-keyboard","tone":"violet","seller":"TechHub NG","freeShipping":false},
  {"id":"p24","name":"Steam Wallet $20 Code","category":"digital","brand":"Steam","price":33000,"oldPrice":36000,"rating":4.8,"reviews":1022,"stock":999,"icon":"bi-steam","tone":"cyan","seller":"AutoBiz Digital","badge":"Instant","freeShipping":true,"digital":true}];

export const esimRegions: { id: string; name: string }[] = [{"id":"all","name":"All"},
  {"id":"africa","name":"Africa"},
  {"id":"europe","name":"Europe"},
  {"id":"americas","name":"Americas"},
  {"id":"asia","name":"Asia"},
  {"id":"middle-east","name":"Middle East"},
  {"id":"global","name":"Regional & Global"}];
export const esimCountries: EsimCountry[] = [{"code":"us","name":"United States","region":"americas","from":4.5,"networks":"T-Mobile, AT&T","speed":"5G"},
  {"code":"gb","name":"United Kingdom","region":"europe","from":3.9,"networks":"EE, Vodafone","speed":"5G"},
  {"code":"ae","name":"United Arab Emirates","region":"middle-east","from":5.5,"networks":"Etisalat, du","speed":"5G"},
  {"code":"ca","name":"Canada","region":"americas","from":6,"networks":"Rogers, Bell","speed":"5G"},
  {"code":"gh","name":"Ghana","region":"africa","from":3,"networks":"MTN, Telecel","speed":"4G"},
  {"code":"ke","name":"Kenya","region":"africa","from":3.5,"networks":"Safaricom","speed":"4G"},
  {"code":"za","name":"South Africa","region":"africa","from":4,"networks":"Vodacom, MTN","speed":"5G"},
  {"code":"fr","name":"France","region":"europe","from":3.9,"networks":"Orange, SFR","speed":"5G"},
  {"code":"de","name":"Germany","region":"europe","from":3.9,"networks":"Telekom, O2","speed":"5G"},
  {"code":"tr","name":"Turkey","region":"europe","from":4.2,"networks":"Turkcell","speed":"4G"},
  {"code":"sa","name":"Saudi Arabia","region":"middle-east","from":5.9,"networks":"STC, Mobily","speed":"5G"},
  {"code":"qa","name":"Qatar","region":"middle-east","from":5,"networks":"Ooredoo","speed":"5G"},
  {"code":"cn","name":"China","region":"asia","from":4.9,"networks":"China Unicom","speed":"5G"},
  {"code":"jp","name":"Japan","region":"asia","from":4.5,"networks":"Docomo, SoftBank","speed":"5G"},
  {"code":"in","name":"India","region":"asia","from":3.2,"networks":"Airtel, Jio","speed":"5G"},
  {"code":"sg","name":"Singapore","region":"asia","from":3.9,"networks":"Singtel","speed":"5G"},
  {"code":"br","name":"Brazil","region":"americas","from":5,"networks":"Claro, Vivo","speed":"4G"},
  {"code":"eu","name":"Europe (39 countries)","region":"global","from":6.5,"networks":"Multiple","speed":"5G","regional":true,"icon":"bi-globe-europe-africa"},
  {"code":"af","name":"Africa (24 countries)","region":"global","from":9,"networks":"Multiple","speed":"4G","regional":true,"icon":"bi-globe-europe-africa"},
  {"code":"gl","name":"Global (120+ countries)","region":"global","from":12,"networks":"Multiple","speed":"4G/5G","regional":true,"icon":"bi-globe2"}];
export const esimPlanTemplates: EsimPlanTemplate[] = [{"data":"1 GB","gb":1,"days":7,"mult":1},
  {"data":"3 GB","gb":3,"days":15,"mult":2.2},
  {"data":"5 GB","gb":5,"days":30,"mult":3.1,"popular":true},
  {"data":"10 GB","gb":10,"days":30,"mult":5.2},
  {"data":"20 GB","gb":20,"days":30,"mult":8.4},
  {"data":"Unlimited","gb":999,"days":7,"mult":6.9,"unlimited":true}];

export const airports: Airport[] = [{"code":"LOS","city":"Lagos","name":"Murtala Muhammed Intl","country":"Nigeria"},
  {"code":"ABV","city":"Abuja","name":"Nnamdi Azikiwe Intl","country":"Nigeria"},
  {"code":"PHC","city":"Port Harcourt","name":"Port Harcourt Intl","country":"Nigeria"},
  {"code":"KAN","city":"Kano","name":"Mallam Aminu Kano Intl","country":"Nigeria"},
  {"code":"ENU","city":"Enugu","name":"Akanu Ibiam Intl","country":"Nigeria"},
  {"code":"QOW","city":"Owerri","name":"Sam Mbakwe Airport","country":"Nigeria"},
  {"code":"ACC","city":"Accra","name":"Kotoka Intl","country":"Ghana"},
  {"code":"NBO","city":"Nairobi","name":"Jomo Kenyatta Intl","country":"Kenya"},
  {"code":"JNB","city":"Johannesburg","name":"O. R. Tambo Intl","country":"South Africa"},
  {"code":"DXB","city":"Dubai","name":"Dubai Intl","country":"UAE"},
  {"code":"LHR","city":"London","name":"Heathrow","country":"United Kingdom"},
  {"code":"JFK","city":"New York","name":"John F. Kennedy Intl","country":"United States"},
  {"code":"IAH","city":"Houston","name":"George Bush Intercontinental","country":"United States"},
  {"code":"YYZ","city":"Toronto","name":"Pearson Intl","country":"Canada"},
  {"code":"CDG","city":"Paris","name":"Charles de Gaulle","country":"France"},
  {"code":"IST","city":"Istanbul","name":"Istanbul Airport","country":"Turkey"}];
export const airlines: Airline[] = [{"code":"P4","name":"Air Peace","color":"#1d4ed8"},
  {"code":"W3","name":"Arik Air","color":"#b91c1c"},
  {"code":"VK","name":"ValueJet","color":"#0e7490"},
  {"code":"UN","name":"United Nigeria","color":"#15803d"},
  {"code":"IBM","name":"Ibom Air","color":"#7c3aed"},
  {"code":"EK","name":"Emirates","color":"#c8102e"},
  {"code":"BA","name":"British Airways","color":"#1e3a8a"},
  {"code":"TK","name":"Turkish Airlines","color":"#dc2626"},
  {"code":"ET","name":"Ethiopian","color":"#16a34a"},
  {"code":"QR","name":"Qatar Airways","color":"#5c0632"},
  {"code":"KQ","name":"Kenya Airways","color":"#be123c"},
  {"code":"AF","name":"Air France","color":"#0b2a6b"}];

export const giftcards: GiftCard[] = [{"id":"apple","name":"Apple / iTunes","icon":"bi-apple","color":"#111827","countries":["USA","UK","Canada","Australia"],"types":{"Physical":1180,"E-code":1120},"range":[25,500],"hot":true},
  {"id":"amazon","name":"Amazon","icon":"bi-amazon","color":"#ff9900","countries":["USA","UK","Germany"],"types":{"Cash receipt":1150,"No receipt":1040,"E-code":1090},"range":[25,1000],"hot":true},
  {"id":"steam","name":"Steam","icon":"bi-steam","color":"#1b2838","countries":["USA","UK","Euro","Canada"],"types":{"Physical":1210,"E-code":1165},"range":[10,500],"hot":true},
  {"id":"google","name":"Google Play","icon":"bi-google-play","color":"#01875f","countries":["USA","UK"],"types":{"Physical":990,"E-code":940},"range":[10,500]},
  {"id":"razer","name":"Razer Gold","icon":"bi-controller","color":"#44d62c","countries":["Global","USA"],"types":{"E-code":1080},"range":[10,500]},
  {"id":"sephora","name":"Sephora","icon":"bi-flower2","color":"#000000","countries":["USA","Canada"],"types":{"Physical":1020,"E-code":980},"range":[25,500]},
  {"id":"nike","name":"Nike","icon":"bi-lightning-charge","color":"#111111","countries":["USA"],"types":{"Physical":960,"E-code":930},"range":[25,500]},
  {"id":"visa","name":"Vanilla Visa","icon":"bi-credit-card-2-front","color":"#1a1f71","countries":["USA"],"types":{"Physical":900},"range":[25,500]},
  {"id":"ebay","name":"eBay","icon":"bi-bag-check","color":"#e53238","countries":["USA","UK"],"types":{"Physical":1000,"E-code":960},"range":[25,500]},
  {"id":"xbox","name":"Xbox","icon":"bi-xbox","color":"#107c10","countries":["USA","UK"],"types":{"E-code":1050},"range":[10,200]},
  {"id":"playstation","name":"PlayStation","icon":"bi-playstation","color":"#003791","countries":["USA","UK"],"types":{"E-code":1070},"range":[10,200]},
  {"id":"walmart","name":"Walmart","icon":"bi-cart3","color":"#0071ce","countries":["USA"],"types":{"Physical":940,"E-code":910},"range":[25,500]}];

const LOGOS = {
  mtn: require("../../assets/networks/mtn.png"),
  airtel: require("../../assets/networks/airtel.png"),
  glo: require("../../assets/networks/glo.png"),
  "9mobile": require("../../assets/networks/9mobile.png"),
};
export const networks: Network[] = [{"id":"mtn","name":"MTN","color":"#ffcc00"},
  {"id":"airtel","name":"Airtel","color":"#e40000"},
  {"id":"glo","name":"Glo","color":"#50b651"},
  {"id":"9mobile","name":"9mobile","color":"#006e53"}].map((n) => ({ ...n, logo: LOGOS[n.id as keyof typeof LOGOS] }));
export const dataPlans: Record<string, DataPlan[]> = {
 "mtn": [
  {
   "id": "m1",
   "name": "500MB",
   "validity": "30 days",
   "price": 140,
   "type": "SME"
  },
  {
   "id": "m2",
   "name": "1GB",
   "validity": "30 days",
   "price": 265,
   "type": "SME"
  },
  {
   "id": "m3",
   "name": "2GB",
   "validity": "30 days",
   "price": 530,
   "type": "SME"
  },
  {
   "id": "m4",
   "name": "3GB",
   "validity": "30 days",
   "price": 795,
   "type": "SME"
  },
  {
   "id": "m5",
   "name": "5GB",
   "validity": "30 days",
   "price": 1325,
   "type": "SME"
  },
  {
   "id": "m6",
   "name": "10GB",
   "validity": "30 days",
   "price": 2650,
   "type": "SME"
  },
  {
   "id": "m7",
   "name": "1GB",
   "validity": "1 day",
   "price": 350,
   "type": "Awoof"
  },
  {
   "id": "m8",
   "name": "20GB",
   "validity": "30 days",
   "price": 5500,
   "type": "Corporate"
  }
 ],
 "airtel": [
  {
   "id": "a1",
   "name": "500MB",
   "validity": "30 days",
   "price": 150,
   "type": "CG"
  },
  {
   "id": "a2",
   "name": "1GB",
   "validity": "30 days",
   "price": 285,
   "type": "CG"
  },
  {
   "id": "a3",
   "name": "2GB",
   "validity": "30 days",
   "price": 570,
   "type": "CG"
  },
  {
   "id": "a4",
   "name": "5GB",
   "validity": "30 days",
   "price": 1425,
   "type": "CG"
  },
  {
   "id": "a5",
   "name": "10GB",
   "validity": "30 days",
   "price": 2850,
   "type": "CG"
  },
  {
   "id": "a6",
   "name": "1.5GB",
   "validity": "2 days",
   "price": 450,
   "type": "Awoof"
  }
 ],
 "glo": [
  {
   "id": "g1",
   "name": "1GB",
   "validity": "30 days",
   "price": 250,
   "type": "CG"
  },
  {
   "id": "g2",
   "name": "2GB",
   "validity": "30 days",
   "price": 500,
   "type": "CG"
  },
  {
   "id": "g3",
   "name": "3GB",
   "validity": "30 days",
   "price": 750,
   "type": "CG"
  },
  {
   "id": "g4",
   "name": "5GB",
   "validity": "30 days",
   "price": 1250,
   "type": "CG"
  },
  {
   "id": "g5",
   "name": "10GB",
   "validity": "30 days",
   "price": 2500,
   "type": "CG"
  }
 ],
 "9mobile": [
  {
   "id": "n1",
   "name": "1GB",
   "validity": "30 days",
   "price": 220,
   "type": "SME"
  },
  {
   "id": "n2",
   "name": "2GB",
   "validity": "30 days",
   "price": 440,
   "type": "SME"
  },
  {
   "id": "n3",
   "name": "5GB",
   "validity": "30 days",
   "price": 1100,
   "type": "SME"
  },
  {
   "id": "n4",
   "name": "10GB",
   "validity": "30 days",
   "price": 2200,
   "type": "SME"
  }
 ]
};
export const discos: string[] = ["Ikeja Electric (IKEDC)","Eko Electric (EKEDC)","Abuja Electric (AEDC)","Ibadan Electric (IBEDC)","Enugu Electric (EEDC)","Port Harcourt Electric (PHED)","Kano Electric (KEDCO)","Jos Electric (JED)","Kaduna Electric (KAEDCO)","Benin Electric (BEDC)"];
export const cableProviders: Record<string, CableProvider> = {
 "dstv": {
  "name": "DStv",
  "color": "#0090d4",
  "plans": [
   {
    "name": "Padi",
    "price": 4400
   },
   {
    "name": "Yanga",
    "price": 6000
   },
   {
    "name": "Confam",
    "price": 11000
   },
   {
    "name": "Compact",
    "price": 19000
   },
   {
    "name": "Compact Plus",
    "price": 30000
   },
   {
    "name": "Premium",
    "price": 44500
   }
  ]
 },
 "gotv": {
  "name": "GOtv",
  "color": "#7cb342",
  "plans": [
   {
    "name": "Smallie",
    "price": 1900
   },
   {
    "name": "Jinja",
    "price": 3900
   },
   {
    "name": "Jolli",
    "price": 5800
   },
   {
    "name": "Max",
    "price": 8500
   },
   {
    "name": "Supa",
    "price": 11400
   }
  ]
 },
 "startimes": {
  "name": "StarTimes",
  "color": "#f57c00",
  "plans": [
   {
    "name": "Nova",
    "price": 1900
   },
   {
    "name": "Basic",
    "price": 3700
   },
   {
    "name": "Smart",
    "price": 4700
   },
   {
    "name": "Classic",
    "price": 5500
   },
   {
    "name": "Super",
    "price": 9000
   }
  ]
 }
};

/** ₦ per $1 (selling rate for USD services) */
export const usdRate = 1580;

export const productById = (id: string) => products.find((p) => p.id === id);
export const categoryById = (id: string) => categories.find((c) => c.id === id);
export const airportByCode = (code: string) => airports.find((a) => a.code === code);
export const airlineByCode = (code: string) => airlines.find((a) => a.code === code);
export const giftcardById = (id: string) => giftcards.find((g) => g.id === id);
export const networkById = (id: string) => networks.find((n) => n.id === id);
