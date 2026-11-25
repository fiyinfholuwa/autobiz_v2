import { router } from "expo-router";
import React from "react";
import { View } from "react-native";
import { ago, naira } from "@/lib/format";
import type { Tx } from "@/store";
import { useTheme } from "@/theme";
import { IconTile, ListRow, StatusPill, Text } from "./ui";

/** Transaction row (web: AB.txRow). Tapping opens the transaction detail screen. */
export function TxRow({ t, onPress, showStatus = true }: { t: Tx; onPress?: () => void; showStatus?: boolean }) {
  const { c } = useTheme();
  return (
    <ListRow
      left={<IconTile icon={t.icon} tone={t.tone} size={42} />}
      title={t.title}
      subtitle={`${t.subtitle ? t.subtitle + " · " : ""}${ago(t.date)}`}
      onPress={onPress ?? (() => router.push(`/transactions/${encodeURIComponent(t.id)}`))}
      right={
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text weight="bold" tabular color={t.direction === "in" ? c.success : c.text}>
            {t.direction === "in" ? "+" : "−"}{naira(t.amount)}
          </Text>
          {showStatus ? <StatusPill status={t.status} /> : null}
        </View>
      }
    />
  );
}
