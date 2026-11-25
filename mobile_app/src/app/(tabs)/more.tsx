import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "@/components/Logo";
import { openFund } from "@/components/overlay";
import { confirmLogout } from "@/features/settings/shared";
import { Avatar, Button, Card, Icon, IconButton, IconTile, ListRow, Row, Screen, Text } from "@/components/ui";
import { initials, naira } from "@/lib/format";
import { app, useApp } from "@/store";
import { TAB_BAR_SPACE, useTheme } from "@/theme";

const SERVICES: { label: string; icon: string; tone: string; href: string; auth?: boolean }[] = [
  { label: "Wallet", icon: "bi-wallet2", tone: "primary", href: "/wallet", auth: true },
  { label: "Transactions", icon: "bi-receipt-cutoff", tone: "violet", href: "/transactions", auth: true },
  { label: "Marketplace", icon: "bi-shop", tone: "orange", href: "/(tabs)/shop" },
  { label: "Cart", icon: "bi-cart3", tone: "pink", href: "/cart" },
  { label: "My Orders", icon: "bi-box-seam", tone: "cyan", href: "/orders", auth: true },
  { label: "Wishlist", icon: "bi-heart", tone: "danger", href: "/orders?tab=wishlist", auth: true },
  { label: "eSIM", icon: "bi-sim", tone: "violet", href: "/esim" },
  { label: "Flights", icon: "bi-airplane", tone: "cyan", href: "/flights" },
  { label: "Virtual Cards", icon: "bi-credit-card-2-front", tone: "success", href: "/(tabs)/cards" },
  { label: "Gift Cards", icon: "bi-gift", tone: "pink", href: "/giftcards" },
  { label: "Bills & Airtime", icon: "bi-lightning-charge", tone: "warning", href: "/(tabs)/pay" },
  { label: "Notifications", icon: "bi-bell", tone: "primary", href: "/notifications" },
];

const ACCOUNT = [
  { label: "Profile", sub: "Name, email, phone & username", icon: "bi-person", tone: "primary", href: "/settings/profile" },
  { label: "Security", sub: "Password, PIN, 2FA & devices", icon: "bi-shield-lock", tone: "success", href: "/settings/security" },
  { label: "Verification & limits", sub: "Upgrade your account tier", icon: "bi-patch-check", tone: "violet", href: "/settings/verification" },
  { label: "Notification preferences", sub: "Alerts, receipts & promos", icon: "bi-bell", tone: "orange", href: "/settings/notifications" },
  { label: "Appearance", sub: "Theme & balance privacy", icon: "bi-palette", tone: "cyan", href: "/settings/appearance" },
  { label: "Refer & earn", sub: "Earn ₦500 for every friend", icon: "bi-people", tone: "pink", href: "/settings/refer" },
  { label: "Help & support", sub: "Chat, call, FAQs", icon: "bi-question-circle", tone: "warning", href: "/settings/help" },
];

export default function More() {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const authed = useApp((s) => s.auth.authed);
  const user = useApp((s) => s.user);
  const balance = useApp((s) => s.wallet.balance);
  const hide = useApp((s) => s.settings.hideBalance);
  const unread = useApp((s) => s.notifications.filter((n) => !n.read).length);
  const mode = useApp((s) => s.settings.themeMode);

  const go = (href: string, needsAuth?: boolean) => {
    if (needsAuth && !authed) return router.push({ pathname: "/login", params: { next: href } });
    router.push(href as any);
  };

  return (
    <Screen padded={false} bottomInset={TAB_BAR_SPACE}>
      <LinearGradient colors={[c.primary600, c.primary700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 64, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
        <Row justify="space-between">
          <Logo size={30} light />
          <Row gap={8}>
            <IconButton icon={dark ? "bi-sun" : "bi-moon-stars"} color="#fff" bg="rgba(255,255,255,0.16)" accessibilityLabel="Toggle theme" onPress={() => app().update("settings", (s) => ({ ...s, themeMode: dark ? "light" : "dark" }))} />
            <IconButton icon="bi-bell" color="#fff" bg="rgba(255,255,255,0.16)" badge={unread || undefined} accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} />
          </Row>
        </Row>
        {authed ? (
          <Pressable onPress={() => router.push("/settings/profile")} style={{ marginTop: 22 }}>
            <Row gap={14}>
              <Avatar text={initials(user.firstName, user.lastName)} size={58} bg="rgba(255,255,255,0.2)" color="#fff" />
              <View style={{ flex: 1 }}>
                <Text variant="h2" color="#fff" numberOfLines={1}>{user.firstName} {user.lastName}</Text>
                <Text variant="sm" color="rgba(255,255,255,0.8)" numberOfLines={1}>@{user.username || "user"} · {user.email}</Text>
                <View style={{ alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.2)" }}>
                  <Text size={11} weight="bold" color="#fff">{user.tier}</Text>
                </View>
              </View>
              <Icon name="bi-chevron-right" size={20} color="#fff" />
            </Row>
          </Pressable>
        ) : (
          <View style={{ marginTop: 22 }}>
            <Text variant="h2" color="#fff">Welcome to AutoBiz</Text>
            <Text variant="sm" color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>Sign in or create a free account to fund your wallet, track orders and pay bills.</Text>
          </View>
        )}
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, marginTop: -44 }}>
        {authed ? (
          <Card>
            <Row justify="space-between">
              <View>
                <Text variant="xs" muted>Wallet balance</Text>
                <Text variant="h2" tabular>{hide ? "₦ ••••••" : naira(balance, 2)}</Text>
              </View>
              <Row gap={8}>
                <Button title="Add money" size="sm" icon="bi-plus-lg" onPress={openFund} />
                <IconButton icon="bi-wallet2" bg={c.primarySoft} color={c.primary} accessibilityLabel="Open wallet" onPress={() => router.push("/wallet")} />
              </Row>
            </Row>
          </Card>
        ) : (
          <Card>
            <Row gap={10}>
              <Button title="Log in" style={{ flex: 1 }} onPress={() => router.push("/login")} />
              <Button title="Create account" variant="soft" style={{ flex: 1 }} onPress={() => router.push("/register")} />
            </Row>
          </Card>
        )}

        <Text variant="h3" style={{ marginTop: 22, marginBottom: 12 }}>All services</Text>
        <Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 18 }}>
            {SERVICES.map((s) => (
              <Pressable key={s.label} onPress={() => go(s.href, s.auth)} style={({ pressed }) => ({ width: "25%", alignItems: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}>
                <View>
                  <IconTile icon={s.icon} tone={s.tone} size={48} />
                  {s.label === "Notifications" && unread ? <View style={{ position: "absolute", top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: c.danger, borderWidth: 2, borderColor: c.surface }} /> : null}
                </View>
                <Text size={11} weight="semibold" center numberOfLines={2}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Text variant="h3" style={{ marginTop: 22, marginBottom: 12 }}>Account</Text>
        <Card style={{ paddingVertical: 4 }}>
          {ACCOUNT.map((a, i) => (
            <View key={a.label} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
              <ListRow icon={a.icon} tone={a.tone} title={a.label} subtitle={a.sub} chevron onPress={() => go(a.href, a.href !== "/settings/help" && a.href !== "/settings/appearance")} />
            </View>
          ))}
        </Card>

        <Card style={{ marginTop: 14, paddingVertical: 4 }}>
          <ListRow icon={mode === "system" ? "bi-circle-half" : dark ? "bi-moon-stars" : "bi-sun"} tone="neutral" title="Theme" subtitle={mode === "system" ? "System default" : dark ? "Dark" : "Light"} chevron onPress={() => router.push("/settings/appearance")} />
          {authed ? (
            <View style={{ borderTopWidth: 1, borderTopColor: c.border }}>
              <ListRow icon="bi-box-arrow-right" danger title="Log out" subtitle="Sign out of AutoBiz on this device" onPress={confirmLogout} />
            </View>
          ) : null}
        </Card>
        <Text variant="xs" muted center style={{ marginTop: 18 }}>AutoBiz v1.0.0 · Shop, travel & pay smarter</Text>
      </View>
    </Screen>
  );
}
