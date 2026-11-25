import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { copy } from "@/components/overlay";
import { BrandTile, Button, Card, Icon, IconButton, RichText, Row, SectionHeader, Text } from "@/components/ui";
import { useTheme } from "@/theme";
import { BILLING, BILLING_ALL, FAQ, FEES, MERCHANTS, WORKS_ON } from "./constants";

export function BillingCard() {
  const { c } = useTheme();
  return (
    <Card>
      <Row justify="space-between" align="flex-start">
        <View style={{ flex: 1 }}>
          <Text variant="h3">Billing address</Text>
          <Text variant="xs" muted style={{ marginTop: 2 }}>Use this at checkout for any card</Text>
        </View>
        <Button title="Copy all" icon="bi-copy" size="sm" variant="soft" onPress={() => copy(BILLING_ALL, "Billing address copied")} />
      </Row>
      <View style={{ marginTop: 10 }}>
        {BILLING.map(([k, v, raw], i) => (
          <Row key={k} justify="space-between" style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
            <View style={{ flex: 1 }}>
              <Text variant="xs" muted>{k}</Text>
              <Text weight="semibold" selectable>{v}</Text>
            </View>
            <IconButton icon="bi-copy" size={34} bg={c.surface2} accessibilityLabel={`Copy ${k}`} onPress={() => copy(raw || v, `${k} copied`)} />
          </Row>
        ))}
      </View>
    </Card>
  );
}

export function WorksOnCard() {
  return (
    <Card>
      <SectionHeader title="Works on" subtitle="Accepted by 40M+ online merchants worldwide" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {WORKS_ON.map((k) => {
          const m = MERCHANTS[k];
          return (
            <View key={k} style={{ width: "22%", alignItems: "center", gap: 5 }}>
              <BrandTile color={m.bg} fg={m.fg} icon={m.icon} size={44} />
              <Text size={10} weight="semibold" muted numberOfLines={1}>{m.short}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export function FeesCard() {
  const { c } = useTheme();
  return (
    <Card>
      <SectionHeader title="Fees & limits" />
      {FEES.map(([k, v], i) => (
        <Row key={k} justify="space-between" style={{ paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
          <Text variant="sm" muted>{k}</Text>
          <Text variant="sm" weight="bold">{v}</Text>
        </Row>
      ))}
    </Card>
  );
}

export function FaqCard() {
  const { c } = useTheme();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Card>
      <SectionHeader title="Frequently asked" />
      {FAQ.map(([q, a], i) => {
        const on = open === i;
        return (
          <View key={q} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
            <Pressable onPress={() => setOpen(on ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: on }} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 }}>
              <Text weight="semibold" style={{ flex: 1 }}>{q}</Text>
              <Icon name={on ? "bi-chevron-up" : "bi-chevron-down"} size={16} color={c.muted} />
            </Pressable>
            {on ? <RichText text={a} variant="sm" muted style={{ paddingBottom: 12 }} /> : null}
          </View>
        );
      })}
    </Card>
  );
}

export function InfoPanels() {
  return (
    <View style={{ gap: 14 }}>
      <BillingCard />
      <WorksOnCard />
      <FeesCard />
      <FaqCard />
    </View>
  );
}
