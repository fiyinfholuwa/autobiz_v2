import React, { useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { confirmPay } from "@/components/overlay";
import { BrandTile, Button, Select, Summary, Text, TextField } from "@/components/ui";
import { naira } from "@/lib/format";
import { MOCK_NAMES, pickBy, rndDigits, sleep } from "@/lib/random";
import { digitsOnly } from "@/lib/validators";
import { useApp } from "@/store";
import { radius, useTheme } from "@/theme";
import { record, showReceipt, TokenBox, VerifiedBox } from "./shared";

export const EXAMS = [
  { id: "waec", name: "WAEC Result Checker", short: "WAEC", price: 3900, bg: "#1c7ed6", abbr: "WA" },
  { id: "waecreg", name: "WAEC Registration PIN", short: "WAEC Reg", price: 18500, bg: "#1864ab", abbr: "WR" },
  { id: "neco", name: "NECO Result Token", short: "NECO", price: 1300, bg: "#2b8a3e", abbr: "NE" },
  { id: "nabteb", name: "NABTEB Result PIN", short: "NABTEB", price: 1000, bg: "#c2255c", abbr: "NA" },
  { id: "jamb", name: "JAMB UTME ePIN", short: "JAMB UTME", price: 7700, bg: "#2f9e44", abbr: "JB", needsId: true },
  { id: "jambde", name: "JAMB Direct Entry ePIN", short: "JAMB DE", price: 7700, bg: "#5c940d", abbr: "DE", needsId: true },
];

export function EducationPane() {
  const { c } = useTheme();
  const user = useApp((s) => s.user);
  const [exam, setExam] = useState("waec");
  const [qty, setQty] = useState("1");
  const [phone, setPhone] = useState(user.phone);
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [cand, setCand] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const token = useRef(0);
  const E = EXAMS.find((e) => e.id === exam)!;
  const q = E.needsId ? 1 : Number(qty);
  const total = E.price * q;

  const clearVerify = () => { setCand(null); token.current++; setVerifying(false); };
  const verify = async () => {
    if (!/^\d{10}$/.test(code)) { setCodeErr("Profile code must be 10 digits"); return null; }
    const my = ++token.current;
    setCodeErr(null); setVerifying(true);
    await sleep(800);
    if (my !== token.current) return null;
    setVerifying(false);
    const n = pickBy(MOCK_NAMES, code);
    setCand(n);
    return n;
  };

  const buy = async () => {
    if (!/^0\d{10}$/.test(phone)) { setPhoneErr("Enter a valid phone number for PIN delivery"); return; }
    let candidate = cand;
    if (E.needsId && !candidate) { candidate = await verify(); if (!candidate) return; }
    const ok = await confirmPay({
      title: "Confirm PIN purchase",
      amount: total,
      rows: [["Exam", E.name], ["Quantity", String(q)], ...(E.needsId ? ([["Candidate", candidate || ""]] as [string, string][]) : []), ["Deliver to", phone]],
    });
    if (!ok) return;
    const pins = Array.from({ length: q }, () => ({ serial: "WRN" + rndDigits(10), pin: rndDigits(12) }));
    const meta: Record<string, string> = { Exam: E.name, Quantity: String(q), Phone: phone };
    if (E.needsId) { meta["Profile code"] = code; meta.Candidate = candidate || ""; }
    pins.forEach((p, i) => { meta[`PIN ${i + 1}`] = `${p.pin} (Serial ${p.serial})`; });
    const tx = record(total, { type: "education", title: `${E.short} PIN${q > 1 ? ` ×${q}` : ""}`, subtitle: E.name, icon: "bi-mortarboard", tone: "violet" }, meta);
    if (!tx) return;
    showReceipt(tx, {
      title: "PIN purchased",
      message: `${q} ${E.name}${q > 1 ? "s" : ""} — also sent by SMS to ${phone}.`,
      rows: [["Exam", E.name], ["Quantity", String(q)], ["Amount", naira(total, 2)]],
      extra: <View>{pins.map((p, i) => <TokenBox key={i} label={`PIN ${i + 1}`} sub={`Serial ${p.serial}`} value={p.pin.replace(/(\d{4})(?=\d)/g, "$1 ")} copyValue={p.pin} />)}</View>,
    });
  };

  return (
    <View>
      <Text variant="sm" weight="semibold" style={{ marginBottom: 8 }}>Exam</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {EXAMS.map((e) => {
          const on = e.id === exam;
          return (
            <Pressable key={e.id} onPress={() => { setExam(e.id); clearVerify(); if (e.needsId) setQty("1"); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ width: "31.5%", alignItems: "center", gap: 4, paddingVertical: 12, paddingHorizontal: 4, borderRadius: radius.lg, borderWidth: 1.5, borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primarySoft : c.surface }}>
              <BrandTile color={e.bg} text={e.abbr} size={38} />
              <Text size={12} weight={on ? "bold" : "semibold"} color={on ? c.primary : c.text} numberOfLines={1}>{e.short}</Text>
              <Text size={11} muted tabular>{naira(e.price)}</Text>
            </Pressable>
          );
        })}
      </View>

      {E.needsId ? (
        <>
          <TextField
            containerStyle={{ marginTop: 14 }}
            label="JAMB profile code"
            placeholder="10-digit profile code"
            keyboardType="number-pad"
            maxLength={10}
            value={code}
            onChangeText={(t) => { setCode(digitsOnly(t)); setCodeErr(null); clearVerify(); }}
            error={codeErr}
            success={!!cand}
            suffix={
              <Pressable onPress={() => verify()} disabled={verifying} hitSlop={6} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: c.primarySoft }}>
                {verifying ? <ActivityIndicator size="small" color={c.primary} /> : <Text size={12} weight="bold" color={c.primary}>{cand ? "Verified" : "Verify"}</Text>}
              </Pressable>
            }
          />
          {cand ? <VerifiedBox title={cand} lines={[`${E.name} candidate`]} /> : null}
        </>
      ) : null}

      <Select
        containerStyle={{ marginTop: 14 }}
        label="Quantity"
        value={E.needsId ? "1" : qty}
        onChange={(v) => { if (!E.needsId) setQty(v); }}
        options={["1", "2", "3", "4", "5"].map((v) => ({ value: v, label: v, disabled: !!E.needsId && v !== "1" }))}
        hint={E.needsId ? "JAMB ePINs are issued one per candidate" : undefined}
      />
      <TextField
        containerStyle={{ marginTop: 14 }}
        label="Phone (PIN delivery)"
        keyboardType="phone-pad"
        maxLength={11}
        value={phone}
        onChangeText={(t) => { setPhone(digitsOnly(t)); setPhoneErr(null); }}
        error={phoneErr}
      />
      <Summary style={{ marginTop: 14 }} rows={[[E.name, `${naira(E.price)} × ${q}`]]} total={["Total", naira(total, 2)]} />
      <Button title={`Buy PIN${q > 1 ? "s" : ""}`} size="lg" full icon="bi-mortarboard" style={{ marginTop: 14 }} onPress={buy} />
    </View>
  );
}
