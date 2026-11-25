import React, { useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { confirmPay } from "@/components/overlay";
import { Button, Checkbox, Chip, Row, Segment, Select, Skeleton, Summary, Text, TextField } from "@/components/ui";
import { discos } from "@/data/catalog";
import { naira } from "@/lib/format";
import { hash31, MOCK_NAMES, pickBy, rndDigits, sleep } from "@/lib/random";
import { digitsOnly } from "@/lib/validators";
import { useTheme } from "@/theme";
import { BeneficiaryStrip } from "./Beneficiaries";
import { amountOnly, record, saveBeneficiary, showReceipt, STREETS, TokenBox, VerifiedBox } from "./shared";

const TARIFF = 68.2;
const FEE = 100;
type MeterType = "Prepaid" | "Postpaid";
type Customer = { name: string; address: string; arrears: number };

export function ElectricityPane() {
  const { c } = useTheme();
  const [disco, setDisco] = useState(discos[0]);
  const [type, setType] = useState<MeterType>("Prepaid");
  const [meter, setMeter] = useState("");
  const [meterErr, setMeterErr] = useState<string | null>(null);
  const [cust, setCust] = useState<Customer | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountErr, setAmountErr] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneBad, setPhoneBad] = useState(false);
  const [save, setSave] = useState(false);
  const token = useRef(0);

  const clearVerify = () => { setCust(null); token.current++; setVerifying(false); };
  const a = Number(amount) || 0;
  const discoShort = (d: string) => d.replace(/\s*\(.*\)\s*$/, "");

  const verify = async (m = meter, d = disco, t = type): Promise<Customer | null> => {
    if (!/^\d{11,13}$/.test(m)) { setMeterErr("Meter number must be 11 – 13 digits"); return null; }
    const my = ++token.current;
    setMeterErr(null); setVerifying(true); setCust(null);
    await sleep(900);
    if (my !== token.current) return null;
    setVerifying(false);
    if (m.startsWith("000")) { setMeterErr(`Meter not found on ${d}. Check the number and try again.`); return null; }
    const cu: Customer = { name: pickBy(MOCK_NAMES, m).toUpperCase(), address: pickBy(STREETS, m + "a"), arrears: t === "Postpaid" ? (hash31(m) % 9000) + 1500 : 0 };
    setCust(cu);
    if (cu.arrears) setAmount((cur) => cur || String(cu.arrears));
    return cu;
  };

  const buy = async () => {
    let errs = false;
    if (!amount) { setAmountErr("Enter an amount"); errs = true; }
    else if (a < 1000) { setAmountErr("Minimum is ₦1,000"); errs = true; }
    else if (a > 500000) { setAmountErr("Maximum is ₦500,000"); errs = true; }
    if (phone && !/^0\d{10}$/.test(phone)) { setPhoneBad(true); errs = true; }
    let cu = cust;
    if (!cu) {
      if (errs) { verify(); return; }
      cu = await verify();
      if (!cu) return;
    }
    if (errs) return;
    const total = a + FEE;
    const units = (a / TARIFF).toFixed(1);
    const ok = await confirmPay({
      title: "Confirm electricity payment",
      amount: total,
      rows: [["Disco", disco], ["Meter", `${meter} · ${type}`], ["Customer", cu.name], ["Amount", naira(a, 2)], ["Service fee", naira(FEE)]],
    });
    if (!ok) return;
    const prepaid = type === "Prepaid";
    const raw = rndDigits(20);
    const tok = raw.replace(/(\d{4})(?=\d)/g, "$1-");
    const ds = discoShort(disco);
    const meta: Record<string, string> = { Disco: disco, "Meter number": meter, "Meter type": type, Customer: cu.name, Address: cu.address, Amount: naira(a, 2), "Service fee": naira(FEE) };
    if (prepaid) { meta.Token = tok; meta.Units = `${units} kWh`; }
    const tx = record(total, { type: "electricity", title: prepaid ? `${ds} Token` : `${ds} Bill`, subtitle: `Meter ${meter}`, icon: "bi-lightning-charge", tone: "orange" }, meta);
    if (!tx) return;
    if (save) saveBeneficiary({ kind: "meter", value: meter, provider: disco, meterType: type, label: `${cu.name.split(" ")[0]} · ${ds.split(" ")[0]}` });
    showReceipt(tx, {
      title: prepaid ? "Token generated" : "Bill paid",
      message: prepaid ? `Your ${ds} token is ready.${phone ? ` We also sent it to ${phone}.` : ""}` : `Payment posted to meter ${meter}.`,
      rows: [["Customer", cu.name], ["Meter", meter], ...(prepaid ? ([["Units", `${units} kWh`]] as [string, string][]) : []), ["Amount paid", naira(total, 2)]],
      extra: prepaid ? <TokenBox label="Electricity token" value={tok} copyValue={raw} /> : undefined,
    });
    setAmount(""); setSave(false);
  };

  return (
    <View>
      <BeneficiaryStrip
        kind="meter"
        onPick={(b) => {
          const d = b.provider && discos.includes(b.provider) ? b.provider : disco;
          const t = (b.meterType as MeterType) || "Prepaid";
          setDisco(d); setType(t); setMeter(b.value); clearVerify();
          verify(b.value, d, t);
        }}
      />
      <Select label="Distribution company" title="Choose your disco" value={disco} options={discos.map((d) => ({ value: d, label: d }))} onChange={(d) => { setDisco(d); clearVerify(); }} />
      <Text variant="sm" weight="semibold" style={{ marginTop: 14, marginBottom: 6 }}>Meter type</Text>
      <Segment value={type} onChange={(t) => { setType(t); clearVerify(); }} options={[{ value: "Prepaid", label: "Prepaid" }, { value: "Postpaid", label: "Postpaid" }]} />

      <TextField
        containerStyle={{ marginTop: 14 }}
        label="Meter number"
        placeholder="11 – 13 digit meter number"
        keyboardType="number-pad"
        maxLength={13}
        value={meter}
        onChangeText={(t) => { setMeter(digitsOnly(t)); setMeterErr(null); clearVerify(); }}
        error={meterErr}
        success={!!cust}
        suffix={
          <Pressable onPress={() => verify()} disabled={verifying} hitSlop={6} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: c.primarySoft }}>
            {verifying ? <ActivityIndicator size="small" color={c.primary} /> : <Text size={12} weight="bold" color={c.primary}>{cust ? "Verified" : "Verify"}</Text>}
          </Pressable>
        }
      />
      {verifying ? (
        <View style={{ marginTop: 10, gap: 6 }}><Skeleton w="60%" h={14} /><Skeleton w="85%" h={12} /></View>
      ) : cust ? (
        <VerifiedBox
          title={cust.name}
          lines={[cust.address, <Text key="t" variant="xs" muted>{type} · {disco}{cust.arrears ? <Text variant="xs" muted> · Outstanding <Text variant="xs" weight="bold">{naira(cust.arrears)}</Text></Text> : null}</Text>]}
        />
      ) : null}

      <TextField containerStyle={{ marginTop: 14 }} label="Amount" prefix="₦" big keyboardType="number-pad" placeholder="Min ₦1,000" value={amount} onChangeText={(t) => { setAmount(amountOnly(t)); setAmountErr(null); }} error={amountErr} />
      <Row gap={8} wrap style={{ marginTop: 10 }}>
        {[2000, 5000, 10000, 20000, 50000].map((v) => <Chip key={v} label={naira(v)} active={a === v} onPress={() => { setAmount(String(v)); setAmountErr(null); }} />)}
      </Row>
      <TextField containerStyle={{ marginTop: 14 }} label="Phone for token SMS (optional)" placeholder="080…" keyboardType="phone-pad" maxLength={11} value={phone} onChangeText={(t) => { setPhone(digitsOnly(t)); setPhoneBad(false); }} error={phoneBad ? " " : null} />

      <Summary
        style={{ marginTop: 14 }}
        rows={[
          ...(type === "Prepaid" ? ([["Estimated units", `${(a / TARIFF).toFixed(1)} kWh`]] as [string, string][]) : []),
          ["Service fee", a > 0 ? naira(FEE) : "—"],
        ]}
        total={["Total", naira(a > 0 ? a + FEE : 0, 2)]}
      />
      <View style={{ marginTop: 12 }}><Checkbox checked={save} onChange={setSave} label="Save meter as beneficiary" /></View>
      <Button title={type === "Prepaid" ? "Buy token" : "Pay postpaid bill"} size="lg" full icon="bi-lightning-charge-fill" style={{ marginTop: 14 }} onPress={buy} />
    </View>
  );
}
