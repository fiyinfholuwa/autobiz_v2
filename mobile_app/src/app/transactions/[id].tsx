import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { copy, receiptText, shareText, toast } from "@/components/overlay";
import { Button, Card, EmptyState, Header, IconButton, IconTile, Notice, Row, Screen, Select, Sheet, StatusPill, Summary, Text, TextField, type SummaryRow } from "@/components/ui";
import { datetime, naira } from "@/lib/format";
import { rndDigits, sleep } from "@/lib/random";
import { app, txTypeLabel, useApp } from "@/store";
import { radius, useTheme } from "@/theme";

export default function TxDetailScreen() {
  return <AuthGate><TxDetail /></AuthGate>;
}

const REASONS = ["Value not received", "Debited twice", "Wrong amount charged", "Wrong recipient / number", "Token not working", "Other"];

function TxDetail() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useApp((s) => s.transactions.find((x) => x.id === decodeURIComponent(id || "")));
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [errs, setErrs] = useState<{ reason?: string; details?: string }>({});
  const [busy, setBusy] = useState(false);

  if (!t) {
    return (
      <Screen header={<Header title="Transaction details" />}>
        <EmptyState icon="bi-receipt" tone="danger" title="Transaction not found" message="It may have been removed or the link is incorrect." />
      </Screen>
    );
  }
  const reference = t.ref || t.id;
  const rows: SummaryRow[] = [
    ["Type", txTypeLabel(t.type)],
    ["Description", t.subtitle || "—"],
    ["Direction", t.direction === "in" ? "Credit (money in)" : "Debit (money out)"],
    ...Object.entries(t.meta || {}).map(([k, v]) => [k, v] as SummaryRow),
    ["Date", datetime(t.date)],
    ["Transaction ID", t.id],
  ];

  const submit = async () => {
    const e: typeof errs = {};
    if (!reason) e.reason = "Please select a reason";
    if (details.trim().length < 10) e.details = "Please describe the issue (min 10 characters)";
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    await sleep(900);
    const ticket = "TCK-" + rndDigits(6);
    const s = app();
    s.update("transactions", (l) => l.map((x) => (x.id === t.id ? { ...x, reported: ticket } : x)));
    s.notify({ icon: "bi-headset", tone: "primary", title: "Support ticket opened", body: `${ticket}: ${reason} — we'll respond within 24 hours.` });
    setBusy(false);
    setOpen(false);
    toast(`Report submitted · **${ticket}**`);
  };

  return (
    <Screen
      header={<Header title="Transaction details" right={<IconButton icon="bi-share" accessibilityLabel="Share receipt" onPress={() => shareText("AutoBiz receipt", receiptText(t.title, [["Amount", naira(t.amount, 2)], ["Status", t.status], ["Reference", reference], ...rows]))} />} />}
      footer={
        <Row gap={10}>
          <Button title={t.reported ? "Reported" : "Report issue"} icon="bi-headset" variant="outline" style={{ flex: 1 }} disabled={!!t.reported} onPress={() => { setReason(""); setDetails(""); setErrs({}); setOpen(true); }} />
          <Button title="Share receipt" icon="bi-share" style={{ flex: 1 }} onPress={() => shareText("AutoBiz receipt", receiptText(t.title, [["Amount", naira(t.amount, 2)], ["Status", t.status], ["Reference", reference], ...rows]))} />
        </Row>
      }
    >
      <Card style={{ alignItems: "center", marginTop: 8, paddingVertical: 24 }}>
        <IconTile icon={t.icon} tone={t.tone} size={60} rounded />
        <Text variant="title" center style={{ marginTop: 12 }}>{t.title}</Text>
        <Text variant="display" tabular color={t.direction === "in" ? c.success : c.text} style={{ marginTop: 6 }}>
          {t.direction === "in" ? "+" : "−"}{naira(t.amount, 2)}
        </Text>
        <View style={{ marginTop: 10 }}><StatusPill status={t.status} label={t.status === "success" ? "Successful" : undefined} /></View>
        {t.reported ? <Notice tone="warning" icon="bi-headset" style={{ marginTop: 14, alignSelf: "stretch" }}>{`Issue reported · ticket ${t.reported}`}</Notice> : null}
      </Card>

      <Row gap={10} style={{ marginTop: 14, padding: 14, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderStyle: "dashed" }}>
        <View style={{ flex: 1 }}>
          <Text variant="xs" muted>Reference</Text>
          <Text weight="bold" selectable>{reference}</Text>
        </View>
        <Button title="Copy" icon="bi-copy" size="sm" variant="soft" onPress={() => copy(reference, "Reference copied")} />
      </Row>

      <Summary rows={rows} style={{ marginTop: 14 }} />
      <Text variant="xs" muted center style={{ marginTop: 16 }}>AutoBiz Technologies Ltd · support@autobiz.ng</Text>

      <Sheet visible={open} onClose={() => setOpen(false)} locked={busy} title="Report an issue" scroll footer={<Button title="Submit report" size="lg" full loading={busy} loadingText="Submitting…" onPress={submit} />}>
        <Row gap={12} style={{ padding: 12, borderRadius: radius.lg, backgroundColor: c.surface2, marginBottom: 16 }}>
          <IconTile icon={t.icon} tone={t.tone} size={40} />
          <View style={{ flex: 1 }}>
            <Text weight="semibold" numberOfLines={1}>{t.title}</Text>
            <Text variant="xs" muted>{naira(t.amount, 2)} · {datetime(t.date)}</Text>
          </View>
        </Row>
        <View style={{ gap: 14 }}>
          <Select label="What went wrong?" placeholder="Select a reason" value={reason} options={REASONS.map((r) => ({ value: r, label: r }))} onChange={(v) => { setReason(v); setErrs((e) => ({ ...e, reason: undefined })); }} error={errs.reason} />
          <TextField label="Details" placeholder="Tell us a little more…" multiline maxLength={500} value={details} onChangeText={(v) => { setDetails(v); setErrs((e) => ({ ...e, details: undefined })); }} error={errs.details} hint={`${details.length}/500`} />
        </View>
      </Sheet>
    </Screen>
  );
}
