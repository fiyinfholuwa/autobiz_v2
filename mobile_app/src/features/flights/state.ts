/* Session state for search → results → booking (not persisted, like the web page state). */
import { create } from "zustand";
import type { Cabin, Flight, Passenger } from "@/store";
import { app } from "@/store";
import { plusDays, today, type Pax } from "./engine";

export type Trip = "oneway" | "round" | "multi";
export type Leg = { from: string; to: string; date: string };
export type SearchForm = { trip: Trip; legs: [Leg, Leg]; ret: string; pax: Pax; cabin: Cabin };
export type ActiveSearch = { trip: Trip; legs: Leg[]; pax: Pax; cabin: Cabin };

export type BookingDraft = {
  step: number;
  maxStep: number;
  trip: Trip;
  cabin: Cabin;
  pax: Pax;
  legs: { from: string; to: string; date: string; flight: Flight }[];
  travellers: Passenger[];
  contact: { email: string; phone: string };
  seats: Record<string, { seat: string; price: number }>;
  seatLeg: number;
  seatPax: number;
  seatsSkipped: boolean;
  addons: { bags: number; insurance: boolean; priority: boolean };
  agree: boolean;
};

export const defaultForm = (): SearchForm => {
  const t1 = plusDays(today(), 1);
  return { trip: "oneway", legs: [{ from: "LOS", to: "", date: t1 }, { from: "", to: "", date: plusDays(t1, 3) }], ret: plusDays(t1, 7), pax: { adults: 1, children: 0, infants: 0 }, cabin: "Economy" };
};

type FState = {
  form: SearchForm;
  search: ActiveSearch | null;
  legIdx: number;
  picks: Flight[];
  booking: BookingDraft | null;
  setForm: (fn: (f: SearchForm) => SearchForm) => void;
  set: (p: Partial<FState>) => void;
};

export const useFlights = create<FState>((set) => ({
  form: defaultForm(),
  search: null,
  legIdx: 0,
  picks: [],
  booking: null,
  setForm: (fn) => set((s) => ({ form: fn(s.form) })),
  set: (p) => set(p),
}));

/** Freeze the form into an active search (round trip → 2 legs). */
export function buildSearch(f: SearchForm): ActiveSearch {
  const L0 = f.legs[0];
  const legs: Leg[] = f.trip === "round" ? [{ ...L0 }, { from: L0.to, to: L0.from, date: f.ret }] : f.trip === "multi" ? [{ ...f.legs[0] }, { ...f.legs[1] }] : [{ ...L0 }];
  return { trip: f.trip, legs, pax: { ...f.pax }, cabin: f.cabin };
}

export function startBooking(search: ActiveSearch, picks: Flight[]): BookingDraft {
  const u = app().user;
  const travellers: Passenger[] = [];
  const add = (type: Passenger["type"], n: number, name: string) => {
    for (let i = 1; i <= n; i++) travellers.push({ type, label: `${name} ${i}`, title: "", first: "", last: "", dob: "", passport: "", expiry: "", nationality: "Nigerian" });
  };
  add("adult", search.pax.adults, "Adult");
  add("child", search.pax.children, "Child");
  add("infant", search.pax.infants, "Infant");
  return {
    step: 0, maxStep: 0, trip: search.trip, cabin: search.cabin, pax: { ...search.pax },
    legs: search.legs.map((l, i) => ({ from: l.from, to: l.to, date: picks[i].date, flight: picks[i] })),
    travellers, contact: { email: u.email, phone: u.phone }, seats: {}, seatLeg: 0, seatPax: 0, seatsSkipped: false,
    addons: { bags: 0, insurance: false, priority: false }, agree: false,
  };
}
