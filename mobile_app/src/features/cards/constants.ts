/* Virtual cards — constants, generators and state helpers (ported from app/virtual-cards.html). */
import { create } from "zustand";
import { usdRate } from "@/data/catalog";
import { ref } from "@/lib/format";
import { round2 } from "@/lib/random";
import { app, type CardTx, type VirtualCard } from "@/store";

export const RATE = usdRate || 1580; // ₦/$ when funding
export const SELL_RATE = RATE - 40; // ₦/$ when withdrawing / terminating
export const CREATE_FEE = 2;
export const FUND_FEE = 0.01;
export const MIN_CREATE = 5;
export const MIN_FUND = 1;
export const MAX_BAL = 10000;
export const MAX_CARDS = 5;
export const MAX_INITIAL = 2500;
export const DEFAULT_LIMIT = 1000;
export const r2 = round2;

export type Theme = { id: string; name: string; colors: string[]; locations: number[] };
export const THEMES: Theme[] = [
  { id: "midnight", name: "Midnight", colors: ["#2b3a9e", "#141b4d", "#0b1230"], locations: [0, 0.55, 1] },
  { id: "aurora", name: "Aurora", colors: ["#7048e8", "#b43fb0", "#e64980"], locations: [0, 0.55, 1] },
  { id: "ocean", name: "Ocean", colors: ["#15aabf", "#1971c2", "#2348ff"], locations: [0, 0.55, 1] },
  { id: "emerald", name: "Emerald", colors: ["#20c997", "#0ca678", "#065a45"], locations: [0, 0.45, 1] },
  { id: "sunset", name: "Sunset", colors: ["#ffa94d", "#fd7e14", "#e64980"], locations: [0, 0.4, 1] },
  { id: "onyx", name: "Onyx", colors: ["#495057", "#212529", "#0b0b0f"], locations: [0, 0.5, 1] },
];
export const themeById = (id?: string) => THEMES.find((t) => t.id === id);
export const themeFor = (c: Pick<VirtualCard, "themeId" | "gradient">): Theme =>
  themeById(c.themeId) || { id: "custom", name: "Custom", colors: c.gradient?.length ? c.gradient : THEMES[0].colors, locations: c.gradient?.length === 3 ? [0, 0.55, 1] : [0, 1] };

export const BRANDS = {
  visa: { name: "Visa", panel: "#1a1f71", desc: "Best for subscriptions, ads & most US merchants" },
  mastercard: { name: "Mastercard", panel: "#111111", desc: "Great for AliExpress, Amazon & travel bookings" },
} as const;
export type Brand = keyof typeof BRANDS;

export type Merchant = { name: string; short: string; icon: string; bg: string; fg: string; cat: string };
export const MERCHANTS: Record<string, Merchant> = {
  netflix: { name: "Netflix", short: "Netflix", icon: "bi-play-btn-fill", bg: "#e50914", fg: "#fff", cat: "Streaming" },
  spotify: { name: "Spotify", short: "Spotify", icon: "bi-spotify", bg: "#1db954", fg: "#fff", cat: "Music" },
  aws: { name: "Amazon Web Services", short: "AWS", icon: "bi-amazon", bg: "#232f3e", fg: "#ff9900", cat: "Cloud" },
  aliexpress: { name: "AliExpress", short: "AliExpress", icon: "bi-bag-heart-fill", bg: "#ff4747", fg: "#fff", cat: "Shopping" },
  apple: { name: "Apple.com/bill", short: "Apple", icon: "bi-apple", bg: "#1d1d1f", fg: "#fff", cat: "Apps" },
  google: { name: "Google Workspace", short: "Google", icon: "bi-google", bg: "#4285f4", fg: "#fff", cat: "Productivity" },
  amazon: { name: "Amazon.com", short: "Amazon", icon: "bi-cart-fill", bg: "#ff9900", fg: "#111", cat: "Shopping" },
  meta: { name: "Meta Ads", short: "Meta Ads", icon: "bi-meta", bg: "#0866ff", fg: "#fff", cat: "Advertising" },
  youtube: { name: "YouTube Premium", short: "YouTube", icon: "bi-youtube", bg: "#ff0033", fg: "#fff", cat: "Streaming" },
  steam: { name: "Steam", short: "Steam", icon: "bi-steam", bg: "#171a21", fg: "#66c0f4", cat: "Gaming" },
  microsoft: { name: "Microsoft 365", short: "Microsoft", icon: "bi-microsoft", bg: "#0078d4", fg: "#fff", cat: "Software" },
  openai: { name: "ChatGPT Plus", short: "ChatGPT", icon: "bi-stars", bg: "#10a37f", fg: "#fff", cat: "AI tools" },
  udemy: { name: "Udemy", short: "Udemy", icon: "bi-mortarboard-fill", bg: "#a435f0", fg: "#fff", cat: "Learning" },
  airbnb: { name: "Airbnb", short: "Airbnb", icon: "bi-house-heart-fill", bg: "#ff5a5f", fg: "#fff", cat: "Travel" },
  uber: { name: "Uber", short: "Uber", icon: "bi-car-front-fill", bg: "#000000", fg: "#fff", cat: "Rides" },
  playstation: { name: "PlayStation Store", short: "PlayStation", icon: "bi-playstation", bg: "#003791", fg: "#fff", cat: "Gaming" },
};
export const WORKS_ON = ["netflix", "spotify", "aws", "aliexpress", "apple", "google", "amazon", "meta", "youtube", "openai", "microsoft", "steam"];

export const BILLING: [string, string, string?][] = [
  ["Street", "8 The Green, Suite 7421"],
  ["City", "Dover"],
  ["State", "Delaware (DE)", "Delaware"],
  ["ZIP code", "19901"],
  ["Country", "United States"],
];
export const BILLING_ALL = "8 The Green, Suite 7421, Dover, DE 19901, United States";

export const FEES: [string, string][] = [
  ["Card creation", "$2.00"],
  ["Funding fee", "1%"],
  ["Funding rate", "₦1,580/$"],
  ["Withdrawal rate", "₦1,540/$"],
  ["Monthly maintenance", "Free"],
  ["Min. initial funding", "$5.00"],
  ["Max. card balance", "$10,000.00"],
  ["Monthly spend limit", "up to $5,000"],
  ["Cards per account", "5"],
];

export const FAQ: [string, string][] = [
  ["Where can I use my virtual card?", "Anywhere online that accepts Visa or Mastercard in USD — Netflix, Spotify, Apple, Google, AWS, AliExpress, Amazon, Meta Ads, and millions more."],
  ["Why was my payment declined?", "Common reasons: the card is frozen, the balance is lower than the charge, your monthly limit has been reached, or the billing address entered doesn't match the one shown here."],
  ["Can I get my money back to Naira?", "Yes. Use **Withdraw** to move USD back to your Naira wallet at ₦1,540/$. Terminating a card also refunds its full balance."],
  ["Is it safe to save my card on websites?", "Yes. Your card details are only shown after PIN verification and auto-hide after 30 seconds. You can freeze the card instantly if anything looks wrong."],
  ["How many cards can I have?", "Up to 5 active cards — great for separating subscriptions, ads and shopping."],
];

/* ---------------- Number generation (Luhn) ---------------- */
const rd = () => Math.floor(Math.random() * 10);
function luhnCheck(partial: string) {
  let sum = 0;
  // positions from the right, check digit will be appended (so double every other starting at rightmost of partial)
  for (let i = 0; i < partial.length; i++) {
    let d = Number(partial[partial.length - 1 - i]);
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return String((10 - (sum % 10)) % 10);
}
export function genNumber(brand: Brand) {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  let p = brand === "visa" ? "4" + pick(["53958", "84718", "16631"]) : pick(["5399", "5196", "2223"]);
  while (p.length < 15) p += rd();
  return p + luhnCheck(p);
}
export const PREVIEW_NUMBER: Record<Brand, string> = { visa: "4539580000004821", mastercard: "5399000000004821" };

export const last4 = (n: string) => n.slice(-4);
export const maskNumber = (n: string) => "•••• •••• •••• " + last4(n);
export const groupNumber = (n: string) => n.replace(/(\d{4})(?=\d)/g, "$1 ");

/* ---------------- Fees ---------------- */
export const createCost = (amount: number) => {
  const fee = r2(amount * FUND_FEE);
  const totalUsd = r2(amount + CREATE_FEE + fee);
  return { fee, totalUsd, naira: r2(totalUsd * RATE) };
};
export const fundCost = (a: number) => {
  const fee = r2(a * FUND_FEE);
  return { fee, naira: r2((a + fee) * RATE) };
};

/** Successful purchases this calendar month */
export function monthSpent(c: VirtualCard) {
  const now = new Date();
  return r2(
    c.txns
      .filter((t) => t.kind === "purchase" && t.status === "success")
      .filter((t) => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((a, t) => a + t.amount, 0)
  );
}

/* ---------------- Store helpers ---------------- */
export const getCard = (id: string) => app().cards.find((c) => c.id === id);
export function updateCard(id: string, fn: (c: VirtualCard) => VirtualCard) {
  app().update("cards", (cards) => cards.map((c) => (c.id === id ? fn(c) : c)));
}
export function addCardTx(id: string, tx: Omit<CardTx, "id" | "date"> & { date?: number }): CardTx {
  const t: CardTx = { id: ref("CT"), date: Date.now(), ...tx };
  updateCard(id, (c) => ({ ...c, txns: [t, ...c.txns].slice(0, 80) }));
  return t;
}
export function patchCardTx(cardId: string, txId: string, patch: Partial<CardTx>) {
  updateCard(cardId, (c) => ({ ...c, txns: c.txns.map((t) => (t.id === txId ? { ...t, ...patch } : t)) }));
}

/** Build a new card with seeded demo transactions. */
export function buildCard(opts: { brand: Brand; theme: Theme; label: string; amount: number; holder: string }): VirtualCard {
  const now = Date.now();
  const d = new Date();
  const expiry = String(d.getMonth() + 1).padStart(2, "0") + "/" + String((d.getFullYear() + 3) % 100).padStart(2, "0");
  const demo: [string, number, CardTx["status"], string][] = [
    ["netflix", 1.0, "reversed", "Card verification · reversed"],
    ["spotify", 0.0, "success", "Card linked · $0 authorization"],
    ["aws", 1.0, "reversed", "Account verification hold"],
    ["aliexpress", 12.49, "declined", "Declined · billing address mismatch"],
    ["apple", 0.0, "success", "Apple ID payment method added"],
  ];
  const txns: CardTx[] = [
    { id: ref("CT"), kind: "topup", direction: "in", title: "Initial funding", note: "From NGN wallet", amount: r2(opts.amount), status: "success", date: now },
    ...demo.map(([m, amount, status, note], i) => ({
      id: ref("CT") + i, kind: "purchase" as const, direction: "out" as const, merchant: m, title: MERCHANTS[m].name, note, amount, status, date: now - (i + 1) * 3 * 60000,
    })),
  ];
  return {
    id: "VC" + Date.now().toString(36).toUpperCase(),
    name: opts.holder,
    brand: opts.brand,
    number: genNumber(opts.brand),
    expiry,
    cvv: String(100 + Math.floor(Math.random() * 900)),
    balance: r2(opts.amount),
    status: "active",
    gradient: opts.theme.colors,
    themeId: opts.theme.id,
    label: opts.label,
    limit: DEFAULT_LIMIT,
    createdAt: now,
    txns,
  };
}

/** CSV statement text */
export function statementCsv(c: VirtualCard) {
  const q = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["Date", "Description", "Note", "Direction", "Amount (USD)", "Status"]];
  c.txns.forEach((t) => rows.push([new Date(t.date).toISOString(), t.title, t.note, t.direction, t.amount.toFixed(2), t.status]));
  return rows.map((r) => r.map(q).join(",")).join("\r\n");
}

/* ---------------- Feature UI state (selection, reveal requests) ---------------- */
type CardsUI = { selectedId: string | null; revealRequest: number; select: (id: string | null) => void; requestReveal: (id: string) => void };
export const useCardsUI = create<CardsUI>((set) => ({
  selectedId: null,
  revealRequest: 0,
  select: (id) => set({ selectedId: id }),
  requestReveal: (id) => set((s) => ({ selectedId: id, revealRequest: s.revealRequest + 1 })),
}));
