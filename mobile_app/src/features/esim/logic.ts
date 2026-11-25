/* eSIM pricing, status and purchase logic — ported from app/esim.html */
import { success, toast } from "@/components/overlay";
import { esimCountries, esimPlanTemplates, esimRegions, usdRate, type EsimCountry, type EsimPlanTemplate } from "@/data/catalog";
import { date, naira, usd } from "@/lib/format";
import { rndCode, rndDigits } from "@/lib/random";
import { app, type Esim, type Tx } from "@/store";

export const DAY = 86400000;
export const RATE = usdRate;

export type Plan = EsimPlanTemplate & { usd: number; ngn: number; label: string };

export function usdPrice(c: EsimCountry, t: EsimPlanTemplate) {
  return Math.max(0.99, Math.round(c.from * t.mult * 10) / 10 - 0.01);
}
export function plansFor(c: EsimCountry): Plan[] {
  return esimPlanTemplates.map((t) => {
    const u = usdPrice(c, t);
    return { ...t, usd: +u.toFixed(2), ngn: Math.round(u * RATE), label: t.unlimited ? "Unlimited" : t.data };
  });
}
export const minFrom = (c: EsimCountry) => Math.min(...plansFor(c).map((p) => p.usd));
export const globalMin = () => Math.min(...esimCountries.map(minFrom));
export const countryByCode = (code: string) => esimCountries.find((c) => c.code === code);
export const regionName = (id: string) => esimRegions.find((r) => r.id === id)?.name || id;

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export function searchCountries(q: string) {
  const n = norm(q.trim());
  if (!n) return [];
  return esimCountries
    .filter((c) => norm(c.name).includes(n) || c.code.toLowerCase() === n || norm(regionName(c.region)).includes(n))
    .sort((a, b) => {
      const ia = norm(a.name).indexOf(n), ib = norm(b.name).indexOf(n);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name);
    })
    .slice(0, 8);
}

export const DEVICES: { group: string; items: [string, 0 | 1][] }[] = [
  { group: "Apple", items: [["iPhone 16 / 16 Pro", 1], ["iPhone 15 / 15 Pro", 1], ["iPhone 14 / 14 Pro", 1], ["iPhone 13 series", 1], ["iPhone 12 series", 1], ["iPhone 11 series", 1], ["iPhone XS / XR", 1], ["iPhone X", 0], ["iPhone 8 / 8 Plus", 0]] },
  { group: "Samsung", items: [["Galaxy S24 / S23 series", 1], ["Galaxy S22 / S21 / S20", 1], ["Galaxy Z Fold / Z Flip", 1], ["Galaxy A55 / A54", 1], ["Galaxy A15 / A05", 0], ["Galaxy Note 20", 1]] },
  { group: "Google", items: [["Pixel 9 / 8 / 7", 1], ["Pixel 6 / 5 / 4", 1], ["Pixel 3a", 0]] },
  { group: "Others", items: [["Tecno Camon 30 / Spark 20", 0], ["Infinix Note 40 / Hot 40", 0], ["itel A70 / S23", 0], ["Xiaomi 14 / 13 Pro", 1], ["Redmi Note 13", 0], ["Huawei P40 / Mate 40", 1], ["Oppo Find X5 / X6", 1], ["Motorola Razr 40", 1]] },
];
export const DEVICE_OPTIONS = DEVICES.flatMap((g) => g.items.map(([m, ok]) => ({ value: m, label: m, sub: g.group, ok: !!ok })));
export const deviceOk = (m: string) => DEVICE_OPTIONS.find((d) => d.value === m)?.ok;

export function computeStatus(e: Esim): Esim["status"] {
  const now = Date.now();
  if (e.status === "Active" && e.expiresAt && now > e.expiresAt) return "Expired";
  if (e.status === "Not installed" && now > e.purchasedAt + 180 * DAY) return "Expired";
  return e.status;
}

export function usedGb(e: Esim) {
  if (computeStatus(e) !== "Active" || !e.activatedAt) return 0;
  const frac = Math.min(1, (Date.now() - e.activatedAt) / (e.days * DAY));
  const seed = (parseInt(e.iccid.slice(-4), 10) % 30) / 100;
  const used = (e.gb >= 999 ? 2 : e.gb) * Math.min(0.97, 0.04 + seed * 0.5 + frac * 0.85);
  return Math.round(used * 100) / 100;
}

export function lpaParts(code: string) {
  const [, smdp = "", act = ""] = code.split("$");
  return { smdp, act };
}

const update = (id: string, fn: (e: Esim) => Esim) => app().update("esims", (l) => l.map((e) => (e.id === id ? fn(e) : e)));

export function activate(id: string) {
  const e = app().esims.find((x) => x.id === id);
  if (!e) return;
  const now = Date.now();
  const expiresAt = now + e.days * DAY;
  update(id, (x) => ({ ...x, status: "Active", activatedAt: now, expiresAt }));
  toast(`**${e.country}** eSIM is active until ${date(expiresAt)}`, "success");
  app().notify({ icon: "bi-sim", tone: "success", title: "eSIM activated", body: `${e.country} · ${e.data}. Validity ends ${date(expiresAt)}.` });
}

export function finishPurchase(c: EsimCountry, p: Plan, qty: number, tx: Tx, onMine: (id: string) => void) {
  const now = Date.now();
  const list: Esim[] = Array.from({ length: qty }, (_, i) => ({
    id: "ES" + Date.now().toString(36).toUpperCase() + i + rndCode(3),
    iccid: "89234" + rndDigits(15),
    country: c.name, code: c.code, regional: !!c.regional, icon: c.icon || null,
    plan: `${p.label} · ${p.days} days`, data: p.label, gb: p.gb, days: p.days,
    price: p.ngn, usd: p.usd, status: "Not installed", purchasedAt: now, activatedAt: null, expiresAt: null,
    topups: [], archived: false, txId: tx.id,
    activationCode: `LPA:1$smdp.autobiz.io$${rndCode(4)}-${rndCode(4)}-${rndCode(4)}-${rndCode(4)}`,
  }));
  app().update("esims", (l) => [...list, ...l]);
  app().notify({ icon: "bi-sim", tone: "violet", title: `${c.name} eSIM ready`, body: `${p.label} · ${p.days} days. Install it before you travel.` });
  success({
    title: "Your eSIM is ready!",
    message: `${qty > 1 ? qty + " eSIMs for " : ""}${c.name} · ${p.label} · ${p.days} days. Scan the QR with the phone you'll travel with.`,
    rows: [["Amount paid", naira(p.ngn * qty, 2)], ["ICCID", list[0].iccid], ["Reference", tx.id]],
    actions: [
      { label: "Install now", icon: "bi-qr-code", onPress: () => onMine(list[0].id) },
      { label: "My eSIMs", variant: "outline", onPress: () => onMine("") },
    ],
  });
  return list;
}

export function finishTopup(e: Esim, p: Plan, tx: Tx) {
  const now = Date.now();
  const expired = computeStatus(e) === "Expired";
  let next: Esim = { ...e, topups: [...e.topups, { data: p.label, gb: p.gb, days: p.days, price: p.ngn, at: now }] };
  if (expired) {
    next = { ...next, status: "Active", activatedAt: now, expiresAt: now + p.days * DAY, days: p.days, gb: p.gb, data: p.label };
  } else {
    if (p.unlimited || e.gb >= 999) { next.gb = 999; next.data = "Unlimited"; }
    else { next.gb = e.gb + p.gb; next.data = `${next.gb} GB`; }
    next.days = e.days + p.days;
    if (e.expiresAt) next.expiresAt = e.expiresAt + p.days * DAY;
  }
  next.plan = `${next.data} · ${next.days} days`;
  update(e.id, () => next);
  app().notify({ icon: "bi-sim", tone: "violet", title: "eSIM topped up", body: `${p.label} added to your ${e.country} eSIM.` });
  success({
    title: "Top-up successful",
    message: `${p.label} · ${p.days} days added to your ${e.country} eSIM. No reinstall needed.`,
    rows: [["Amount paid", naira(p.ngn, 2)], ["New allowance", next.data], ["Validity", next.expiresAt ? `Until ${date(next.expiresAt)}` : `${next.days} days from activation`], ["Reference", tx.id]],
  });
}

export const usdFmt = usd;
