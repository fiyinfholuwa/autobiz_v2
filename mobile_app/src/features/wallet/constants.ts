/* Wallet constants & helpers — ported from app/wallet.html */
import { usdRate } from "@/data/catalog";
import { naira, startOfDay } from "@/lib/format";
import { hash31 } from "@/lib/random";
import { app } from "@/store";

export const BUY_RATE = usdRate;
export const SELL_RATE = usdRate - 30;

export const BANKS: { name: string; color: string }[] = [
  { name: "Access Bank", color: "#f47b20" }, { name: "Ecobank", color: "#004c97" }, { name: "Fidelity Bank", color: "#1b3c87" },
  { name: "First Bank", color: "#003b65" }, { name: "FCMB", color: "#5c2d91" }, { name: "GTBank", color: "#e04f1a" },
  { name: "Jaiz Bank", color: "#0a6b3a" }, { name: "Keystone Bank", color: "#004b8d" }, { name: "Kuda MFB", color: "#40196d" },
  { name: "Moniepoint MFB", color: "#0357ee" }, { name: "OPay", color: "#1dcf9f" }, { name: "PalmPay", color: "#6c2bd9" },
  { name: "Polaris Bank", color: "#7b2481" }, { name: "Providus Bank", color: "#e5a823" }, { name: "Stanbic IBTC", color: "#0033a1" },
  { name: "Sterling Bank", color: "#d81f26" }, { name: "UBA", color: "#d42e12" }, { name: "Union Bank", color: "#00a3e0" },
  { name: "Wema Bank", color: "#7b1c6d" }, { name: "Zenith Bank", color: "#e30613" },
];
export const bankColor = (name: string) => BANKS.find((b) => b.name === name)?.color || "#2348ff";
export const bankAbbr = (name: string) =>
  name.replace(/ (Bank|MFB)$/, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();

export const ACCOUNT_NAMES = ["CHINEDU OKEKE", "AISHA BELLO", "TUNDE ADEYEMI", "NGOZI EZE", "IBRAHIM MUSA", "FUNKE ADEBAYO", "EMEKA OBI", "BLESSING UDO", "YUSUF LAWAL", "KEMI BALOGUN"];
export const KNOWN_USERS: Record<string, string> = { chinedu: "Chinedu Okeke", aisha: "Aisha Bello", tunde: "Tunde Adeyemi", ngozi: "Ngozi Eze", emeka: "Emeka Obi", kemi: "Kemi Balogun" };
export const nameFor = (seed: string) => ACCOUNT_NAMES[hash31(seed) % ACCOUNT_NAMES.length];

export type TierLimit = { daily: number; single: number; maxBal: number; next: string | null };
export const TIER_LIMITS: Record<string, TierLimit> = {
  "Tier 1": { daily: 50000, single: 20000, maxBal: 300000, next: "Tier 2" },
  "Tier 2": { daily: 200000, single: 100000, maxBal: 500000, next: "Tier 3" },
  "Tier 3": { daily: 5000000, single: 2000000, maxBal: Infinity, next: null },
};
export const tierLimit = (tier?: string) => TIER_LIMITS[tier || "Tier 1"] || TIER_LIMITS["Tier 1"];

export function usedToday() {
  const t = startOfDay();
  return app().transactions.filter((x) => x.date >= t && x.direction === "out" && x.status !== "failed").reduce((a, x) => a + x.amount, 0);
}

/** Returns an error message if x breaks the tier's single/daily limit. */
export function checkLimit(x: number): string | null {
  const L = tierLimit(app().user.tier);
  const used = usedToday();
  if (x > L.single) return `Single transaction limit for ${app().user.tier} is ${naira(L.single)}`;
  if (used + x > L.daily) return `This exceeds your daily limit (${naira(Math.max(0, L.daily - used))} left today)`;
  return null;
}

export const withdrawFee = (a: number) => (a <= 50000 ? 25 : 50);
