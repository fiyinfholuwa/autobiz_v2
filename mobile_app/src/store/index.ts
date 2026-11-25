/* ==========================================================================
   AutoBiz mobile — persistent store (zustand + AsyncStorage)
   Acts as the demo backend, exactly like the web app's localStorage store.
   Usage:
     const balance = useApp((s) => s.wallet.balance)      // reactive
     useApp.getState().debit(1000, { type: "airtime", ... })  // imperative
   ========================================================================== */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ref } from "@/lib/format";
import type {
  AuthState, BankAccount, Beneficiary, Booking, CartLine, Esim, Notification, Order, Session, Settings,
  Trade, Tx, TxInput, User, VirtualCard,
} from "./types";

export * from "./types";

export type Data = {
  user: User;
  wallet: { balance: number; usd: number };
  transactions: Tx[];
  cart: CartLine[];
  wishlist: string[];
  orders: Order[];
  esims: Esim[];
  bookings: Booking[];
  cards: VirtualCard[];
  trades: Trade[];
  notifications: Notification[];
  beneficiaries: Beneficiary[];
  bankAccounts: BankAccount[];
  sessions: Session[];
  settings: Settings;
  auth: AuthState;
  /** coupon applied in the cart (web kept this in sessionStorage) */
  coupon: string | null;
};

type Actions = {
  /** replace a top-level key */
  set: <K extends keyof Data>(key: K, value: Data[K]) => void;
  /** functional update of a top-level key */
  update: <K extends keyof Data>(key: K, fn: (v: Data[K]) => Data[K]) => void;
  /** spendable NGN balance (0 for guests) */
  balance: () => number;
  canAfford: (amount: number) => boolean;
  /** debit wallet + add an "out" tx. Returns null if balance is insufficient. */
  debit: (amount: number, tx: TxInput) => Tx | null;
  /** credit wallet + add an "in" tx */
  credit: (amount: number, tx: TxInput) => Tx;
  addTx: (tx: TxInput & { amount: number; direction: "in" | "out" }) => Tx;
  notify: (n: Partial<Notification> & { title: string; body: string }) => void;
  markAllRead: () => void;
  // cart
  cartAdd: (line: Omit<CartLine, "qty">, qty: number, maxQty: number) => void;
  cartSetQty: (index: number, qty: number) => void;
  cartRemove: (index: number) => CartLine | undefined;
  cartInsert: (line: CartLine, index?: number) => void;
  cartClear: () => void;
  cartCount: () => number;
  cartSubtotal: () => number;
  wishlistToggle: (id: string) => boolean;
  // auth
  login: (remember?: boolean) => void;
  logout: () => void;
  completeOnboarding: () => void;
  resetDemo: () => void;
};

export type AppState = Data & Actions;

const H = 36e5;
function seedTransactions(): Tx[] {
  const now = Date.now();
  return [
    { id: "TX" + (now - 2 * H), type: "airtime", title: "MTN Airtime", subtitle: "08031234567", amount: 2000, direction: "out", status: "success", icon: "bi-phone", tone: "warning", date: now - 2 * H },
    { id: "TX" + (now - 5 * H), type: "funding", title: "Wallet Funding", subtitle: "Bank transfer · Wema", amount: 150000, direction: "in", status: "success", icon: "bi-arrow-down-left", tone: "success", date: now - 5 * H },
    { id: "TX" + (now - 26 * H), type: "giftcard", title: "Steam Card Sold", subtitle: "$100 · E-code", amount: 116500, direction: "in", status: "success", icon: "bi-gift", tone: "pink", date: now - 26 * H },
    { id: "TX" + (now - 30 * H), type: "data", title: "Airtel Data 5GB", subtitle: "08021234567", amount: 1425, direction: "out", status: "success", icon: "bi-wifi", tone: "primary", date: now - 30 * H },
    { id: "TX" + (now - 50 * H), type: "electricity", title: "Ikeja Electric Token", subtitle: "Meter 4502 1123 990", amount: 10000, direction: "out", status: "success", icon: "bi-lightning-charge", tone: "warning", date: now - 50 * H },
    { id: "TX" + (now - 75 * H), type: "shop", title: "Marketplace Order", subtitle: "Oraimo FreePods 4", amount: 32500, direction: "out", status: "pending", icon: "bi-bag", tone: "violet", date: now - 75 * H },
    { id: "TX" + (now - 120 * H), type: "cable", title: "DStv Compact", subtitle: "IUC 7023 4411 09", amount: 19000, direction: "out", status: "failed", icon: "bi-tv", tone: "cyan", date: now - 120 * H },
  ];
}

export const DEFAULT_NOTIF_PREFS = { txPush: true, txEmail: true, security: true, priceAlerts: false, promo: false, newsletter: true };

export const defaultData = (): Data => {
  const now = Date.now();
  return {
    user: { firstName: "Adaeze", lastName: "Okafor", email: "adaeze@example.com", phone: "08031234567", tier: "Tier 2", username: "adaeze" },
    wallet: { balance: 285750.5, usd: 120 },
    transactions: seedTransactions(),
    cart: [],
    wishlist: [],
    orders: [],
    esims: [],
    bookings: [],
    cards: [],
    trades: [],
    notifications: [
      { id: 1, icon: "bi-gift", tone: "pink", title: "Gift card rates are up", body: "Apple & Steam cards now trade at up to ₦1,210/$", time: now - 36e5, read: false },
      { id: 2, icon: "bi-airplane", tone: "cyan", title: "Fly Lagos → Dubai from ₦890k", body: "Limited Emirates fares this week only.", time: now - 864e5, read: false },
      { id: 3, icon: "bi-sim", tone: "violet", title: "Travel with eSIM", body: "Stay connected in 120+ countries. No roaming fees.", time: now - 2 * 864e5, read: true },
    ],
    beneficiaries: [],
    bankAccounts: [{ id: "BA1", bank: "GTBank", number: "0123456789", name: "ADAEZE OKAFOR" }],
    sessions: [
      { id: "s1", device: "iPhone 15 · AutoBiz app", loc: "Lagos, Nigeria", ip: "102.89.40.7", last: now, icon: "bi-phone", current: true },
      { id: "s2", device: "MacBook Pro · Chrome", loc: "Lagos, Nigeria", ip: "102.89.34.12", last: now - 2 * H, icon: "bi-laptop" },
      { id: "s3", device: "Windows PC · Edge", loc: "Abuja, Nigeria", ip: "197.210.55.81", last: now - 72 * H, icon: "bi-pc-display" },
    ],
    settings: {
      themeMode: "system", hideBalance: false, pinSet: true, twoFA: false, budget: 300000,
      notif: { ...DEFAULT_NOTIF_PREFS }, marketView: "grid", following: {},
    },
    auth: { authed: false, remember: true, onboarded: false },
    coupon: null,
  };
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      const addTx: Actions["addTx"] = (tx) => {
        const t: Tx = { id: ref("TX"), date: Date.now(), icon: "bi-receipt", tone: "primary", status: "success", ...tx } as Tx;
        set((s) => ({ transactions: [t, ...s.transactions] }));
        return t;
      };
      return {
        ...defaultData(),
        set: (key, value) => set({ [key]: value } as Partial<AppState>),
        update: (key, fn) => set((s) => ({ [key]: fn(s[key]) } as Partial<AppState>)),
        balance: () => (get().auth.authed ? get().wallet.balance : 0),
        canAfford: (amount) => get().balance() >= amount,
        debit: (amount, tx) => {
          if (!get().canAfford(amount)) return null;
          set((s) => ({ wallet: { ...s.wallet, balance: r2(s.wallet.balance - amount) } }));
          return addTx({ status: "success", ...tx, amount, direction: "out" });
        },
        credit: (amount, tx) => {
          set((s) => ({ wallet: { ...s.wallet, balance: r2(s.wallet.balance + amount) } }));
          return addTx({ status: "success", ...tx, amount, direction: "in" });
        },
        addTx,
        notify: (n) =>
          set((s) => ({
            notifications: [{ id: Date.now() + Math.random(), time: Date.now(), read: false, tone: "primary", icon: "bi-bell", ...n }, ...s.notifications].slice(0, 30),
          })),
        markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

        cartAdd: (line, qty, maxQty) =>
          set((s) => {
            const cart = s.cart.map((l) => ({ ...l }));
            const ex = cart.find((l) => l.id === line.id && l.color === line.color);
            if (ex) ex.qty = Math.min(ex.qty + qty, maxQty);
            else cart.push({ ...line, qty: Math.min(qty, maxQty) });
            return { cart };
          }),
        cartSetQty: (index, qty) =>
          set((s) => {
            const cart = [...s.cart];
            if (qty <= 0) cart.splice(index, 1);
            else cart[index] = { ...cart[index], qty };
            return { cart };
          }),
        cartRemove: (index) => {
          const line = get().cart[index];
          set((s) => ({ cart: s.cart.filter((_, i) => i !== index) }));
          return line;
        },
        cartInsert: (line, index) =>
          set((s) => {
            const cart = [...s.cart];
            cart.splice(index ?? cart.length, 0, line);
            return { cart };
          }),
        cartClear: () => set({ cart: [], coupon: null }),
        cartCount: () => get().cart.reduce((a, l) => a + l.qty, 0),
        cartSubtotal: () => get().cart.reduce((a, l) => a + l.price * l.qty, 0),
        wishlistToggle: (id) => {
          const has = get().wishlist.includes(id);
          set((s) => ({ wishlist: has ? s.wishlist.filter((x) => x !== id) : [...s.wishlist, id] }));
          return !has;
        },

        login: (remember = true) => set((s) => ({ auth: { ...s.auth, authed: true, remember, onboarded: true } })),
        logout: () => set((s) => ({ auth: { ...s.auth, authed: false } })),
        completeOnboarding: () => set((s) => ({ auth: { ...s.auth, onboarded: true } })),
        resetDemo: () => set({ ...defaultData(), auth: { ...get().auth } }),
      };
    },
    {
      name: "autobiz_v2",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // persist only data keys (functions are re-created)
      partialize: (s) => {
        const { set: _a, update: _b, ...rest } = s as any;
        const out: any = {};
        for (const k of Object.keys(defaultData())) out[k] = rest[k];
        // "Keep me signed in" off → do not persist the session across launches
        if (!s.auth.remember) out.auth = { ...s.auth, authed: false };
        return out as Data;
      },
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<Data>;
        const d = defaultData();
        return {
          ...current,
          ...p,
          settings: { ...d.settings, ...(p.settings || {}), notif: { ...d.settings.notif, ...(p.settings?.notif || {}) } },
          auth: { ...d.auth, ...(p.auth || {}) },
        } as AppState;
      },
    }
  )
);

/** Non-hook accessor for imperative code (event handlers, timers). */
export const app = () => useApp.getState();

export const TX_TYPE_LABELS: Record<string, string> = {
  airtime: "Airtime", data: "Data", electricity: "Electricity", cable: "Cable TV", betting: "Betting", education: "Education",
  funding: "Wallet funding", withdrawal: "Withdrawal", transfer: "Transfer", convert: "Conversion", giftcard: "Gift card",
  shop: "Marketplace", esim: "eSIM", flight: "Flight", card: "Virtual card", refund: "Refund",
};
export const txTypeLabel = (t?: string) => (t ? TX_TYPE_LABELS[t] || t[0].toUpperCase() + t.slice(1) : "Other");
