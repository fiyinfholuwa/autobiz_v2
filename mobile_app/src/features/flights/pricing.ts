import { round100 } from "@/lib/random";
import { fareFor, paxFare, refundableFor } from "./engine";
import type { BookingDraft } from "./state";

export const BAG_PRICE = (intl: boolean) => (intl ? 48000 : 12000);
export const INS_PRICE = (intl: boolean) => (intl ? 14500 : 2500);
export const PRIO_PRICE = 3500;

export function bookingTotals(b: BookingDraft) {
  const intl = b.legs.some((l) => !l.flight.domestic);
  const legFares = b.legs.map((l) => paxFare(fareFor(l.flight, b.cabin), b.pax));
  const fare = legFares.reduce((a, x) => a + x.total, 0);
  const taxes = round100(fare * 0.18);
  const base = fare - taxes;
  const seats = Object.values(b.seats).reduce((a, s) => a + s.price, 0);
  const bags = b.addons.bags * BAG_PRICE(intl) * b.legs.length;
  const travellers = b.pax.adults + b.pax.children + b.pax.infants;
  const seated = b.pax.adults + b.pax.children;
  const insurance = b.addons.insurance ? INS_PRICE(intl) * travellers : 0;
  const priority = b.addons.priority ? PRIO_PRICE * seated * b.legs.length : 0;
  const total = fare + seats + bags + insurance + priority;
  const refundable = b.legs.every((l) => refundableFor(l.flight, b.cabin));
  return { intl, legFares, fare, taxes, base, seats, bags, insurance, priority, total, refundable, travellers, seated };
}

export function routeString(legs: { from: string; to: string }[], trip: string) {
  if (trip === "round") return `${legs[0].from} ⇄ ${legs[0].to}`;
  return [...legs.map((l) => l.from), legs[legs.length - 1].to].join(" → ");
}
