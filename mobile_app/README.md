# AutoBiz Mobile (React Native · Expo)

The native mobile app of the AutoBiz v2 web project (`../app/*.html`). It covers every flow in the web app: wallet, bills, marketplace, eSIM, flights, virtual USD cards, gift cards, orders, transactions, settings and auth. It uses the same demo "backend" rules: a persisted local store, a PIN-confirmed wallet, and simulated verification and processing.

## Run it

```bash
cd mobile_app
npm install
npx expo start          # press i (iOS simulator), a (Android) or scan the QR with Expo Go
npm run typecheck
```

Requires Node 20+ and Expo SDK 58. `.npmrc` sets `legacy-peer-deps` (needed by one font package).

## Demo rules

- **Any valid email or phone with a 6+ character password** logs in. The password `wrongpass` shows the error state.
- **Transaction PIN:**
  - If you set a PIN during sign-up or in Settings → Security, that PIN is required.
  - Otherwise any PIN works except `0000`.
- **OTP codes:** any 6 digits work, except `000000`.
- **"Not found" inputs:** a meter number or bank account starting with `000` is not found, and so is a transfer recipient starting with `x`.
- **Failed gift card trade:** a gift-card e-code starting with `USED` is declined about 14 seconds after you submit it.
- **Background simulations:** orders move forward automatically every 15 seconds, and gift card trades are processed in the background.
- **Reset:** Settings → Help → Reset demo data restores the defaults.

## Structure

```
src/
  app/            Expo Router routes (each file is a screen)
    (tabs)/       Home · Shop · Pay · Cards · More
    (auth)/       login · register · forgot-password
    wallet/ transactions/ product/ orders/ esim/ flights/ giftcards/ cards/ settings/
  features/       per-feature logic & components (bills, shop, esim, flights, giftcards, cards, wallet…)
  components/
    ui/           design-system primitives (Text, Button, Card, Sheet, TextField, Select…)
    overlay/      global toast, confirmPay (PIN keypad), success receipt, fund wallet, login prompt, confirm dialog
    Logo.tsx      brand mark (vector)
  store/          zustand + AsyncStorage persisted store (the demo backend) and domain types
  data/catalog.ts products, eSIM countries, airports, gift cards, networks, data plans…
  theme/          light/dark tokens (teal brand, Plus Jakarta Sans)
  lib/            formatting, deterministic random, validators
```

To wire a real API, replace the store actions (`debit`, `credit`, `update`…) and the catalog with network calls. The screens only talk to the store.

## App icon and logo

The artwork is a teal squircle with a white "A" and a gold coin as the crossbar. All files are in `assets/`:

| File | Use |
|---|---|
| `icon.png` (1024) | iOS and default icon, full-bleed (iOS applies its own mask) |
| `android-icon-foreground.png` / `-background.png` / `-monochrome.png` | Android adaptive icon. The glyph fills about 50% of the canvas, inside the 66dp safe zone, so launchers never crop it or make it oversized. |
| `splash-icon.png` | Splash screen (shown at 120dp on white, or #121212 in dark mode) |
| `favicon.png`, `logo-mark.png`, `logo.svg` | Web and marketing |

To regenerate the icons after changing the artwork:

```bash
npm i -D sharp && node scripts/generate-icons.js ./assets .
```

Icon changes show up only in a new native build (`npx expo run:ios|android` or EAS Build), not in Expo Go.
