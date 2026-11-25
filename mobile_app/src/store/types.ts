/* Domain types shared across features. Shapes mirror the web app's localStorage store. */

export type TxType =
  | "airtime" | "data" | "electricity" | "cable" | "betting" | "education"
  | "funding" | "withdrawal" | "transfer" | "convert" | "giftcard" | "shop"
  | "esim" | "flight" | "card" | "refund";

export type TxStatus = "success" | "pending" | "failed";

export type Tx = {
  id: string;
  type: TxType | string;
  title: string;
  subtitle?: string;
  amount: number;
  direction: "in" | "out";
  status: TxStatus;
  icon: string;
  tone: string;
  date: number;
  ref?: string;
  meta?: Record<string, string>;
  /** support ticket id once an issue was reported */
  reported?: string;
};
export type TxInput = Omit<Partial<Tx>, "amount" | "direction"> & { type: string; title: string };

export type User = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tier: "Tier 1" | "Tier 2" | "Tier 3";
  username: string;
  referral?: string;
  joined?: number;
  bvnVerified?: boolean;
  ninVerified?: boolean;
};

export type Notification = { id: number; icon: string; tone: string; title: string; body: string; time: number; read: boolean };

export type CartLine = { id: string; name: string; price: number; icon: string; tone: string; qty: number; color: string | null; seller: string; digital: boolean };

export type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled";
export type DeliveryMethod = "standard" | "express" | "pickup" | "digital";
export type TimelineStep = { key: string; label: string; note: string; done: boolean; date?: number };
export type Address = { name: string; phone: string; email: string; state: string; city: string; street: string; landmark: string };
export type Order = {
  id: string;
  date: number;
  status: OrderStatus;
  items: (CartLine & { codes?: string[] })[];
  subtotal: number;
  discount: number;
  coupon: string | null;
  deliveryFee: number;
  total: number;
  address: Address;
  method: DeliveryMethod;
  pickupHub: string | null;
  payment: "wallet" | "pod";
  paid: boolean;
  txId: string | null;
  eta: string;
  timeline: TimelineStep[];
  cancelReason?: string;
  refunded?: boolean;
  refundTxId?: string;
};

export type Esim = {
  id: string;
  iccid: string;
  country: string;
  code: string;
  regional: boolean;
  icon: string | null;
  plan: string;
  data: string;
  gb: number;
  days: number;
  price: number;
  usd: number;
  status: "Not installed" | "Active" | "Expired";
  purchasedAt: number;
  activatedAt: number | null;
  expiresAt: number | null;
  topups: { data: string; gb: number; days: number; price: number; at: number }[];
  archived: boolean;
  txId: string;
  activationCode: string;
};

export type FlightSegment = { from: string; to: string; fromCity: string; toCity: string; dep: number; arr: number; mins: number; flightNo: string };
export type Flight = {
  id: string; airline: string; flightNo: string; from: string; to: string; date: string;
  dep: number; arr: number; duration: number; stops: number; via: { code: string; city: string } | null;
  segments: FlightSegment[]; layover: number; price: number; refundable: boolean; seatsLeft: number; domestic: boolean;
};
export type Cabin = "Economy" | "Premium" | "Business" | "First";
export type Passenger = { type: "adult" | "child" | "infant"; label: string; title: string; first: string; last: string; dob: string; passport: string; expiry?: string; nationality: string };
export type Booking = {
  id: string; pnr: string; trip: "oneway" | "round" | "multi"; cabin: Cabin;
  legs: { from: string; to: string; date: string; flight: Flight }[];
  passengers: Passenger[];
  seats: Record<string, { seat: string; price: number }>;
  seatsSkipped: boolean;
  addons: { bags: number; insurance: boolean; priority: boolean };
  contact: { email: string; phone: string };
  fare: number; taxes: number; total: number; refundable: boolean;
  status: "Confirmed" | "Cancelled";
  createdAt: number; txId: string;
  refund?: number; cancelledAt?: number;
};

export type CardTx = {
  id: string; kind: "purchase" | "topup" | "withdraw"; direction: "in" | "out"; title: string; merchant?: string;
  note: string; amount: number; status: "success" | "pending" | "declined" | "reversed"; date: number;
};
export type VirtualCard = {
  id: string; name: string; brand: "visa" | "mastercard"; number: string; expiry: string; cvv: string;
  balance: number; status: "active" | "frozen"; gradient: string[]; themeId: string; label: string; limit: number;
  createdAt: number; txns: CardTx[];
};

export type TradeStatus = "Pending" | "Processing" | "Completed" | "Failed";
export type Trade = {
  id: string; side: "sell" | "buy"; card: string; cardName: string; country: string; type: string;
  face: number; qty: number; usd: number; rate: number; bonus: number; naira: number; fee?: number;
  status: TradeStatus; images?: number; codes: string[]; note?: string; email?: string;
  createdAt: number; timeline: { s: TradeStatus; at: number }[]; credited?: boolean;
  failReason?: string | null; reason?: string; txId?: string;
};

export type Beneficiary = { id: string; kind: "phone" | "meter" | "smartcard"; value: string; network?: string; provider?: string; meterType?: string; label: string };
export type BankAccount = { id: string; bank: string; number: string; name: string };
export type Session = { id: string; device: string; loc: string; ip: string; last: number; icon: string; current?: boolean };

export type ThemeMode = "light" | "dark" | "system";
export type Settings = {
  themeMode: ThemeMode;
  hideBalance: boolean;
  pinSet: boolean;
  /** demo-only: the transaction PIN chosen at sign-up / PIN change. Undefined → any PIN except 0000 works. */
  pin?: string;
  pinChangedAt?: number;
  twoFA: boolean;
  budget: number;
  notif: Record<string, boolean>;
  marketView: "grid" | "list";
  following: Record<string, boolean>;
};

export type AuthState = { authed: boolean; remember: boolean; onboarded: boolean };
