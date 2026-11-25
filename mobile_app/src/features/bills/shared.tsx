/* Shared bills helpers: record(), receipts, beneficiaries, mock verification data. */
import React from "react";
import { Image, View } from "react-native";
import { copy, receiptText, shareText, success, toast } from "@/components/overlay";
import { Button, Row, StatusPill, Text, type SummaryRow } from "@/components/ui";
import { networkById } from "@/data/catalog";
import { datetime, naira, ref } from "@/lib/format";
import { app, type Beneficiary, type Tx, type TxInput } from "@/store";
import { radius, useTheme } from "@/theme";

export type BillTab = "airtime" | "data" | "electricity" | "cable" | "betting" | "education";

export const BILL_TABS: { id: BillTab; label: string; icon: string; tone: string }[] = [
  { id: "airtime", label: "Airtime", icon: "bi-phone", tone: "warning" },
  { id: "data", label: "Data", icon: "bi-wifi", tone: "primary" },
  { id: "electricity", label: "Electricity", icon: "bi-lightning-charge", tone: "orange" },
  { id: "cable", label: "Cable TV", icon: "bi-tv", tone: "cyan" },
  { id: "betting", label: "Betting", icon: "bi-trophy", tone: "success" },
  { id: "education", label: "Education", icon: "bi-mortarboard", tone: "violet" },
];
export const isBillTab = (t: unknown): t is BillTab => typeof t === "string" && BILL_TABS.some((x) => x.id === t);

export const STREETS = [
  "14 Adeola Odeku St, Victoria Island", "7 Allen Avenue, Ikeja", "22 Wuse Zone 4, Abuja", "3 Ring Road, Ibadan",
  "18 Ogui Road, Enugu", "9 Aba Road, Port Harcourt", "41 Zoo Road, Kano",
];

/** Network prefix → id */
const PREFIXES: Record<string, string[]> = {
  mtn: ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916"],
  airtel: ["0802", "0808", "0708", "0812", "0701", "0902", "0901", "0904", "0907", "0912"],
  glo: ["0805", "0807", "0705", "0815", "0811", "0905", "0915"],
  "9mobile": ["0809", "0817", "0818", "0909", "0908"],
};
const PREFIX_MAP: Record<string, string> = {};
Object.entries(PREFIXES).forEach(([id, list]) => list.forEach((p) => (PREFIX_MAP[p] = id)));
export const detectNetwork = (phone: string): string | undefined => (phone.length >= 4 ? PREFIX_MAP[phone.slice(0, 4)] : undefined);

export const amountOnly = (t: string) => t.replace(/\D/g, "").slice(0, 9);

/** Debit + notify. Returns the tx, or null when the wallet is short (toast shown). */
export function record(amount: number, tx: TxInput, meta: Record<string, string>): Tx | null {
  const s = app();
  const t = s.debit(amount, { ...tx, ref: ref("AB"), meta });
  if (!t) {
    toast("Insufficient balance", "error");
    return null;
  }
  s.notify({ icon: tx.icon, tone: tx.tone, title: tx.title + " successful", body: `${naira(amount)} · ${tx.subtitle ?? ""}` });
  return t;
}

/** Receipt with Reference / Date / Status rows + Share & Copy actions. */
export function showReceipt(tx: Tx, o: { title: string; message: string; rows: SummaryRow[]; extra?: React.ReactNode }) {
  const rows: SummaryRow[] = [
    ...o.rows,
    ["Reference", tx.ref || tx.id],
    ["Date", datetime(tx.date)],
    ["Status", <StatusPill key="st" status="success" label="Successful" />],
  ];
  const text = receiptText(o.title, [...rows.slice(0, -1), ["Status", "Successful"]]);
  success({
    title: o.title,
    message: o.message,
    rows,
    extra: o.extra,
    actions: [
      { label: "Share", icon: "bi-share", keepOpen: true, onPress: () => shareText("AutoBiz receipt", text) },
      { label: "Copy", icon: "bi-copy", keepOpen: true, onPress: () => copy(text, "Receipt copied to clipboard") },
    ],
  });
}

/* ---------------- Beneficiaries ---------------- */
export function saveBeneficiary(b: Omit<Beneficiary, "id">) {
  app().update("beneficiaries", (list) => [{ ...b, id: "BN" + Date.now() }, ...list.filter((x) => !(x.kind === b.kind && x.value === b.value))].slice(0, 20));
}
export function removeBeneficiary(id: string) {
  app().update("beneficiaries", (list) => list.filter((x) => x.id !== id));
  toast("Beneficiary removed", "info");
}
export const maskValue = (v: string) => {
  const last4 = v.slice(-4);
  const len = v.length > 6 ? 7 : 4;
  return "•".repeat(Math.max(0, len - last4.length)) + last4;
};

/* ---------------- Small shared UI ---------------- */
export function NetworkName({ id, size = 20 }: { id: string; size?: number }) {
  const n = networkById(id);
  if (!n) return <Text variant="sm" weight="semibold">—</Text>;
  return (
    <Row gap={6}>
      <Image source={n.logo} style={{ width: size, height: size, borderRadius: size / 2 }} />
      <Text variant="sm" weight="semibold">{n.name}</Text>
    </Row>
  );
}

/** Dashed box showing a token / PIN with a copy button. */
export function TokenBox({ label, value, copyValue, sub }: { label: string; value: string; copyValue: string; sub?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: c.primary300, backgroundColor: c.primarySoft, borderRadius: radius.lg, padding: 14, marginTop: 8 }}>
      <Row justify="space-between">
        <View style={{ flex: 1 }}>
          <Text variant="label" muted>{label}</Text>
          {sub ? <Text variant="xs" muted>{sub}</Text> : null}
          <Text weight="extrabold" size={17} tabular selectable style={{ marginTop: 4, letterSpacing: 0.5 }} color={c.text}>{value}</Text>
        </View>
        <Button title="Copy" icon="bi-copy" size="sm" variant="soft" onPress={() => copy(copyValue, "Copied")} />
      </Row>
    </View>
  );
}

/** Green "verified" box */
export function VerifiedBox({ title, lines, right }: { title: string; lines: (string | React.ReactNode)[]; right?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: c.successSoft, marginTop: 10 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.success, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        <Text size={12} weight="bold" color="#fff">✓</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="bold">{title}</Text>
        {lines.map((l, i) => (typeof l === "string" ? <Text key={i} variant="xs" muted>{l}</Text> : <View key={i}>{l}</View>))}
      </View>
      {right}
    </View>
  );
}

/** Pane card heading */
export function PaneTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text variant="h3">{title}</Text>
      {subtitle ? <Text variant="xs" muted style={{ marginTop: 2 }}>{subtitle}</Text> : null}
    </View>
  );
}
