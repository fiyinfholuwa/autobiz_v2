import React from "react";
import { Pressable, View } from "react-native";
import { toast } from "@/components/overlay";
import { Header, Icon, Row, Screen, SwitchRow, Text } from "@/components/ui";
import { Group } from "@/features/settings/shared";
import { app, useApp, type ThemeMode } from "@/store";
import { dark as darkP, light as lightP, radius, useTheme } from "@/theme";

const MODES: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "bi-sun" },
  { value: "dark", label: "Dark", icon: "bi-moon-stars" },
  { value: "system", label: "System", icon: "bi-circle-half" },
];

function Preview({ mode }: { mode: ThemeMode }) {
  const half = mode === "system";
  const P = mode === "dark" ? darkP : lightP;
  const pane = (p: typeof lightP) => (
    <View style={{ flex: 1, backgroundColor: p.bg, padding: 8, gap: 5 }}>
      <View style={{ height: 14, borderRadius: 4, backgroundColor: p.primary }} />
      <View style={{ height: 8, width: "70%", borderRadius: 3, backgroundColor: p.border }} />
      <View style={{ height: 22, borderRadius: 5, backgroundColor: p.surface }} />
    </View>
  );
  return (
    <View style={{ height: 82, borderRadius: radius.md, overflow: "hidden", flexDirection: "row" }}>
      {half ? <>{pane(lightP)}{pane(darkP)}</> : pane(P)}
    </View>
  );
}

export default function Appearance() {
  const { c } = useTheme();
  const mode = useApp((s) => s.settings.themeMode);
  const hide = useApp((s) => s.settings.hideBalance);
  const authed = useApp((s) => s.auth.authed);
  return (
    <Screen header={<Header title="Appearance" subtitle="Make AutoBiz yours" />}>
      <Text variant="h3" style={{ marginTop: 6, marginBottom: 10 }}>Theme</Text>
      <Row gap={10} align="stretch">
        {MODES.map((m) => {
          const on = m.value === mode;
          return (
            <Pressable key={m.value} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => app().update("settings", (s) => ({ ...s, themeMode: m.value }))}
              style={{ flex: 1, borderRadius: radius.lg, borderWidth: 2, borderColor: on ? c.primary : c.border, backgroundColor: c.surface, padding: 8 }}>
              <Preview mode={m.value} />
              <Row gap={6} justify="center" style={{ marginTop: 8 }}>
                <Icon name={m.icon} size={15} color={on ? c.primary : c.muted} />
                <Text variant="sm" weight="bold" color={on ? c.primary : c.text}>{m.label}</Text>
              </Row>
            </Pressable>
          );
        })}
      </Row>
      <Text variant="xs" muted style={{ marginTop: 8 }}>System follows your phone's light or dark setting automatically.</Text>
      {authed ? (
        <Group title="Privacy">
          <SwitchRow icon="bi-eye-slash" tone="violet" title="Hide balances" subtitle="Mask wallet amounts across the app" value={hide}
            onChange={(v) => { app().update("settings", (s) => ({ ...s, hideBalance: v })); toast(v ? "Balances hidden" : "Balances visible", "info"); }} />
        </Group>
      ) : null}
    </Screen>
  );
}
