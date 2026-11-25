/* Icon — accepts the web app's Bootstrap icon names ("bi-phone") so data ports verbatim,
   or a direct Ionicons name ("ion:home"). Unknown names fall back to a neutral glyph. */
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import type { StyleProp, TextStyle } from "react-native";

type Fam = "ion" | "mci" | "fa5";
type Entry = [Fam, string];

const I = (n: string): Entry => ["ion", n];
const M = (n: string): Entry => ["mci", n];
const F = (n: string): Entry => ["fa5", n];

const MAP: Record<string, Entry> = {
  // navigation / general
  "house-door": I("home-outline"), "house-door-fill": I("home"), house: I("home-outline"), "house-heart": M("home-heart"), "house-heart-fill": M("home-heart"),
  grid: I("grid-outline"), "grid-1x2": I("grid-outline"), "grid-3x3-gap": M("dialpad"), shop: I("storefront-outline"), "shop-window": M("storefront-outline"),
  gear: I("settings-outline"), bell: I("notifications-outline"), "bell-fill": I("notifications"), search: I("search"), list: I("menu"),
  "three-dots-vertical": I("ellipsis-vertical"), "three-dots": I("ellipsis-horizontal"), x: I("close"), "x-lg": I("close"), "plus-lg": I("add"), plus: I("add"), "dash-lg": I("remove"),
  "check-lg": I("checkmark"), check: I("checkmark"), check2: I("checkmark"), "check-circle-fill": I("checkmark-circle"), "check-circle": I("checkmark-circle-outline"), "check2-circle": I("checkmark-circle-outline"),
  "x-circle": I("close-circle-outline"), "x-circle-fill": I("close-circle"), "x-octagon": M("octagon-outline"),
  "info-circle": I("information-circle-outline"), "info-circle-fill": I("information-circle"), "exclamation-circle": I("alert-circle-outline"), "exclamation-triangle-fill": I("warning"), "exclamation-triangle": I("warning-outline"),
  "chevron-right": I("chevron-forward"), "chevron-left": I("chevron-back"), "chevron-down": I("chevron-down"), "chevron-up": I("chevron-up"), "chevron-double-right": I("play-forward-outline"),
  "arrow-right": I("arrow-forward"), "arrow-left": I("arrow-back"), "arrow-down-left": M("arrow-bottom-left"), "arrow-up-right": M("arrow-top-right"), "arrow-left-right": I("swap-horizontal"), "arrow-repeat": I("repeat"),
  "arrow-counterclockwise": M("restore"), "box-arrow-right": I("log-out-outline"), "box-arrow-left": I("log-out-outline"), "box-arrow-up-right": I("open-outline"),
  eye: I("eye-outline"), "eye-slash": I("eye-off-outline"), copy: I("copy-outline"), share: I("share-social-outline"), download: I("download-outline"), printer: I("print-outline"), trash: I("trash-outline"), trash3: I("trash-outline"),
  pencil: I("pencil"), "pencil-square": I("create-outline"), funnel: I("funnel-outline"), sliders: I("options-outline"), "filter": I("filter"), "sort-down": M("sort-descending"),
  heart: I("heart-outline"), "heart-fill": I("heart"), star: I("star-outline"), "star-fill": I("star"), "star-half": I("star-half"), stars: I("sparkles-outline"),
  person: I("person-outline"), "person-circle": I("person-circle-outline"), "person-lock": M("account-lock-outline"), "person-standing-dress": M("human-female"), people: I("people-outline"),
  lock: I("lock-closed-outline"), "lock-fill": I("lock-closed"), key: I("key-outline"), "shield-check": I("shield-checkmark-outline"), "shield-lock": M("shield-lock-outline"), "patch-check": M("check-decagram-outline"), "patch-check-fill": M("check-decagram"),
  globe: I("globe-outline"), globe2: I("globe-outline"), "globe-europe-africa": I("earth"), "geo-alt": I("location-outline"), "pin-map": M("map-marker-radius-outline"), geo: I("location-outline"),
  calendar: I("calendar-outline"), calendar3: I("calendar-outline"), clock: I("time-outline"), "hourglass-split": I("hourglass-outline"),
  headset: M("headset"), "question-circle": I("help-circle-outline"), envelope: I("mail-outline"), "envelope-paper": I("mail-open-outline"), whatsapp: I("logo-whatsapp"), telephone: I("call-outline"),
  palette: I("color-palette-outline"), sun: I("sunny-outline"), "moon-stars": I("moon-outline"), "circle-half": M("circle-half-full"), activity: I("pulse-outline"), "graph-up": I("trending-up"),
  receipt: I("receipt-outline"), "receipt-cutoff": I("receipt-outline"), "file-earmark-text": I("document-text-outline"), upload: I("cloud-upload-outline"), "cloud-upload": I("cloud-upload-outline"), "cloud-download": I("cloud-download-outline"), image: I("image-outline"), camera: I("camera-outline"),
  send: I("paper-plane-outline"), "send-fill": I("paper-plane"), lightning: I("flash-outline"), "lightning-fill": I("flash"), "lightning-charge": I("flash-outline"), "lightning-charge-fill": I("flash"),
  fire: I("flame-outline"), snow: I("snow-outline"), snow2: I("snow-outline"), "infinity": I("infinite"), tag: I("pricetag-outline"), "tags": I("pricetags-outline"), "percent": M("percent"),
  "box-seam": M("package-variant-closed"), box: M("package-variant"), truck: M("truck-fast-outline"), "bag-check": M("shopping-outline"), bag: I("bag-handle-outline"), "bag-heart": M("shopping-outline"), "bag-heart-fill": M("shopping"), cart3: I("cart-outline"), "cart-fill": I("cart"), basket: I("basket-outline"), basket2: I("basket-outline"),
  // money
  wallet2: I("wallet-outline"), wallet: I("wallet-outline"), bank: M("bank-outline"), cash: I("cash-outline"), "currency-dollar": I("logo-usd"), "credit-card": I("card-outline"), "credit-card-2-front": I("card-outline"), "credit-card-2-back": M("credit-card-chip-outline"),
  gift: I("gift-outline"), "gift-fill": I("gift"), coin: M("circle-multiple-outline"), "piggy-bank": M("piggy-bank-outline"),
  // services
  phone: I("phone-portrait-outline"), "phone-vibrate": M("cellphone-sound"), wifi: I("wifi"), tv: I("tv-outline"), trophy: I("trophy-outline"), mortarboard: I("school-outline"), "mortarboard-fill": I("school"),
  sim: M("sim-outline"), airplane: I("airplane-outline"), "airplane-fill": I("airplane"), "upc-scan": I("barcode-outline"), "qr-code": I("qr-code-outline"), "qr-code-scan": I("scan-outline"),
  laptop: I("laptop-outline"), "pc-display": M("monitor"), headphones: I("headset-outline"), earbuds: M("earbuds-outline"), smartwatch: I("watch-outline"), keyboard: M("keyboard-outline"), mouse: M("mouse"), controller: I("game-controller-outline"),
  "battery-charging": I("battery-charging-outline"), fan: M("fan"), "droplet-half": M("water-opacity"), droplet: I("water-outline"), flower1: M("flower-outline"), flower2: M("flower-tulip-outline"),
  "play-btn": I("play-circle-outline"), "play-btn-fill": I("play-circle"), "tree": M("palm-tree"), buildings: M("city-variant-outline"), building: M("office-building-outline"), "bank2": M("bank-outline"),
  briefcase: I("briefcase-outline"), gem: M("diamond-stone"), "car-front-fill": I("car-sport"), "box2-heart": M("gift-outline"),
  // brands
  apple: I("logo-apple"), amazon: I("logo-amazon"), steam: I("logo-steam"), "google-play": I("logo-google-playstore"), google: I("logo-google"), xbox: I("logo-xbox"), playstation: I("logo-playstation"),
  microsoft: I("logo-microsoft"), spotify: F("spotify"), meta: F("facebook"), youtube: I("logo-youtube"), android2: I("logo-android"),
};

export type IconProps = { name: string; size?: number; color?: string; style?: StyleProp<TextStyle> };

export function Icon({ name, size = 20, color = "#000", style }: IconProps) {
  let entry: Entry | undefined;
  if (name.startsWith("ion:")) entry = ["ion", name.slice(4)];
  else if (name.startsWith("mci:")) entry = ["mci", name.slice(4)];
  else {
    const key = name.replace(/^bi[- ]/, "").replace(/^bi-/, "");
    entry = MAP[key] || MAP[key.replace(/-fill$/, "")];
  }
  if (!entry) entry = ["ion", "ellipse-outline"];
  const [fam, n] = entry;
  if (fam === "mci") return <MaterialCommunityIcons name={n as any} size={size} color={color} style={style} />;
  if (fam === "fa5") return <FontAwesome5 name={n as any} size={size * 0.9} color={color} style={style} brand />;
  return <Ionicons name={n as any} size={size} color={color} style={style} />;
}
