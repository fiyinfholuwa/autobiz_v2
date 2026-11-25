import { router } from "expo-router";
import React from "react";
import { TxRow } from "@/components/TxRow";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import { useApp } from "@/store";
import { BILL_TABS, type BillTab } from "./shared";

export function RecentPanel({ tab }: { tab: BillTab }) {
  const txs = useApp((s) => s.transactions);
  const meta = BILL_TABS.find((t) => t.id === tab)!;
  const list = txs.filter((t) => t.type === tab).slice(0, 5);
  return (
    <Card>
      <SectionHeader
        title={`Recent ${meta.label.toLowerCase()} purchases`}
        action="See all"
        onAction={() => router.push({ pathname: "/transactions", params: { type: tab } } as any)}
      />
      {list.length ? (
        list.map((t) => <TxRow key={t.id} t={t} />)
      ) : (
        <EmptyState icon={meta.icon} tone={meta.tone} title={`No ${meta.label.toLowerCase()} purchases yet`} message="Your recent purchases will show up here." style={{ paddingVertical: 18 }} />
      )}
    </Card>
  );
}
