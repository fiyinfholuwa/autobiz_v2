import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "@/components/overlay";
import { Button, Icon, IconButton, Row, Text, goBack } from "@/components/ui";
import { passwordStrength } from "@/lib/validators";
import { sleep } from "@/lib/random";
import { app, useApp } from "@/store";
import { radius, useTheme } from "@/theme";

export { Logo } from "@/components/Logo";
import { Logo } from "@/components/Logo";

export function ThemeToggle() {
  const { c, dark } = useTheme();
  return (
    <IconButton
      icon={dark ? "bi-sun" : "bi-moon-stars"}
      accessibilityLabel="Toggle theme"
      bg={c.surface}
      onPress={() => app().update("settings", (s) => ({ ...s, themeMode: dark ? "light" : "dark" }))}
    />
  );
}

/** Auth page scaffold: top bar (back + theme), title block, scrolling body, optional footer. */
export function AuthShell({ title, subtitle, children, footer, onBack, step, steps, topRight }: {
  title?: string; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; onBack?: (() => void) | false; step?: number; steps?: number; topRight?: React.ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <LinearGradient colors={[c.primarySoft, c.bg]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 260 }} />
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16 }}>
        <Row justify="space-between" style={{ minHeight: 44 }}>
          <Row gap={12}>{onBack !== false ? <IconButton icon="bi-chevron-left" accessibilityLabel="Back" onPress={onBack || (() => goBack("/(tabs)"))} /> : null}<Logo size={30} /></Row>
          <Row gap={8}>{topRight}<ThemeToggle /></Row>
        </Row>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 28 }}>
          {steps ? (
            <View style={{ marginBottom: 18 }}>
              <Row gap={6}>
                {Array.from({ length: steps }).map((_, i) => (
                  <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < (step || 0) ? c.primary : c.border }} />
                ))}
              </Row>
              {step && step <= steps ? <Text variant="xs" muted style={{ marginTop: 8 }}>Step {step} of {steps}</Text> : null}
            </View>
          ) : null}
          {title ? <Text variant="h1">{title}</Text> : null}
          {subtitle ? (typeof subtitle === "string" ? <Text muted style={{ marginTop: 6 }}>{subtitle}</Text> : subtitle) : null}
          <View style={{ marginTop: title ? 22 : 0 }}>{children}</View>
          {footer ? <View style={{ marginTop: 22 }}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Password strength meter with rule checklist */
export function StrengthMeter({ password }: { password: string }) {
  const { c, tone } = useTheme();
  const s = passwordStrength(password);
  if (!password) return null;
  const col = tone(s.tone).fg;
  const rules: [keyof typeof s.rules, string][] = [["len", "8+ characters"], ["upper", "Uppercase"], ["digit", "Number"], ["symbol", "Symbol"]];
  return (
    <View style={{ marginTop: 10 }}>
      <Row gap={5}>
        {[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < Math.max(1, s.score) ? col : c.border }} />)}
      </Row>
      <Text variant="xs" muted style={{ marginTop: 6 }}>Password strength <Text variant="xs" weight="bold" color={col}>{s.label}</Text></Text>
      <Row gap={12} wrap style={{ marginTop: 6 }}>
        {rules.map(([k, l]) => (
          <Row key={k} gap={4}>
            <Icon name={s.rules[k] ? "bi-check-circle-fill" : "bi-check-circle"} size={13} color={s.rules[k] ? c.success : c.muted} />
            <Text variant="xs" color={s.rules[k] ? c.text : c.muted}>{l}</Text>
          </Row>
        ))}
      </Row>
    </View>
  );
}

/** 60s resend countdown */
export function useCountdown(start = 60) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return { left, restart: () => setLeft(start), stop: () => setLeft(0), label: `Resend in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` };
}

export function maskEmail(e: string) {
  const [u, d] = e.split("@");
  if (!d) return e;
  return u.slice(0, 2) + "•".repeat(Math.min(5, Math.max(1, u.length - 2))) + "@" + d;
}

export function safeNext(n?: string | string[]) {
  const v = Array.isArray(n) ? n[0] : n;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/login") || v.startsWith("/register") || v.startsWith("/forgot")) return null;
  return v;
}

export function goNext(next?: string | string[]) {
  const n = safeNext(next);
  if (n) { router.replace(n as any); return; }
  if (router.canDismiss()) router.dismissAll();
  router.replace("/(tabs)");
}

/** Google / Apple demo sign-in */
export function SocialButtons({ next }: { next?: string | string[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const go = async (p: string) => {
    setBusy(p);
    await sleep(1300);
    app().login(useApp.getState().auth.remember);
    toast(`Signed in with ${p}`, "success");
    await sleep(500);
    setBusy(null);
    goNext(next);
  };
  return (
    <Row gap={10}>
      <Button title="Google" icon="bi-google" variant="outline" style={{ flex: 1 }} loading={busy === "Google"} loadingText="Connecting…" disabled={!!busy} onPress={() => go("Google")} />
      <Button title="Apple" icon="bi-apple" variant="outline" style={{ flex: 1 }} loading={busy === "Apple"} loadingText="Connecting…" disabled={!!busy} onPress={() => go("Apple")} />
    </Row>
  );
}

export function OrDivider({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <Row gap={10} style={{ marginVertical: 18 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      <Text variant="xs" muted>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
    </Row>
  );
}

export function SecureNote() {
  const { c } = useTheme();
  return (
    <Row gap={6} justify="center" style={{ marginTop: 18 }}>
      <Icon name="bi-lock" size={13} color={c.muted} />
      <Text variant="xs" muted>Protected by 256-bit encryption</Text>
    </Row>
  );
}

export const authRadius = radius;
