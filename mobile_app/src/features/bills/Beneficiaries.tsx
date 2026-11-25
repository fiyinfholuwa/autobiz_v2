import React from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Avatar, Icon, Text } from "@/components/ui";
import { networkById } from "@/data/catalog";
import { phraseInitials } from "@/lib/format";
import { useApp, type Beneficiary } from "@/store";
import { radius, useTheme } from "@/theme";
import { maskValue, removeBeneficiary } from "./shared";

/** Horizontal strip of saved beneficiaries for one kind. Tap = pick, × = remove. */
export function BeneficiaryStrip({ kind, onPick, emptyText }: { kind: Beneficiary["kind"]; onPick: (b: Beneficiary) => void; emptyText?: string }) {
  const { c } = useTheme();
  const all = useApp((s) => s.beneficiaries);
  const list = all.filter((b) => b.kind === kind);
  if (!list.length) {
    return emptyText ? (
      <View style={{ marginBottom: 14 }}>
        <Text variant="label" muted style={{ marginBottom: 6 }}>Saved beneficiaries</Text>
        <Text variant="xs" muted>{emptyText}</Text>
      </View>
    ) : null;
  }
  return (
    <View style={{ marginBottom: 14 }}>
      <Text variant="label" muted style={{ marginBottom: 8 }}>Saved beneficiaries</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
        {list.map((b) => {
          const net = b.network ? networkById(b.network) : undefined;
          return (
            <Pressable
              key={b.id}
              onPress={() => onPick(b)}
              accessibilityLabel={`Use ${b.label}`}
              style={({ pressed }) => ({ width: 88, alignItems: "center", paddingVertical: 10, paddingHorizontal: 6, borderRadius: radius.lg, backgroundColor: c.surface2, opacity: pressed ? 0.7 : 1 })}
            >
              <View>
                <Avatar text={phraseInitials(b.label) || "?"} size={42} />
                {net ? <Image source={net.logo} style={{ position: "absolute", right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: c.surface2 }} /> : null}
              </View>
              <Text variant="xs" weight="semibold" numberOfLines={1} style={{ marginTop: 6 }}>{b.label}</Text>
              <Text size={11} muted tabular>{maskValue(b.value)}</Text>
              <Pressable
                onPress={() => removeBeneficiary(b.id)}
                hitSlop={8}
                accessibilityLabel={`Remove ${b.label}`}
                style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="bi-x" size={13} color={c.muted} />
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
