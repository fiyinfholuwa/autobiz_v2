/* Gift card exchange — rates, quotes and the simulated trade review (ported from app/giftcards.html). */
import { toast } from "@/components/overlay";
import { giftcards, usdRate, type GiftCard } from "@/data/catalog";
import { naira, usd } from "@/lib/format";
import { app, type Trade, type TradeStatus } from "@/store";

export const BUY_IDS = ["amazon", "apple", "steam", "google", "playstation", "netflix"];
const EXTRA: Record<string, Pick<GiftCard, "id" | "name" | "icon" | "color">> = {
  netflix: { id: "netflix", name: "Netflix", icon: "bi-play-btn-fill", color: "#e50914" },
};
export type Brand = Pick<GiftCard, "id" | "name" | "icon" | "color">;
export function brand(id: string): Brand {
  return giftcards.find((g) => g.id === id) || EXTRA[id] || { id, name: id, icon: "bi-gift", color: "#e64980" };
}

export const FLAGS: Record<string, string> = { USA: "us", UK: "gb", Canada: "ca", Australia: "au", Germany: "de", Euro: "eu" };
export const ADJ: Record<string, number> = { USA: 0, UK: -15, Canada: -40, Australia: -55, Germany: -35, Euro: -25, Global: -10 };
export const BONUS_MIN = 500;
export const BONUS = 10;
export const PROCESS_MS = 6000;
export const DONE_MS = 14000;
export const BUY_RATE = usdRate;

export const TYPE_INFO: Record<string, { icon: string; desc: string }> = {
  Physical: { icon: "bi-credit-card", desc: "Upload clear photos of the card (front & back)" },
  "E-code": { icon: "bi-upc-scan", desc: "Paste the digital code — no photos needed" },
  "Cash receipt": { icon: "bi-receipt", desc: "Photos of the card + purchase receipt" },
  "No receipt": { icon: "bi-credit-card-2-back", desc: "Physical card without a receipt" },
};
export const typeInfo = (t: string) => TYPE_INFO[t] || TYPE_INFO.Physical;

export const STATUS_TONE: Record<TradeStatus, string> = { Pending: "warning", Processing: "primary", Completed: "success", Failed: "danger" };

export const rateFor = (c: GiftCard, country: string, type: string) => (c.types[type] || 0) + (ADJ[country] || 0);
export const maxRate = (c: GiftCard) => Math.max(...c.countries.flatMap((co) => Object.keys(c.types).map((t) => rateFor(c, co, t))));
export const topRate = () => Math.max(...giftcards.map(maxRate));
export function quote(c: GiftCard, country: string, type: string, totalUsd: number) {
  const base = rateFor(c, country, type);
  const bonus = totalUsd >= BONUS_MIN ? BONUS : 0;
  const rate = base + bonus;
  return { base, bonus, rate, naira: Math.round(totalUsd * rate) };
}

export const maskCode = (s: string) => (s.length <= 6 ? s : s.slice(0, 4) + "••••" + s.slice(-4));
export const cleanCode = (s: string) => s.replace(/[^A-Za-z0-9]/g, "");

/** Buy-side codes: 4×4 chars, alphabet × 31 (so "9" never appears, as on web). */
export function genBuyCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => A[Math.floor(Math.random() * 31)]).join("")).join("-");
}

export const tradeProgress = (t: Trade) =>
  t.status === "Completed" || t.status === "Failed" ? 100 : Math.min(95, Math.round(((Date.now() - t.createdAt) / DONE_MS) * 100));

/** Simulated review of sell trades. Runs every second from the root layout. */
export function tickTrades(): void {
  const s = app();
  const trades = s.trades;
  if (!trades?.length) return;
  const now = Date.now();
  let changed = false;
  const completed: Trade[] = [];
  const failed: Trade[] = [];
  const next = trades.map((t) => {
    if (t.side !== "sell" || t.status === "Completed" || t.status === "Failed") return t;
    const age = now - t.createdAt;
    let u = t;
    if (age >= PROCESS_MS && u.status === "Pending") {
      u = { ...u, status: "Processing", timeline: [...u.timeline, { s: "Processing", at: Math.min(now, t.createdAt + PROCESS_MS) }] };
      changed = true;
    }
    if (age >= DONE_MS) {
      const at = Math.min(now, t.createdAt + DONE_MS);
      if (u.failReason) {
        u = { ...u, status: "Failed", reason: u.failReason, timeline: [...u.timeline, { s: "Failed", at }] };
        failed.push(u);
      } else {
        const credit = !u.credited;
        u = { ...u, status: "Completed", credited: true, timeline: [...u.timeline, { s: "Completed", at }] };
        if (credit) completed.push(u);
      }
      changed = true;
    }
    return u;
  });
  if (!changed) return;
  // persist BEFORE crediting so a trade can never be paid twice
  s.set("trades", next);

  for (const t of completed) {
    const tx = app().credit(t.naira, { type: "giftcard", title: `${t.cardName} Card Sold`, subtitle: `${usd(t.usd)} · ${t.type}`, icon: "bi-gift", tone: "pink" });
    app().update("trades", (l) => l.map((x) => (x.id === t.id ? { ...x, txId: tx.id } : x)));
    app().notify({ icon: "bi-gift", tone: "pink", title: "Gift card trade completed", body: `${naira(t.naira)} from your ${t.cardName} ${usd(t.usd)} trade has been credited.` });
  }
  if (completed.length === 1) toast(`**${completed[0].cardName} trade completed**\n${naira(completed[0].naira)} credited to your wallet`, "success", { duration: 5000 });
  else if (completed.length > 1) toast(`**${completed.length} trades completed**\n${naira(completed.reduce((a, t) => a + t.naira, 0))} credited to your wallet`, "success", { duration: 5000 });

  for (const t of failed) {
    app().notify({ icon: "bi-x-octagon", tone: "danger", title: "Gift card trade declined", body: `${t.cardName} ${usd(t.usd)}: ${t.reason}` });
    toast(`**${t.cardName} trade declined**\n${t.reason}`, "error", { duration: 6000 });
  }
}
