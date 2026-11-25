# AutoBiz (Flutter)

The Flutter/Dart version of the AutoBiz mobile app. It is a full port of the React Native app in `../mobile_app` and has the same screens, flows, rules, demo data, design and icons.

## Run it

```bash
cd flutter_app
flutter pub get
flutter run                      # pick a device/simulator
flutter analyze
```

Built with Flutter 3.47 and Dart 3.13.

## Release APK (for real phones)

```bash
flutter build apk --release --target-platform android-arm,android-arm64
# → build/app/outputs/flutter-apk/app-release.apk
```

- **Signing:** the APK is signed with the AutoBiz release key. `android/key.properties` points to `credentials/autobiz-release.jks`; both are git-ignored, so back them up. If `key.properties` is missing, the build falls back to the debug key.
- **Application ID:** `app.autobiz.flutter`. That differs from the React Native app's ID, so both can be installed side by side.
- **Play Store:** run `flutter build appbundle` to get an `.aab`.
- **Before each release:** bump `version:` in `pubspec.yaml`.

## Demo rules

These are the same as in the React Native app:

- **Login:** any valid email or phone number works with a password of 6 or more characters. The password `wrongpass` shows the error state.
- **Transaction PIN:** if you set one at sign-up or in Settings, that PIN is required. Otherwise any PIN works except `0000`.
- **OTP:** any 6 digits work except `000000`.
- **"Not found" inputs:**
  - meter or account numbers starting with `000`
  - transfer recipients starting with `x`
  - gift card e-codes starting with `USED`: the trade is declined after about 14 seconds
- **Background jobs:** orders move forward every 15 seconds, and gift card trades are reviewed in the background.
- **Reset:** Settings → Help → Reset demo data restores the defaults.

## Structure

```
lib/
  main.dart            bootstrap: load store, theme, router, background simulators
  router.dart          go_router routes (same paths as the RN app), tab shell, auth guard
  core/                format, random (bit-identical to the JS PRNGs), validators, theme tokens, nav helpers
  data/catalog.dart    products, eSIM countries, airports, gift cards, networks, plans (generated from web data.js)
  store/               AppStore (ChangeNotifier + SharedPreferences): the demo backend; models with JSON
  ui/                  design system: text, buttons, cards, chips, inputs, sheets, screen/header,
                       overlays (toast, confirmPay PIN keypad, success receipt, fund wallet, login prompt, confirm)
  screens/             one file per route
  features/            per-feature logic & widgets (bills, shop, esim, flights, giftcards, cards, wallet, home, auth, settings)
assets/                Plus Jakarta Sans, icon fonts (Ionicons, MaterialCommunityIcons, FA5 Brands), network logos, brand art
tool/generate_icons.js regenerates Android/iOS launcher icons from assets/brand
```

To connect a real backend, replace the `AppStore` actions (`debit`, `credit`, `mutate`…) and `catalog.dart` with API calls. The screens only talk to the store.

## Mapping from React Native

| React Native | Flutter |
|---|---|
| zustand store `useApp` / `app()` | `context.watch<AppStore>()` / global `store` |
| Expo Router `router.push` | `context.push(loc('/path', {...}))` |
| `<Screen header=…>` / `<Sheet>` | `AppScreen(header: …)` / `AppSheet` + `showSheet` |
| `confirmPay`, `success`, `toast` | same names in `lib/ui/overlay.dart` |
| `Icon name="bi-…"` | `AppIcon('bi-…')`, with the same name map |
