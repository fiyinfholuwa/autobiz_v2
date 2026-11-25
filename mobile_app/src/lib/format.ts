/* Formatting helpers — mirrors AB.fmt from the web app.
   Implemented manually (no Intl dependency) so output is identical on Hermes/Android. */

function group(intStr: string) {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Number with thousands separators. dp undefined → 0–2 decimals (trailing zeros trimmed). */
export function num(n: number, dp?: number): string {
  const v = Number(n) || 0;
  const neg = v < 0;
  const abs = Math.abs(v);
  let s: string;
  if (dp === undefined) {
    const r = Math.round(abs * 100) / 100;
    const [i, d] = r.toFixed(2).split(".");
    s = group(i) + (d === "00" ? "" : "." + d.replace(/0$/, ""));
  } else {
    const [i, d] = abs.toFixed(dp).split(".");
    s = group(i) + (d ? "." + d : "");
  }
  return (neg ? "-" : "") + s;
}

export const naira = (n: number, dp?: number) => {
  const v = Number(n) || 0;
  return (v < 0 ? "-₦" : "₦") + num(Math.abs(v), dp);
};
export const usd = (n: number) => {
  const v = Number(n) || 0;
  return (v < 0 ? "-$" : "$") + num(Math.abs(v), 2);
};
/** ₦12k / ₦1.2m compact form */
export const nairaCompact = (n: number) => {
  const v = Number(n) || 0;
  if (v >= 1e6) return "₦" + (Math.round(v / 1e5) / 10).toString().replace(/\.0$/, "") + "m";
  if (v >= 1e3) return "₦" + Math.round(v / 1e3) + "k";
  return "₦" + Math.round(v);
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export { MONTHS, MONTHS_LONG, DAYS, DAYS_LONG };

const pad = (n: number) => String(n).padStart(2, "0");

/** "25 Nov 2026" */
export const date = (d: number | Date) => { const x = new Date(d); return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`; };
/** "14:05" */
export const time = (d: number | Date) => { const x = new Date(d); return `${pad(x.getHours())}:${pad(x.getMinutes())}`; };
/** "25 Nov 2026, 14:05" */
export const datetime = (d: number | Date) => `${date(d)}, ${time(d)}`;
/** "Wed, 3 Dec" */
export const shortDay = (d: number | Date) => { const x = new Date(d); return `${DAYS[x.getDay()]}, ${x.getDate()} ${MONTHS[x.getMonth()]}`; };
/** "Wed, 3 Dec 2026" */
export const longDay = (d: number | Date) => `${shortDay(d)} ${new Date(d).getFullYear()}`;
/** "Nov 2026" */
export const monthYear = (d: number | Date) => { const x = new Date(d); return `${MONTHS[x.getMonth()]} ${x.getFullYear()}`; };
/** minutes-from-midnight → "07:35" */
export const hhmm = (mins: number) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
/** minutes → "2h 05m" */
export const dur = (mins: number) => `${Math.floor(mins / 60)}h ${pad(mins % 60)}m`;
/** "YYYY-MM-DD" (local) */
export const isoDay = (d: number | Date) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
/** parse "YYYY-MM-DD" as local midnight */
export const parseDay = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1).getTime(); };
export const startOfDay = (d: number | Date = Date.now()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
export const addDays = (d: number | Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.getTime(); };

export function ago(d: number): string {
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 604800) return Math.floor(s / 86400) + "d ago";
  return date(d);
}

/** Day group heading: Today / Yesterday / "Wed, 3 Dec 2026" */
export function dayHeading(d: number) {
  const t = startOfDay();
  const s = startOfDay(d);
  if (s === t) return "Today";
  if (s === addDays(t, -1)) return "Yesterday";
  return longDay(d);
}

/** Unique-ish reference, e.g. "TXM3K9AB12" */
export const ref = (p = "AB") =>
  p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

export const initials = (a?: string, b?: string) =>
  ((a || "").trim()[0] || "").toUpperCase() + ((b || "").trim()[0] || "").toUpperCase();

/** initials from a phrase's first 2 alphanumeric words */
export const phraseInitials = (s: string) =>
  s.split(/[^A-Za-z0-9]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

export const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** "7821443609" → "7821 4436 09" */
export const groupDigits = (s: string, size = 4) => s.replace(new RegExp(`(.{${size}})(?=.)`, "g"), "$1 ");

export const fmt = { num, naira, usd, nairaCompact, date, time, datetime, shortDay, longDay, monthYear, hhmm, dur, ago, ref, isoDay, dayHeading };
