/* Flights engine — deterministic mock flight generator + fare maths (port of assets/js/flights.js). */
import { airlineByCode, airportByCode, airports } from "@/data/catalog";
import { addDays, isoDay, parseDay, startOfDay } from "@/lib/format";
import { cyrb, mulberry32, round100 } from "@/lib/random";
import type { Cabin, Flight, FlightSegment } from "@/store";

export const DAY = 864e5;

export const CABINS: { key: Cabin; label: string; mult: number; icon: string }[] = [
  { key: "Economy", label: "Economy", mult: 1, icon: "bi-person" },
  { key: "Premium", label: "Premium Economy", mult: 1.65, icon: "bi-star" },
  { key: "Business", label: "Business", mult: 2.9, icon: "bi-briefcase" },
  { key: "First", label: "First", mult: 4.3, icon: "bi-gem" },
];
export const cabinOf = (k: Cabin) => CABINS.find((c) => c.key === k)!;

export const COORD: Record<string, [number, number]> = {
  LOS: [6.577, 3.321], ABV: [9.007, 7.263], PHC: [5.015, 6.95], KAN: [12.048, 8.524], ENU: [6.474, 7.562], QOW: [5.427, 7.206],
  ACC: [5.605, -0.167], NBO: [-1.319, 36.928], JNB: [-26.139, 28.246], DXB: [25.253, 55.366], LHR: [51.47, -0.454],
  JFK: [40.641, -73.778], IAH: [29.99, -95.336], YYZ: [43.678, -79.625], CDG: [49.01, 2.548], IST: [41.275, 28.752],
  DOH: [25.273, 51.608], ADD: [8.977, 38.799],
};

const NG = ["P4", "W3", "VK", "UN", "IBM"];
const INTL = ["EK", "BA", "TK", "ET", "QR", "KQ", "AF"];
export const HUBS: Record<string, { code: string; city: string }> = {
  EK: { code: "DXB", city: "Dubai" }, QR: { code: "DOH", city: "Doha" }, TK: { code: "IST", city: "Istanbul" }, ET: { code: "ADD", city: "Addis Ababa" },
  KQ: { code: "NBO", city: "Nairobi" }, AF: { code: "CDG", city: "Paris" }, BA: { code: "LHR", city: "London" },
};
const AL_F: Record<string, number> = { P4: 1, W3: 0.97, VK: 0.9, UN: 0.93, IBM: 1.08, EK: 1.14, BA: 1.2, TK: 0.97, ET: 0.9, QR: 1.12, KQ: 0.94, AF: 1.1 };

export const COUNTRY_ISO: Record<string, string> = { Nigeria: "ng", Ghana: "gh", Kenya: "ke", "South Africa": "za", UAE: "ae", "United Kingdom": "gb", "United States": "us", Canada: "ca", France: "fr", Turkey: "tr" };

export function cityOf(code: string) {
  const a = airportByCode(code);
  if (a) return a.city;
  const h = Object.values(HUBS).find((x) => x.code === code);
  return h ? h.city : code;
}
export const airportName = (code: string) => airportByCode(code)?.name || `${cityOf(code)} Intl`;
export const isNigeria = (code: string) => airportByCode(code)?.country === "Nigeria";
export const airlineName = (code: string) => airlineByCode(code)?.name || code;
export const airlineColor = (code: string) => airlineByCode(code)?.color || "#299d91";
export const flagFor = (code: string) => COUNTRY_ISO[airportByCode(code)?.country || ""] || "";

export function dist(a: string, b: string) {
  const A = COORD[a], B = COORD[b];
  if (!A || !B) return 3000;
  const R = 6371, rad = Math.PI / 180;
  const dLat = (B[0] - A[0]) * rad, dLon = (B[1] - A[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(A[0] * rad) * Math.cos(B[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const cache = new Map<string, Flight[]>();

export function generateFlights(from: string, to: string, date: string): Flight[] {
  const key = `${from}-${to}-${date}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = mulberry32(cyrb(key));
  const rint = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const D = dist(from, to);
  const domestic = isNigeria(from) && isNigeria(to);

  type Cand = { al: string; via: string | null };
  let cands: Cand[] = [];
  if (domestic) cands = NG.map((al) => ({ al, via: null }));
  else {
    for (const al of INTL) {
      const hub = HUBS[al].code;
      if (hub === from || hub === to) cands.push({ al, via: null });
      else if ((dist(from, hub) + dist(hub, to)) / D < 1.6) cands.push({ al, via: hub });
    }
    if (isNigeria(from) || isNigeria(to)) {
      if (D < 7000) cands.push({ al: "P4", via: null });
      if (D < 3000) cands.push({ al: "W3", via: null });
    }
    if (!cands.length) cands = INTL.map((al) => ({ al, via: HUBS[al].code }));
  }

  const n = domestic ? rint(8, 12) : rint(6, 10);
  const dt = parseDay(date);
  const days = Math.round((dt - startOfDay()) / DAY);
  const wd = new Date(dt).getDay();
  const dateF = (days < 3 ? 1.22 : days < 7 ? 1.1 : days < 21 ? 1 : 0.93) * (wd === 5 || wd === 0 ? 1.06 : 1);
  const offset = rint(0, cands.length - 1);
  const used = new Set<string>();
  const out: Flight[] = [];

  for (let i = 0; i < n; i++) {
    const cand = i < cands.length ? cands[(i + offset) % cands.length] : cands[rint(0, cands.length - 1)];
    let via = cand.via;
    if (domestic) {
      const roll = r();
      if (roll < 0.15) {
        const hub = from !== "ABV" && to !== "ABV" ? "ABV" : from !== "LOS" && to !== "LOS" ? "LOS" : null;
        via = hub;
      }
    }
    let dep = rint(66, 264) * 5;
    for (let k = 0; k < 20 && used.has(cand.al + dep); k++) dep = rint(66, 264) * 5;
    used.add(cand.al + dep);
    const num = rint(100, 979);
    const lay = via ? rint(14, 50) * 5 : 0;
    const pts = via ? [from, via, to] : [from, to];
    const segments: FlightSegment[] = [];
    let t = dep;
    for (let j = 0; j < pts.length - 1; j++) {
      const mins = Math.round((dist(pts[j], pts[j + 1]) / 790 * 60 + 32) / 5) * 5;
      segments.push({ from: pts[j], to: pts[j + 1], fromCity: cityOf(pts[j]), toCity: cityOf(pts[j + 1]), dep: t, arr: t + mins, mins, flightNo: `${cand.al} ${num + j * 2}` });
      t += mins + (j < pts.length - 2 ? lay : 0);
    }
    const arr = segments[segments.length - 1].arr;
    const base = domestic ? 42000 + D * 92 : 185000 + D * 108;
    const peak = (dep >= 360 && dep < 540) || (dep >= 1020 && dep < 1200) ? 1.08 : 1;
    const price = round100(base * (AL_F[cand.al] || 1) * (via ? 0.86 : 1) * (0.86 + r() * 0.38) * peak * dateF);
    const refundable = r() < 0.38;
    const seatsLeft = rint(2, 14);
    out.push({
      id: `${cand.al}${num}-${from}${to}-${date}`, airline: cand.al, flightNo: `${cand.al} ${num}`, from, to, date,
      dep, arr, duration: arr - dep, stops: via ? 1 : 0, via: via ? { code: via, city: cityOf(via) } : null,
      segments, layover: lay, price, refundable, seatsLeft, domestic,
    });
  }
  out.sort((a, b) => a.dep - b.dep);
  cache.set(key, out);
  return out;
}

export const fareFor = (f: Flight, cabin: Cabin) => round100(f.price * cabinOf(cabin).mult);
export const refundableFor = (f: Flight, cabin: Cabin) => f.refundable || cabin === "Business" || cabin === "First";
export type Pax = { adults: number; children: number; infants: number };
export function paxFare(fare: number, pax: Pax) {
  const child = round100(fare * 0.75), infant = round100(fare * 0.1);
  return { adult: fare, child, infant, total: fare * pax.adults + child * pax.children + infant * pax.infants };
}
export function baggage(f: Flight, cabin: Cabin) {
  const hold = f.domestic
    ? { Economy: "1 × 20kg", Premium: "1 × 25kg", Business: "2 × 30kg", First: "2 × 32kg" }[cabin]
    : { Economy: "2 × 23kg", Premium: "2 × 23kg", Business: "2 × 32kg", First: "3 × 32kg" }[cabin];
  return { hold, cabinBag: cabin === "Economy" ? "1 × 7kg" : "2 × 7kg" };
}
export function cheapest(from: string, to: string, date: string, cabin: Cabin) {
  const list = generateFlights(from, to, date);
  return Math.min(...list.map((f) => fareFor(f, cabin)));
}
export const nextDay = (mins: number) => Math.floor(mins / 1440);

export const today = () => isoDay(Date.now());
export const plusDays = (iso: string, n: number) => isoDay(addDays(parseDay(iso), n));
export const allAirports = airports;

/** Seeded RNG helper for UI artefacts (gates, seats, barcodes). */
export const seed = (s: string) => mulberry32(cyrb(s));

/* ---------------- Seats ---------------- */
export function seatLayout(cabin: Cabin) {
  if (cabin === "Business") return { cols: ["A", "C", "D", "F"], aisleAfter: "C", rows: range(3, 8), extra: [] as number[], wide: true };
  if (cabin === "First") return { cols: ["A", "C", "D", "F"], aisleAfter: "C", rows: range(1, 3), extra: [] as number[], wide: true };
  if (cabin === "Premium") return { cols: ["A", "B", "C", "D", "E", "F"], aisleAfter: "C", rows: range(9, 13), extra: [9], wide: false };
  return { cols: ["A", "B", "C", "D", "E", "F"], aisleAfter: "C", rows: range(12, 32), extra: [12, 20, 21], wide: false };
}
function range(a: number, b: number) { return Array.from({ length: b - a + 1 }, (_, i) => a + i); }
export function takenSeats(f: Flight, cabin: Cabin) {
  const L = seatLayout(cabin);
  const r = seed(f.id + "|seats");
  const set = new Set<string>();
  for (const row of L.rows) for (const col of L.cols) if (r() < 0.4) set.add(`${row}${col}`);
  return set;
}
export const extraLegroomPrice = (intl: boolean) => (intl ? 22000 : 6000);

/* ---------------- Gate / boarding ---------------- */
export function gateFor(f: Flight) {
  const a = seed(f.id + "g")(), b = seed(f.id + "n")();
  return "ABCDEF"[Math.floor(a * 6)] + (1 + Math.floor(b * 24));
}
export const boardingTime = (f: Flight) => (((f.dep - (f.domestic ? 30 : 45)) % 1440) + 1440) % 1440;
