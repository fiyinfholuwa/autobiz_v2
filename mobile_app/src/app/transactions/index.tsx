import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Share, View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { toast } from "@/components/overlay";
import { TxRow } from "@/components/TxRow";
import { Button, Card, Chip, ChipRow, DateField, EmptyState, Header, IconButton, Row, Screen, Segment, Select, Stat, Text, TextField } from "@/components/ui";
import { addDays, dayHeading, isoDay, naira, parseDay, startOfDay, time } from "@/lib/format";
import { txTypeLabel, useApp, type Tx } from "@/store";
import { useTheme } from "@/theme";

export default function TransactionsScreen() {
  return <AuthGate><Transactions /></AuthGate>;
}

type Range = "all" | "1" | "7" | "30" | "90" | "custom";
const PAGE = 15;

function Transactions() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ type?: string }>();
  const all = useApp((s) => s.transactions);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [type, setType] = useState(params.type || "all");
  const [range, setRange] = useState<Range>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dir, setDir] = useState<"all" | "in" | "out">("all");
  const [status, setStatus] = useState<"all" | "success" | "pending" | "failed">("all");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => { const t = setTimeout(() => setDq(q), 200); return () => clearTimeout(t); }, [q]);
  useEffect(() => setShown(PAGE), [dq, type, range, from, to, dir, status]);
  useEffect(() => { if (params.type) setType(params.type); }, [params.type]);

  const rangeInvalid = range === "custom" && !!from && !!to && parseDay(from) > parseDay(to);
  useEffect(() => { if (rangeInvalid) toast("End date must be after start date", "warning"); }, [rangeInvalid]);

  const typeOptions = useMemo(() => {
    const set = new Set(all.map((t) => t.type));
    if (type !== "all") set.add(type);
    return [{ value: "all", label: "All types" }, ...[...set].sort().map((t) => ({ value: t, label: txTypeLabel(t) }))];
  }, [all, type]);

  const active = !!dq || type !== "all" || range !== "all" || dir !== "all" || status !== "all";
  const list = useMemo(() => {
    const s = dq.trim().toLowerCase();
    let lo = -Infinity, hi = Infinity;
    if (range !== "all" && range !== "custom") lo = startOfDay(addDays(Date.now(), -(Number(range) - 1)));
    if (range === "custom" && !rangeInvalid) {
      if (from) lo = parseDay(from);
      if (to) hi = parseDay(to) + 86399999;
    }
    return all
      .filter((t) => {
        if (type !== "all" && t.type !== type) return false;
        if (dir !== "all" && t.direction !== dir) return false;
        if (status !== "all" && t.status !== status) return false;
        if (t.date < lo || t.date > hi) return false;
        if (s) {
          const hay = [t.title, t.subtitle, t.ref || t.id, t.type, ...Object.values(t.meta || {})].join(" ").toLowerCase();
          if (!hay.includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date - a.date);
  }, [all, dq, type, range, from, to, dir, status, rangeInvalid]);

  const ok = list.filter((t) => t.status === "success");
  const moneyIn = ok.filter((t) => t.direction === "in").reduce((a, t) => a + t.amount, 0);
  const moneyOut = ok.filter((t) => t.direction === "out").reduce((a, t) => a + t.amount, 0);
  const net = moneyIn - moneyOut;
  const pending = list.filter((t) => t.status === "pending").length;
  const sfx = active ? " (filtered)" : "";

  const groups = useMemo(() => {
    const g: { day: string; items: Tx[] }[] = [];
    list.slice(0, shown).forEach((t) => {
      const d = dayHeading(t.date);
      const last = g[g.length - 1];
      if (last && last.day === d) last.items.push(t);
      else g.push({ day: d, items: [t] });
    });
    return g;
  }, [list, shown]);

  const clear = () => { setQ(""); setDq(""); setType("all"); setRange("all"); setFrom(""); setTo(""); setDir("all"); setStatus("all"); router.setParams({ type: undefined }); };

  const exportCsv = async () => {
    if (!list.length) return toast("Nothing to export", "warning");
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [["Date", "Time", "Reference", "Type", "Title", "Description", "Direction", "Amount (NGN)", "Status"].map(cell).join(",")];
    list.forEach((t) => rows.push([isoDay(t.date), time(t.date), t.ref || t.id, txTypeLabel(t.type), t.title, t.subtitle || "", t.direction === "in" ? "Credit" : "Debit", (t.direction === "in" ? t.amount : -t.amount).toFixed(2), t.status].map(cell).join(",")));
    try {
      await Share.share({ title: `autobiz-transactions-${isoDay(Date.now())}.csv`, message: rows.join("\r\n") });
      toast(`Exported ${list.length} transaction${list.length === 1 ? "" : "s"}`);
    } catch { toast("Export failed", "error"); }
  };

  return (
    <Screen header={<Header title="Transactions" subtitle="Every payment, purchase and transfer" right={<IconButton icon="bi-download" accessibilityLabel="Export CSV" onPress={exportCsv} />} />} padded={false}>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <Row gap={10}>
          <Stat label={"Money in" + sfx} value={naira(moneyIn)} icon="bi-arrow-down-left" tone="success" />
          <Stat label={"Money out" + sfx} value={naira(moneyOut)} icon="bi-arrow-up-right" tone="danger" />
        </Row>
        <Row gap={10}>
          <Stat label={"Net flow" + sfx} value={(net < 0 ? "−" : "+") + naira(Math.abs(net))} icon="bi-activity" tone="primary" />
          <Stat label={"Transactions" + sfx} value={`${list.length} · ${pending} pending`} icon="bi-receipt" tone="violet" />
        </Row>
        <TextField icon="bi-search" placeholder="Search title, number, reference…" value={q} onChangeText={setQ} autoCorrect={false} autoCapitalize="none" containerStyle={{ marginTop: 6 }} />
        <Row gap={10}>
          <Select containerStyle={{ flex: 1 }} title="Transaction type" value={type} options={typeOptions} onChange={setType} />
          <Select<Range>
            containerStyle={{ flex: 1 }} title="Date range" value={range} onChange={setRange}
            options={[{ value: "all", label: "All time" }, { value: "1", label: "Today" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }, { value: "custom", label: "Custom range…" }]}
          />
        </Row>
        {range === "custom" ? (
          <Row gap={10} align="flex-start">
            <DateField containerStyle={{ flex: 1 }} label="From" value={from} onChange={setFrom} max={isoDay(Date.now())} display="iso" />
            <DateField containerStyle={{ flex: 1 }} label="To" value={to} onChange={setTo} max={isoDay(Date.now())} display="iso" error={rangeInvalid ? "End date must be after start date" : null} />
          </Row>
        ) : null}
        <Segment small value={dir} onChange={setDir} options={[{ value: "all", label: "All" }, { value: "in", label: "Money in" }, { value: "out", label: "Money out" }]} />
      </View>
      <ChipRow style={{ marginTop: 12 }}>
        {([["all", "All statuses"], ["success", "Successful"], ["pending", "Pending"], ["failed", "Failed"]] as const).map(([v, l]) => (
          <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />
        ))}
        {active ? <Chip label="Clear filters" icon="bi-x-lg" onPress={clear} /> : null}
      </ChipRow>

      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        {list.length === 0 ? (
          <Card>
            {active ? (
              <EmptyState icon="bi-search" title="No matching transactions" message="Try a different search or clear your filters." action="Clear filters" onAction={clear} />
            ) : (
              <EmptyState icon="bi-receipt" title="No transactions yet" message="Your payments and purchases will appear here." action="Make a payment" onAction={() => router.push("/(tabs)/pay")} />
            )}
          </Card>
        ) : (
          <>
            {groups.map((g) => (
              <View key={g.day} style={{ marginBottom: 12 }}>
                <Text variant="label" muted style={{ marginBottom: 6, marginLeft: 4 }}>{g.day}</Text>
                <Card style={{ paddingVertical: 4 }}>
                  {g.items.map((t, i) => (
                    <View key={t.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                      <TxRow t={t} />
                    </View>
                  ))}
                </Card>
              </View>
            ))}
            {shown < list.length ? (
              <Button title={`Load more (${list.length - shown} more)`} variant="soft" full onPress={() => setShown((n) => n + PAGE)} />
            ) : (
              <Text variant="xs" muted center>Showing all {list.length} transaction{list.length === 1 ? "" : "s"}</Text>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}
