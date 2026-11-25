/* Airtime + Data pane (shares phone / network state across both tabs). */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { confirmPay, toast } from "@/components/overlay";
import { Badge, Button, Checkbox, Chip, EmptyState, Icon, OptionCard, Row, Summary, Text, TextField } from "@/components/ui";
import { dataPlans, networkById, networks, type DataPlan } from "@/data/catalog";
import { naira } from "@/lib/format";
import { round2 } from "@/lib/random";
import { digitsOnly } from "@/lib/validators";
import { useApp } from "@/store";
import { radius, useTheme } from "@/theme";
import { BeneficiaryStrip } from "./Beneficiaries";
import { amountOnly, detectNetwork, NetworkName, record, saveBeneficiary, showReceipt } from "./shared";

const PHONE_RE = /^0[789][01]\d{8}$/;

export function MobilePane({ mode, initialPhone }: { mode: "airtime" | "data"; initialPhone?: string }) {
  const { c } = useTheme();
  const user = useApp((s) => s.user);
  const [net, setNet] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [amountErr, setAmountErr] = useState<string | null>(null);
  const [ptype, setPtype] = useState("All");
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const [save, setSave] = useState(false);
  const netRef = useRef<string | null>(null);
  netRef.current = net;

  const changeNet = (id: string) => {
    if (id !== netRef.current) { setPlan(null); setPtype("All"); }
    netRef.current = id;
    setNet(id);
  };
  const onPhone = (t: string) => {
    const v = digitsOnly(t).slice(0, 11);
    setPhone(v);
    setPhoneErr(null);
    const d = detectNetwork(v);
    if (d && d !== netRef.current) { changeNet(d); setAuto(true); }
  };
  useEffect(() => { if (initialPhone) onPhone(initialPhone); }, [initialPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = net ? networkById(net) : undefined;
  const plans = net ? dataPlans[net] || [] : [];
  const types = useMemo(() => ["All", ...Array.from(new Set(plans.map((p) => p.type)))], [plans]);
  const shownPlans = ptype === "All" ? plans : plans.filter((p) => p.type === ptype);
  const a = Number(amount) || 0;
  const cashback = round2(a * 0.02);

  const checkPhone = () => {
    if (!PHONE_RE.test(phone)) { setPhoneErr("Enter a valid 11-digit Nigerian phone number"); return false; }
    return true;
  };
  const benLabel = (name: string) => (phone === user.phone ? "My number" : `${name} ${phone.slice(-4)}`);

  const buyAirtime = async () => {
    let ok = checkPhone();
    if (!amount) { setAmountErr("Enter an amount"); ok = false; }
    else if (a < 50) { setAmountErr("Minimum airtime is ₦50"); ok = false; }
    else if (a > 50000) { setAmountErr("Maximum airtime is ₦50,000"); ok = false; }
    if (!n) { toast("Select a network", "warning"); return; }
    if (!ok) return;
    const confirmed = await confirmPay({
      title: "Confirm airtime",
      amount: a,
      rows: [["Network", <NetworkName key="n" id={n.id} />], ["Phone", phone], ["Amount", naira(a, 2)], ["Cashback", "+" + naira(cashback, 2)]],
    });
    if (!confirmed) return;
    const tx = record(a, { type: "airtime", title: `${n.name} Airtime`, subtitle: phone, icon: "bi-phone", tone: "warning" }, { Network: n.name, Phone: phone, Amount: naira(a, 2), Cashback: naira(cashback, 2) });
    if (!tx) return;
    if (save) saveBeneficiary({ kind: "phone", value: phone, network: n.id, label: benLabel(n.name) });
    showReceipt(tx, {
      title: "Airtime sent",
      message: `${naira(a)} ${n.name} airtime sent to **${phone}**.`,
      rows: [["Network", n.name], ["Phone", phone], ["Amount", naira(a, 2)], ["Cashback earned", "+" + naira(cashback, 2)]],
    });
    setAmount(""); setSave(false);
  };

  const buyData = async () => {
    let ok = checkPhone();
    if (!n) { toast("Select a network", "warning"); return; }
    if (!plan) { setPlanErr("Select a data plan"); ok = false; }
    if (!ok || !plan) return;
    const confirmed = await confirmPay({
      title: "Confirm data purchase",
      amount: plan.price,
      rows: [["Network", <NetworkName key="n" id={n.id} />], ["Phone", phone], ["Plan", `${plan.name} ${plan.type}`], ["Validity", plan.validity]],
    });
    if (!confirmed) return;
    const tx = record(plan.price, { type: "data", title: `${n.name} Data ${plan.name}`, subtitle: phone, icon: "bi-wifi", tone: "primary" }, { Network: n.name, Phone: phone, Plan: `${plan.name} (${plan.type})`, Validity: plan.validity });
    if (!tx) return;
    if (save) saveBeneficiary({ kind: "phone", value: phone, network: n.id, label: benLabel(n.name) });
    showReceipt(tx, {
      title: "Data activated",
      message: `**${plan.name}** ${n.name} data sent to **${phone}**.`,
      rows: [["Plan", `${plan.name} · ${plan.type}`], ["Validity", plan.validity], ["Phone", phone], ["Amount", naira(plan.price, 2)]],
    });
    setPlan(null); setSave(false);
  };

  return (
    <View>
      <BeneficiaryStrip
        kind="phone"
        emptyText="Tick “Save as beneficiary” to add numbers you top up often."
        onPick={(b) => {
          setPhone(b.value);
          changeNet(b.network || detectNetwork(b.value) || netRef.current || "mtn");
          setAuto(false);
          setPhoneErr(null);
        }}
      />

      <Text variant="sm" weight="semibold" style={{ marginBottom: 8 }}>Network</Text>
      <Row gap={8} style={{ marginBottom: 14 }}>
        {networks.map((x) => {
          const on = x.id === net;
          return (
            <Pressable
              key={x.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => { changeNet(x.id); setAuto(false); }}
              style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1.5, borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primarySoft : c.surface }}
            >
              <Image source={x.logo} style={{ width: 34, height: 34, borderRadius: 17 }} />
              <Text size={12} weight={on ? "bold" : "semibold"} color={on ? c.primary : c.text}>{x.name}</Text>
            </Pressable>
          );
        })}
      </Row>

      <TextField
        label="Phone number"
        labelRight={auto && n ? <Badge label={`Auto-detected ${n.name}`} tone="success" icon="bi-check-circle" /> : undefined}
        placeholder="080 0000 0000"
        keyboardType="phone-pad"
        maxLength={11}
        value={phone}
        onChangeText={onPhone}
        error={phoneErr}
        prefix={n ? <Image source={n.logo} style={{ width: 22, height: 22, borderRadius: 11 }} /> : <Icon name="bi-phone" size={18} color={c.muted} />}
        suffix={
          <Pressable onPress={() => onPhone(user.phone)} hitSlop={8} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: c.primarySoft }}>
            <Text size={12} weight="bold" color={c.primary}>Me</Text>
          </Pressable>
        }
      />

      {mode === "airtime" ? (
        <View style={{ marginTop: 14 }}>
          <TextField label="Amount" prefix="₦" big keyboardType="number-pad" placeholder="50 – 50,000" value={amount} onChangeText={(t) => { setAmount(amountOnly(t)); setAmountErr(null); }} error={amountErr} />
          <Row gap={8} wrap style={{ marginTop: 10 }}>
            {[100, 200, 500, 1000, 2000, 5000].map((v) => (
              <Chip key={v} label={naira(v)} active={a === v} onPress={() => { setAmount(String(v)); setAmountErr(null); }} />
            ))}
          </Row>
          <Summary
            style={{ marginTop: 14 }}
            rows={[
              ["Network", n ? n.name : "—"],
              ["Recipient", phone || "—"],
              ["Cashback (2%)", "+" + naira(cashback, 2), { color: c.success }],
            ]}
            total={["You pay", naira(a, 2)]}
          />
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          <Row justify="space-between" style={{ marginBottom: 8 }}>
            <Text variant="sm" weight="semibold">Choose a plan</Text>
            {n ? <Text variant="xs" muted>{shownPlans.length} plan{shownPlans.length === 1 ? "" : "s"}</Text> : null}
          </Row>
          {!n ? (
            <EmptyState icon="bi-wifi" title="Select a network" message="Enter a phone number or pick a network to see plans." style={{ paddingVertical: 16 }} />
          ) : (
            <>
              <Row gap={8} wrap style={{ marginBottom: 10 }}>
                {types.map((t) => <Chip key={t} label={t} active={ptype === t} onPress={() => setPtype(t)} />)}
              </Row>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {shownPlans.map((p) => (
                  <OptionCard key={p.id} selected={plan?.id === p.id} onPress={() => { setPlan(p); setPlanErr(null); }} style={{ width: "48%" }}>
                    <Badge label={p.type} tone="primary" />
                    <Text variant="h2" style={{ marginTop: 6 }}>{p.name}</Text>
                    <Text variant="xs" muted>{p.validity}</Text>
                    <Text weight="bold" color={c.primary} style={{ marginTop: 6 }} tabular>{naira(p.price)}</Text>
                  </OptionCard>
                ))}
              </View>
              {planErr ? <Text variant="xs" color={c.danger} style={{ marginTop: 8 }}>{planErr}</Text> : null}
            </>
          )}
        </View>
      )}

      <View style={{ marginTop: 14 }}>
        <Checkbox checked={save} onChange={setSave} label="Save as beneficiary" />
      </View>
      <Button
        title={mode === "airtime" ? "Buy airtime" : plan ? `Buy data · ${naira(plan.price)}` : "Buy data"}
        size="lg"
        full
        icon="bi-lightning-charge-fill"
        style={{ marginTop: 14 }}
        onPress={mode === "airtime" ? buyAirtime : buyData}
      />
    </View>
  );
}
