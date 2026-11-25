/* Marketplace helpers — port of autobiz_v2/assets/js/shop.js (window.SHOP). */
import { categoryById, productById, products, type Product } from "@/data/catalog";
import { DAYS, MONTHS } from "@/lib/format";
import { CODE_ALPHABET, seeded } from "@/lib/random";
import { app } from "@/store";
import type { CartLine, DeliveryMethod, Order, TimelineStep } from "@/store";
import { toast } from "@/components/overlay";

export const STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];
const ZONE2 = ["Ogun", "Oyo", "Osun", "Ondo", "Ekiti", "FCT - Abuja", "Rivers", "Edo", "Delta", "Anambra", "Enugu"];
export const ZONES = { 1: { fee: 2000, days: [1, 2] }, 2: { fee: 3000, days: [2, 4] }, 3: { fee: 4500, days: [3, 6] } } as const;
export const EXPRESS_FEE = 3500;
export const PICKUP_HUBS: Record<number, string[]> = {
  1: ["AutoBiz Hub — Ikeja City Mall", "AutoBiz Hub — Lekki Phase 1", "AutoBiz Hub — Yaba Tech Plaza"],
  2: ["AutoBiz Hub — City Centre", "Partner Pickup — Shoprite Mall"],
  3: ["Partner Pickup — GIG Logistics office"],
};
export const zoneOf = (state: string): 1 | 2 | 3 => (state === "Lagos" ? 1 : ZONE2.includes(state) ? 2 : 3);
export const hubsFor = (state: string) => PICKUP_HUBS[zoneOf(state)];

const COLOR_NAMES: Record<string, string> = {
  "#1b1f3b": "Midnight", "#a3b8ff": "Sky Blue", "#e9e3d5": "Cream", "#3b3b3d": "Black Titanium", "#c9c2b6": "Natural Titanium", "#f2f2f2": "White Titanium",
  "#111": "Black", "#6ad": "Ocean Blue", "#a8e": "Lavender", "#2e3440": "Midnight", "#d8dee9": "Starlight", "#e8e4dc": "Silver", "#fff": "White",
  "#e64980": "Rose", "#f59f00": "Mustard", "#12b886": "Emerald", "#8b5e3c": "Brown", "#c0c0c0": "Silver", "#ff8fab": "Pink",
};
export const colorName = (hex?: string | null) => (hex ? COLOR_NAMES[hex.toLowerCase()] || hex : "");
/** expand #abc → #aabbcc for RN */
export const cssColor = (hex: string) => (/^#[0-9a-f]{3}$/i.test(hex) ? "#" + hex.slice(1).split("").map((x) => x + x).join("") : hex);

export const disc = (p: Product) => (p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);
export const catName = (id: string) => categoryById(id)?.name || id;

export const SHORT_DESC: Record<string, string> = {
  phones: "Flagship performance, all-day battery and a stunning display — with official warranty.",
  electronics: "Genuine, brand-new and covered by manufacturer warranty. Shipped sealed.",
  fashion: "Quality materials, comfortable fit and made to turn heads at any occasion.",
  home: "Built for Nigerian homes — durable, energy efficient and easy to use.",
  beauty: "Dermatologically tested, cruelty free and loved by thousands of customers.",
  groceries: "Fresh stock from trusted distributors, sealed and delivered to your door.",
  gaming: "Next-level play with genuine hardware and full seller warranty.",
  digital: "Code delivered instantly to your orders page and email after payment.",
};
export const shortDesc = (p: Product) => SHORT_DESC[p.category] || catName(p.category);

export const FEATURES: Record<string, string[]> = {
  phones: ["Super-bright AMOLED display for crisp viewing outdoors", "All-day battery with fast charging support", "Pro-grade camera system for low-light shots", "Official Nigerian warranty & genuine accessories"],
  electronics: ["Genuine brand-new unit, sealed in original box", "Covered by manufacturer warranty", "Energy efficient and built to last", "Free technical support from the seller"],
  fashion: ["Premium fabric, colour-fast and breathable", "Tailored fit — check size guide before ordering", "Hand-finished by Nigerian artisans", "Easy 7-day exchange for size issues"],
  home: ["Designed for Nigerian voltage & power conditions", "Durable build with easy-clean surfaces", "Energy-saving operation", "Seller warranty included"],
  beauty: ["Dermatologically tested ingredients", "Suitable for all skin types", "Cruelty free, no harsh chemicals", "Sealed for hygiene"],
  groceries: ["Fresh stock from trusted distributors", "Sealed, tamper-proof packaging", "Long shelf life", "Bulk-friendly pricing"],
  gaming: ["Genuine hardware from authorised distributors", "Ultra-low latency for competitive play", "Plug & play setup", "Full seller warranty"],
  digital: ["Code delivered instantly after payment", "Redeemable on the official platform", "Step-by-step redemption guide included", "Full refund if the code fails to redeem"],
};

/* ---------------- Cart / wishlist ---------------- */
export const inCartQty = (id: string) => app().cart.filter((l) => l.id === id).reduce((a, l) => a + l.qty, 0);

export function lineFor(p: Product, color: string | null): Omit<CartLine, "qty"> {
  return { id: p.id, name: p.name, price: p.price, icon: p.icon, tone: p.tone, color, seller: p.seller, digital: !!p.digital };
}

/** Adds to cart honouring stock. Returns false if nothing could be added. */
export function addToCart(id: string, qty = 1, color?: string | null, opts: { silent?: boolean; onView?: () => void } = {}): boolean {
  const p = productById(id);
  if (!p) return false;
  const left = p.stock - inCartQty(id);
  if (left <= 0) {
    toast(`You already have the maximum available (${p.stock}) in your cart`, "warning");
    return false;
  }
  const c = color ?? p.colors?.[0] ?? null;
  const existing = app().cart.find((l) => l.id === id && l.color === c);
  app().cartAdd(lineFor(p, c), Math.min(qty, left), (existing?.qty || 0) + left);
  if (!opts.silent) toast(`**${p.name}** added to cart`, "success", opts.onView ? { action: { label: "View cart", onPress: opts.onView } } : {});
  return true;
}

export function toggleWish(id: string, onView?: () => void) {
  const p = productById(id);
  const added = app().wishlistToggle(id);
  if (added) toast(`**${p?.name}** saved to your wishlist`, "success", onView ? { action: { label: "View wishlist", onPress: onView } } : {});
  else toast("Removed from wishlist", "info");
  return added;
}

/* ---------------- Delivery ---------------- */
export const allFree = (items: CartLine[]) => items.every((l) => { const p = productById(l.id); return l.digital || p?.freeShipping || p?.digital; });
export const allDigital = (items: CartLine[]) => items.length > 0 && items.every((l) => l.digital);
export const anyDigital = (items: CartLine[]) => items.some((l) => l.digital);

export function deliveryFee(items: CartLine[], method: DeliveryMethod, state: string) {
  if (!items.length || allDigital(items) || method === "pickup" || method === "digital") return 0;
  const base = allFree(items) ? 0 : ZONES[zoneOf(state)].fee;
  return method === "express" ? base + EXPRESS_FEE : base;
}

function addBusinessDays(n: number) {
  const d = new Date();
  let left = n;
  while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) left--; }
  return d;
}
const etaFmt = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
export function eta(state: string, method: DeliveryMethod) {
  if (method === "digital") return "Instant";
  const [a, b] = ZONES[zoneOf(state)].days;
  const r = method === "express" ? [1, Math.max(1, a)] : method === "pickup" ? [a, b - 1 || a] : [a, b];
  const x = etaFmt(addBusinessDays(r[0])), y = etaFmt(addBusinessDays(r[1]));
  return x === y ? x : `${x} – ${y}`;
}
/** single-product delivery fee estimate (product page) */
export function productDeliveryFee(p: Product, method: "standard" | "express" | "pickup", state: string) {
  if (p.digital || method === "pickup") return 0;
  const base = p.freeShipping ? 0 : ZONES[zoneOf(state)].fee;
  return method === "express" ? base + EXPRESS_FEE : base;
}

export const METHOD_LABEL: Record<DeliveryMethod, string> = { standard: "Standard delivery", express: "Express delivery", pickup: "Pickup station", digital: "Instant digital delivery" };

/* ---------------- Orders ---------------- */
export const ORDER_STATUS = {
  processing: { label: "Processing", tone: "warning", icon: "bi-hourglass-split" },
  shipped: { label: "Shipped", tone: "primary", icon: "bi-truck" },
  delivered: { label: "Delivered", tone: "success", icon: "bi-check2-circle" },
  cancelled: { label: "Cancelled", tone: "danger", icon: "bi-x-circle" },
} as const;

export function voucherCode(orderId: string, itemId: string, n: number) {
  const r = seeded(orderId + itemId + n);
  let s = "";
  for (let i = 0; i < 16; i++) s += CODE_ALPHABET[Math.floor(r() * CODE_ALPHABET.length)];
  return s.match(/.{4}/g)!.join("-");
}

export function buildTimeline(method: DeliveryMethod): TimelineStep[] {
  const now = Date.now();
  if (method === "digital")
    return [
      { key: "placed", label: "Order placed", note: "Payment received", done: true, date: now },
      { key: "confirmed", label: "Code generated", note: "Vouchers issued by supplier", done: false },
      { key: "delivered", label: "Delivered", note: "Sent to your orders page & email", done: false },
    ];
  const pickup = method === "pickup";
  return [
    { key: "placed", label: "Order placed", note: "We've received your order", done: true, date: now },
    { key: "confirmed", label: "Confirmed by seller", note: "Seller is packing your items", done: false },
    { key: "shipped", label: "Shipped", note: pickup ? "On the way to pickup hub" : "Handed to logistics partner", done: false },
    { key: "out", label: pickup ? "Ready for pickup" : "Out for delivery", note: pickup ? "Bring your order ID" : "Rider is on the way", done: false },
    { key: "delivered", label: pickup ? "Picked up" : "Delivered", note: "Enjoy your purchase!", done: false },
  ];
}

export const isDigitalOrder = (o: Order) => o.items.some((i) => i.digital);
export const canCancel = (o: Order) => o.status === "processing" && !isDigitalOrder(o);
export const orderUnits = (o: Order) => o.items.reduce((a, i) => a + i.qty, 0);

/** Demo auto-progression of orders (root layout calls this on launch and every 15s). */
export function advanceOrders(): void {
  const s = app();
  if (!s.orders.length) return;
  const now = Date.now();
  let changed = false;
  const orders = s.orders.map((o) => {
    if (o.status === "cancelled" || o.status === "delivered") return o;
    const age = now - o.date;
    const tl = o.timeline.map((t) => ({ ...t }));
    const mark = (key: string, offset: number) => {
      const st = tl.find((t) => t.key === key);
      if (st && !st.done) { st.done = true; st.date = o.date + offset; changed = true; return true; }
      return false;
    };
    const next: Order = { ...o, timeline: tl };
    if (o.method === "digital") {
      if (age >= 20000) {
        mark("confirmed", 5000); mark("delivered", 20000);
        if (next.status !== "delivered") { next.status = "delivered"; next.paid = true; changed = true; }
      }
    } else {
      const speed = o.method === "express" ? 0.5 : 1;
      if (age >= 30000) mark("confirmed", 30000);
      if (age >= 180000 * speed) { mark("shipped", 180000 * speed); if (next.status === "processing") { next.status = "shipped"; changed = true; } }
      if (age >= 480000 * speed) mark("out", 480000 * speed);
      if (age >= 900000 * speed) {
        mark("delivered", 900000 * speed);
        if (next.status !== "delivered") { next.status = "delivered"; next.paid = true; changed = true; }
      }
    }
    return next;
  });
  if (changed) s.set("orders", orders);
}

/** Re-add an order's items to the cart, capped by stock. */
export function reorder(o: Order, onView?: () => void) {
  let added = 0, limited = false;
  for (const it of o.items) {
    const p = productById(it.id);
    if (!p) continue;
    const left = p.stock - inCartQty(p.id);
    const q = Math.min(it.qty, left);
    if (q < it.qty) limited = true;
    if (q <= 0) continue;
    const existing = app().cart.find((l) => l.id === p.id && l.color === it.color);
    app().cartAdd(lineFor(p, it.color), q, (existing?.qty || 0) + q);
    added += q;
  }
  if (!added) return toast("These items are already in your cart at maximum stock", "warning");
  toast(`${added} item${added > 1 ? "s" : ""} added to your cart${limited ? " (limited by stock)" : ""}`, "success", onView ? { action: { label: "Go to cart", onPress: onView } } : {});
}

/* ---------------- Reviews / seller (seeded) ---------------- */
const GOOD = [
  ["Exactly as described", "Original product, well packaged and delivery was faster than I expected. Will buy again."],
  ["Worth every naira", "Compared prices across 3 stores and this was the best deal. Seller was responsive too."],
  ["Very impressed", "Quality is top notch. Paid from my AutoBiz wallet and got it in 2 days."],
  ["Great value", "Does everything I need. The discount made it a no-brainer."],
  ["Fast delivery", "Rider called before arriving, item was sealed. 10/10 experience."],
];
const MID = [["Good but…", "Product is good, but delivery took a day longer than estimated."], ["Decent", "Works fine. Packaging could be better but item was intact."]];
const LOW = [["Not for me", "Item is okay but didn't meet my expectations. Customer support helped with a return."]];
const RNAMES = ["Chinedu O.", "Aisha B.", "Tunde A.", "Ngozi E.", "Ibrahim M.", "Funke L.", "Emeka N.", "Zainab Y.", "Segun F.", "Blessing K.", "Kelechi U.", "Halima S."];
const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu", "Kano", "Benin City", "Owerri"];

export type Review = { id: number; stars: number; title: string; body: string; name: string; city: string; date: number; helpful: number; variant?: string };
export function genReviews(p: Product): Review[] {
  const r = seeded(p.id);
  const out: Review[] = [];
  for (let i = 0; i < 8; i++) {
    const x = r();
    const stars = x < 0.62 ? 5 : x < 0.86 ? 4 : x < 0.95 ? 3 : 2;
    const pool = stars >= 4 ? GOOD : stars === 3 ? MID : LOW;
    const [title, body] = pool[Math.floor(r() * pool.length)];
    const name = RNAMES[Math.floor(r() * RNAMES.length)];
    const city = CITIES[Math.floor(r() * CITIES.length)];
    const days = Math.floor(r() * 60 + i * 3);
    const helpful = Math.floor(r() * 40);
    const variant = p.colors ? colorName(p.colors[Math.floor(r() * p.colors.length)]) : undefined;
    out.push({ id: i, stars, title, body, name, city, date: Date.now() - days * 864e5, helpful, variant });
  }
  return out.sort((a, b) => b.date - a.date);
}
export function ratingBreakdown(p: Product) {
  const w = [5, 4, 3, 2, 1].map((k) => Math.exp(-(5 - k) * (5.25 - p.rating) * 1.9));
  const sum = w.reduce((a, b) => a + b, 0);
  return [5, 4, 3, 2, 1].map((k, i) => ({ k, count: Math.round((p.reviews * w[i]) / sum) }));
}
export function sellerStats(seller: string) {
  const r = seeded(seller);
  return {
    rating: (4.3 + r() * 0.6).toFixed(1),
    score: 86 + Math.floor(r() * 13),
    followers: 2 + Math.floor(r() * 80),
    years: 1 + Math.floor(r() * 6),
    items: products.filter((x) => x.seller === seller).length,
  };
}
export const flashClaimed = (id: string) => 40 + Math.floor(seeded(id + "f")() * 55);

export function warranty(p: Product) {
  if (p.digital) return "Code validity guaranteed";
  if (p.category === "phones" || p.category === "electronics") return "12 months manufacturer";
  if (p.category === "gaming") return "12 months seller";
  if (p.category === "home") return "6 months seller";
  return "7-day return policy";
}
