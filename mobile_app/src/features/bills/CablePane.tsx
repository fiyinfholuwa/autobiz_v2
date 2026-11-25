import React, { useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { confirmPay, toast } from "@/components/overlay";
import { Badge, BrandTile, Button, Checkbox, OptionCard, Row, Segment, Select, Skeleton, StatusPill, Summary, Text, TextField } from "@/components/ui";
import { cableProviders } from "@/data/catalog";
import { date, naira } from "@/lib/format";
import { hash31, MOCK_NAMES, pickBy, sleep } from "@/lib/random";
import { digitsOnly } from "@/lib/validators";
import { radius, useTheme } from "@/theme";
import { BeneficiaryStrip } from "./Beneficiaries";
import { record, saveBeneficiary, showReceipt, VerifiedBox } from "./shared";

const DAY = 864e5;
const ABBR: Record<string, string> = { dstv: "DStv", gotv: "GOtv", startimes: "ST" };
type Customer = { name: string; plan: string; price: number; due: number };

export function CablePane() {
  const { c } = useTheme();
  const [prov, setProv] = useState("dstv");
  const [iuc, setIuc] = useState("");
  const [iucErr, setIucErr] = useState<string | null>(null);
  const [cust, setCust] = useState<Customer | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [mode, setMode] = useState<"renew" | "change">("renew");
  const [pick, setPick] = useState<string | null>(null);
  const [months, setMonths] = useState("1");
  const [save, setSave] = useState(false);
  const token = useRef(0);

  const P = cableProviders[prov];
  const clearVerify = () => { setCust(null); token.current++; setVerifying(false); setMode("renew"); setPick(null); };

  const verify = async (v = iuc, pid = prov) => {
    if (!/^\d{10,12}$/.test(v)) { setIucErr("Smartcard/IUC number must be 10 – 12 digits"); return null; }
    const my = ++token.current;
    setIucErr(null); setVerifying(true); setCust(null);
    await sleep(900);
    if (my !== token.current) return null;
    setVerifying(false);
    const plans = cableProviders[pid].plans;
    const pl = plans[hash31(v) % plans.length];
    const cu: Customer = { name: pickBy(MOCK_NAMES, v + pid).toUpperCase(), plan: pl.name, price: pl.price, due: Date.now() + ((hash31(v) % 20) - 6) * DAY };
    setCust(cu); setMode("renew"); setPick(null);
    return cu;
  };

  const selName = mode === "renew" ? cust?.plan ?? null : pick;
  const selPlan = selName ? P.plans.find((p) => p.name === selName) : undefined;
  const m = Number(months);
  const total = (selPlan?.price || 0) * m;
  const expired = cust ? cust.due < Date.now() : false;

  const buy = async () => {
    if (!cust) { verify(); return; }
    if (!selPlan) { toast("Select a bouquet", "warning"); return; }
    const change = mode === "change";
    const ok = await confirmPay({
      title: "Confirm subscription",
      amount: total,
      rows: [["Provider", P.name], ["Smartcard", iuc], ["Customer", cust.name], ["Bouquet", `${selPlan.name} (${change ? "change" : "renewal"})`], ["Duration", `${m} month${m > 1 ? "s" : ""}`]],
    });
    if (!ok) return;
    const newDue = Math.max(Date.now(), cust.due) + m * 30 * DAY;
    const tx = record(total, { type: "cable", title: `${P.name} ${selPlan.name}`, subtitle: `IUC ${iuc}`, icon: "bi-tv", tone: "cyan" }, {
      Provider: P.name, "Smartcard/IUC": iuc, Customer: cust.name, Bouquet: selPlan.name, Action: change ? "Plan change" : "Renewal", Duration: `${m} month${m > 1 ? "s" : ""}`, "Next due": date(newDue),
    });
    if (!tx) return;
    if (save) saveBeneficiary({ kind: "smartcard", value: iuc, provider: prov, label: `${cust.name.split(" ")[0]} · ${P.name}` });
    showReceipt(tx, {
      title: "Subscription active",
      message: `${P.name} **${selPlan.name}** activated for ${cust.name}.`,
      rows: [["Smartcard", iuc], ["Bouquet", `${P.name} ${selPlan.name}`], ["Duration", `${m} month${m > 1 ? "s" : ""}`], ["Next due date", date(newDue)], ["Amount", naira(total, 2)]],
    });
    setCust({ ...cust, due: newDue, plan: selPlan.name, price: selPlan.price });
    setMode("renew"); setPick(null); setSave(false);
  };

  return (
    <View>
      <BeneficiaryStrip
        kind="smartcard"
        onPick={(b) => {
          const pid = b.provider && cableProviders[b.provider] ? b.provider : prov;
          setProv(pid); setIuc(b.value); clearVerify();
          verify(b.value, pid);
        }}
      />
      <Text variant="sm" weight="semibold" style={{ marginBottom: 8 }}>Provider</Text>
      <Row gap={8}>
        {Object.entries(cableProviders).map(([id, p]) => {
          const on = id === prov;
          return (
            <Pressable key={id} onPress={() => { setProv(id); clearVerify(); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1.5, borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primarySoft : c.surface }}>
              <BrandTile color={p.color} text={ABBR[id]} size={40} />
              <Text size={12} weight={on ? "bold" : "semibold"} color={on ? c.primary : c.text}>{p.name}</Text>
            </Pressable>
          );
        })}
      </Row>

      <TextField
        containerStyle={{ marginTop: 14 }}
        label="Smartcard / IUC number"
        placeholder="10 – 12 digit number"
        keyboardType="number-pad"
        maxLength={12}
        value={iuc}
        onChangeText={(t) => { setIuc(digitsOnly(t)); setIucErr(null); clearVerify(); }}
        error={iucErr}
        success={!!cust}
        suffix={
          <Pressable onPress={() => verify()} disabled={verifying} hitSlop={6} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: c.primarySoft }}>
            {verifying ? <ActivityIndicator size="small" color={c.primary} /> : <Text size={12} weight="bold" color={c.primary}>{cust ? "Verified" : "Verify"}</Text>}
          </Pressable>
        }
      />
      {verifying ? (
        <View style={{ marginTop: 10, gap: 6 }}><Skeleton w="55%" h={14} /><Skeleton w="80%" h={12} /></View>
      ) : cust ? (
        <VerifiedBox
          title={cust.name}
          lines={[
            <Text key="b" variant="xs" muted>Current bouquet: <Text variant="xs" weight="bold">{P.name} {cust.plan}</Text> · {naira(cust.price)}/mo</Text>,
            <View key="s" style={{ marginTop: 4 }}>
              {expired ? <StatusPill status="failed" label={`Expired · since ${date(cust.due)}`} /> : <StatusPill status="success" label={`Active · due ${date(cust.due)}`} />}
            </View>,
          ]}
        />
      ) : null}

      {cust ? (
        <View style={{ marginTop: 16 }}>
          <Segment value={mode} onChange={(v) => { setMode(v); setPick(null); }} options={[{ value: "renew", label: "Renew current plan" }, { value: "change", label: "Change plan" }]} />
          {mode === "renew" ? (
            <OptionCard selected style={{ marginTop: 12 }}>
              <Row justify="space-between" style={{ paddingRight: 22 }}>
                <View>
                  <Text weight="bold">{P.name} {cust.plan}</Text>
                  <Text variant="xs" muted>Renew your current bouquet</Text>
                </View>
                <Text weight="bold" tabular>{naira(cust.price)}</Text>
              </Row>
            </OptionCard>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
              {P.plans.map((p) => (
                <OptionCard key={p.name} selected={pick === p.name} onPress={() => setPick(p.name)} style={{ width: "48%" }}>
                  {p.name === cust.plan ? <Badge label="Current" tone="cyan" /> : null}
                  <Text weight="bold" style={{ marginTop: 4 }}>{p.name}</Text>
                  <Text weight="bold" color={c.primary} tabular style={{ marginTop: 4 }}>{naira(p.price)}</Text>
                </OptionCard>
              ))}
            </View>
          )}
          <Select
            containerStyle={{ marginTop: 14 }}
            label="Duration"
            value={months}
            onChange={setMonths}
            options={["1", "2", "3", "6"].map((v) => ({ value: v, label: `${v} month${v === "1" ? "" : "s"}` }))}
          />
          <Text variant="xs" muted style={{ marginTop: 8 }}>Convenience fee: ₦0</Text>
          <Summary
            style={{ marginTop: 12 }}
            rows={[["Bouquet", selPlan ? `${P.name} ${selPlan.name}` : "Select a plan"], ["Duration", `${m} month${m > 1 ? "s" : ""}`]]}
            total={["Total", naira(total, 2)]}
          />
          <View style={{ marginTop: 12 }}><Checkbox checked={save} onChange={setSave} label="Save smartcard as beneficiary" /></View>
        </View>
      ) : null}

      <Button title={cust ? "Pay subscription" : "Verify smartcard"} size="lg" full icon={cust ? "bi-tv" : "bi-search"} style={{ marginTop: 14 }} loading={verifying} loadingText="Verifying…" onPress={buy} />
    </View>
  );
}
