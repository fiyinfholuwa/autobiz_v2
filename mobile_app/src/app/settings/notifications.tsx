import React from "react";
import { AuthGate } from "@/components/AuthGate";
import { toast } from "@/components/overlay";
import { Header, Screen, SwitchRow } from "@/components/ui";
import { Group } from "@/features/settings/shared";
import { app, useApp } from "@/store";

const PREFS = [
  { key: "txPush", label: "Transaction alerts", desc: "Push notification for every debit and credit", icon: "bi-bell", tone: "primary" },
  { key: "txEmail", label: "Email receipts", desc: "Get a receipt by email for each payment", icon: "bi-envelope", tone: "violet" },
  { key: "security", label: "Security alerts", desc: "New logins, password and PIN changes · always on", icon: "bi-shield-lock", tone: "success", locked: true },
  { key: "priceAlerts", label: "Rate alerts", desc: "Gift card and USD rate changes", icon: "bi-graph-up", tone: "cyan" },
  { key: "promo", label: "Offers & promotions", desc: "Cashback deals, flight and eSIM promos", icon: "bi-tag", tone: "pink" },
  { key: "newsletter", label: "Monthly statement", desc: "A summary of your spending each month", icon: "bi-file-earmark-text", tone: "orange" },
];

export default function NotificationPrefs() {
  const notif = useApp((s) => s.settings.notif);
  return (
    <AuthGate>
      <Screen header={<Header title="Notifications" subtitle="Choose what we tell you about" />}>
        <Group>
          {PREFS.map((p) => (
            <SwitchRow
              key={p.key}
              icon={p.icon}
              tone={p.tone}
              title={p.label}
              subtitle={p.desc}
              disabled={p.locked}
              value={p.locked ? true : !!notif[p.key]}
              onChange={(v) => { app().update("settings", (s) => ({ ...s, notif: { ...s.notif, [p.key]: v } })); toast("Notification preferences saved", "success"); }}
            />
          ))}
        </Group>
      </Screen>
    </AuthGate>
  );
}
