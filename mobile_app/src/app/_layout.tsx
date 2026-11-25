import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import React, { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OverlayHost } from "@/components/overlay";
import { tickTrades } from "@/features/giftcards/logic";
import { advanceOrders } from "@/features/shop/logic";
import { useApp } from "@/store";
import { useTheme } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function useHydrated() {
  const [h, setH] = useState(useApp.persist.hasHydrated());
  useEffect(() => {
    const unsub = useApp.persist.onFinishHydration(() => setH(true));
    setH(useApp.persist.hasHydrated());
    return unsub;
  }, []);
  return h;
}

/** Background demo "backend" jobs: gift-card trade review + order progression. */
function useSimulators(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    tickTrades();
    advanceOrders();
    const a = setInterval(tickTrades, 1000);
    const b = setInterval(advanceOrders, 15000);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") { tickTrades(); advanceOrders(); } });
    return () => { clearInterval(a); clearInterval(b); sub.remove(); };
  }, [enabled]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const hydrated = useHydrated();
  const ready = fontsLoaded && hydrated;
  const { c, dark } = useTheme();
  useSimulators(ready);

  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  useEffect(() => { SystemUI.setBackgroundColorAsync(c.bg).catch(() => {}); }, [c.bg]);

  if (!ready) return null;
  const navTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: { ...(dark ? DarkTheme : DefaultTheme).colors, primary: c.primary, background: c.bg, card: c.surface, text: c.text, border: c.border },
  };
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <StatusBar style={dark ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: "slide_from_right" }}>
            <Stack.Screen name="index" options={{ animation: "none" }} />
            <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
            <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          </Stack>
          <OverlayHost />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
