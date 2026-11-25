/* Deterministic + random helpers ported from the web app. */

/** bills/wallet hash: reduce((a*31 + charCode) >>> 0, seed 7) */
export function hash31(s: string): number {
  let a = 7;
  for (let i = 0; i < s.length; i++) a = (a * 31 + s.charCodeAt(i)) >>> 0;
  return a;
}
export const pickBy = <T,>(arr: T[], s: string): T => arr[hash31(s) % arr.length];

/** FNV-1a 32-bit */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** cyrb-style string hash (flights.js) */
export function cyrb(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 PRNG → () => [0,1) */
export function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** seeded RNG from any string */
export const seeded = (seed: string) => mulberry32(fnv1a(seed));
export const seededCyrb = (seed: string) => mulberry32(cyrb(seed));

export const rndInt = (a: number, b: number, r: () => number = Math.random) => a + Math.floor(r() * (b - a + 1));
export const rndDigits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const rndCode = (n: number, alphabet = CODE_ALPHABET, r: () => number = Math.random) =>
  Array.from({ length: n }, () => alphabet[Math.floor(r() * alphabet.length)]).join("");

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round100 = (n: number) => Math.round(n / 100) * 100;
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Mock names used for account/meter/smartcard verification */
export const MOCK_NAMES = ["Chinedu Okeke", "Aisha Bello", "Tunde Adeyemi", "Ngozi Eze", "Ibrahim Musa", "Funke Akindele", "Emeka Obi", "Blessing Udo", "Yusuf Lawal", "Kemi Balogun"];
