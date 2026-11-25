export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
export const normPhone = (s: string) => s.replace(/[\s()-]/g, "");
/** Accepts 0803…, +234803…, 234803… */
export const isPhone = (s: string) => /^(\+?234|0)[789][01]\d{8}$/.test(normPhone(s));
/** Strict 11-digit local format */
export const isLocalPhone = (s: string) => /^0[789][01]\d{8}$/.test(s.replace(/\s/g, ""));
export const toLocalPhone = (s: string) => normPhone(s).replace(/^\+?234/, "0");
export const digitsOnly = (s: string) => s.replace(/\D/g, "");

export type Strength = { score: number; label: string; tone: "danger" | "warning" | "cyan" | "success"; rules: { len: boolean; upper: boolean; digit: boolean; symbol: boolean } };
export function passwordStrength(p: string): Strength {
  const rules = { len: p.length >= 8, upper: /[A-Z]/.test(p), digit: /\d/.test(p), symbol: /[^A-Za-z0-9]/.test(p) };
  let score = p ? Object.values(rules).filter(Boolean).length : 0;
  if (p.length >= 12 && score >= 3) score = 4;
  const map = [["Too weak", "danger"], ["Weak", "danger"], ["Fair", "warning"], ["Good", "cyan"], ["Strong", "success"]] as const;
  return { score, label: map[score][0], tone: map[score][1], rules };
}

export const WEAK_PINS = ["0000", "1111", "1234", "4321", "2222", "9999", "1212"];
export const isSequentialOrRepeated = (pin: string) =>
  /^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin);
