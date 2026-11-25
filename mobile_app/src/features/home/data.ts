/* Dashboard derivations — ported from app/dashboard.html */
import { DAYS, MONTHS, addDays, date as fmtDate, startOfDay } from "@/lib/format";
import type { Esim, Tx } from "@/store";

const DAY = 864e5;
const outOk = (t: Tx) => t.direction === "out" && t.status === "success";
const sumOut = (txs: Tx[], lo: number, hi: number, types?: string[]) =>
  txs.filter((t) => outOk(t) && t.date >= lo && t.date < hi && (!types || types.includes(t.type))).reduce((a, t) => a + t.amount, 0);

export const monthStart = (offset = 0) => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + offset, 1).getTime(); };

export function spentThisMonth(txs: Tx[]) { return sumOut(txs, monthStart(0), monthStart(1)); }

export type UpcomingBill = { due: number; provider: string; name: string; last: string; amount?: number; href: string };
export function upcomingBills(txs: Tx[], esims: Esim[]): UpcomingBill[] {
  const now = Date.now();
  const out: UpcomingBill[] = [];
  const cable = txs.find((t) => t.type === "cable" && t.status === "success") || txs.find((t) => t.type === "cable");
  if (cable) {
    const d = new Date(cable.date); d.setMonth(d.getMonth() + 1);
    out.push({ due: d.getTime(), provider: "DStv", name: cable.title, last: fmtDate(cable.date), amount: cable.amount, href: "/(tabs)/pay?tab=cable" });
  } else out.push({ due: now + 6 * DAY, provider: "DStv", name: "DStv Compact", last: "—", amount: 19000, href: "/(tabs)/pay?tab=cable" });
  const elec = txs.find((t) => t.type === "electricity" && t.status === "success");
  if (elec) out.push({ due: elec.date + 14 * DAY, provider: "Electricity", name: elec.title, last: fmtDate(elec.date), amount: elec.amount, href: "/(tabs)/pay?tab=electricity" });
  else out.push({ due: now + 9 * DAY, provider: "Electricity", name: "Prepaid token", last: "—", amount: 10000, href: "/(tabs)/pay?tab=electricity" });
  const es = esims.find((e) => e.status === "Active" && e.expiresAt);
  if (es) out.push({ due: es.expiresAt!, provider: "eSIM", name: `${es.country} ${es.data}`, last: "Expires", href: "/esim?tab=mine" });
  return out.sort((a, b) => a.due - b.due).slice(0, 2);
}

const BASE = { weekCur: [38, 22, 41, 30, 52, 47, 26], weekPrev: [31, 28, 35, 36, 40, 44, 33], monthCur: [180, 240, 210, 305], monthPrev: [160, 220, 260, 280] };

export function chartSeries(txs: Tx[], mode: "week" | "month") {
  if (mode === "week") {
    const today = startOfDay();
    const labels: string[] = [], cur: number[] = [], prev: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(today, -i);
      const k = 6 - i;
      labels.push(DAYS[new Date(d).getDay()]);
      cur.push(BASE.weekCur[k] * 1000 + sumOut(txs, d, addDays(d, 1)));
      prev.push(BASE.weekPrev[k] * 1000 + sumOut(txs, addDays(d, -7), addDays(d, -6)));
    }
    return { labels, cur, prev, legend: ["This week", "Last week"] as [string, string] };
  }
  const ms = monthStart(0), ls = monthStart(-1);
  const labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
  const cur = labels.map((_, i) => BASE.monthCur[i] * 1000 + sumOut(txs, ms + i * 7 * DAY, ms + (i + 1) * 7 * DAY));
  const prev = labels.map((_, i) => BASE.monthPrev[i] * 1000 + sumOut(txs, ls + i * 7 * DAY, ls + (i + 1) * 7 * DAY));
  return { labels, cur, prev, legend: ["This month", "Last month"] as [string, string] };
}

export const EXPENSE_CATS = [
  { label: "Shopping", icon: "bi-bag", tone: "violet", types: ["shop"], type: "shop", base: 42000 },
  { label: "Bills & Utilities", icon: "bi-lightning-charge", tone: "orange", types: ["electricity", "cable", "education", "betting"], type: "electricity", base: 31000 },
  { label: "Airtime & Data", icon: "bi-phone", tone: "warning", types: ["airtime", "data"], type: "airtime", base: 6500 },
  { label: "Travel", icon: "bi-airplane", tone: "cyan", types: ["flight", "esim"], type: "flight", base: 0 },
  { label: "USD Cards", icon: "bi-credit-card-2-front", tone: "success", types: ["card"], type: "card", base: 12000 },
  { label: "Transfers", icon: "bi-send", tone: "primary", types: ["transfer", "withdrawal"], type: "transfer", base: 25000 },
];

export function expenses(txs: Tx[]) {
  return EXPENSE_CATS.map((cat) => {
    const cur = sumOut(txs, monthStart(0), monthStart(1), cat.types);
    const prev = cat.base + sumOut(txs, monthStart(-1), monthStart(0), cat.types);
    const change = prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);
    return { ...cat, cur, change };
  });
}

export const monthLabel = () => { const d = new Date(); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

/** "**** 4821" / "**** **** **** 4821" for long digit strings */
export function maskNumber(n: string) {
  const d = n.replace(/\s/g, "");
  if (/^\d+$/.test(d) && d.length >= 10) return d.length === 10 ? `**** ${d.slice(-4)}` : `**** **** **** ${d.slice(-4)}`;
  return n;
}
