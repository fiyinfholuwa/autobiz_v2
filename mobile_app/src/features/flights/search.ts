import { router } from "expo-router";
import { toast } from "@/components/overlay";
import { plusDays, today } from "./engine";
import { buildSearch, useFlights, type SearchForm } from "./state";

export type Errs = Record<string, string>;

export function validate(f: SearchForm): Errs {
  const e: Errs = {};
  const t = today();
  const max = plusDays(t, 330);
  const n = f.trip === "multi" ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const L = f.legs[i];
    if (!L.from) e["from" + i] = "Choose a departure airport";
    if (!L.to) e["to" + i] = "Choose a destination airport";
    else if (L.from === L.to) e["to" + i] = "Destination must differ from origin";
    if (!L.date) e["date" + i] = "Pick a departure date";
    else if (L.date < t) e["date" + i] = "Date can't be in the past";
    else if (L.date > max) e["date" + i] = "Bookings open 330 days ahead";
  }
  if (f.trip === "round") {
    if (!f.ret) e.ret = "Pick a return date";
    else if (f.ret < f.legs[0].date) e.ret = "Return must be on/after departure";
  }
  if (f.trip === "multi" && !e.date1 && f.legs[1].date < f.legs[0].date) e.date1 = "Flight 2 must be on/after flight 1";
  return e;
}

export function runSearch(f: SearchForm): Errs {
  const e = validate(f);
  if (Object.keys(e).length) { toast("Please fix the highlighted fields", "warning"); return e; }
  useFlights.getState().set({ search: buildSearch(f), legIdx: 0, picks: [], booking: null });
  router.push("/flights/results");
  return {};
}

