import React, { useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { confirmPay } from "@/components/overlay";
import { BrandTile, Button, Chip, Notice, Row, Summary, Text, TextField } from "@/components/ui";
import { naira } from "@/lib/format";
import { MOCK_NAMES, pickBy, sleep } from "@/lib/random";
import { radius, useTheme } from "@/theme";
import { amountOnly, record, showReceipt, VerifiedBox } from "./shared";

export const PLATFORMS = [
  { id: "bet9ja", name: "Bet9ja", color: "#0f7a3a", abbr: "B9" },
  { id: "sportybet", name: "SportyBet", color: "#e41827", abbr: "SB" },
  { id: "1xbet", name: "1xBet", color: "#1a5c9e", abbr: "1x" },
  { id: "betking", name: "BetKing", color: "#1b1464", abbr: "BK" },
  { id: "nairabet", name: "NairaBet", color: "#00843d", abbr: "NB" },
  { id: "msport", name: "MSport", color: "#f0a30a", abbr: "MS" },
];

export function BettingPane() {
  const { c } = useTheme();
  const [plat, setPlat] = useState("bet9ja");
  const [cid, setCid] = useState("");
  const [cidErr, setCidErr] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountErr, setAmountErr] = useState<string | null>(null);
  const token = useRef(0);
  const P = PLATFORMS.find((p) => p.id === plat)!;
  const a = Number(amount) || 0;

  const clearVerify = () => { setName(null); token.current++; setVerifying(false); };
  const verify = async () => {
    if (cid.length < 5) { setCidErr("Enter a valid customer ID (min 5 characters)"); return null; }
    const my = ++token.current;
    setCidErr(null); setVerifying(true);
    await sleep(800);
    if (my !== token.current) return null;
    setVerifying(false);
    const n = pickBy(MOCK_NAMES, cid + plat);
    setName(n);
    return n;
  };

  const buy = async () => {
    let bad = false;
    if (!amount) { setAmountErr("Enter an amount"); bad = true; }
    else if (a < 100) { setAmountErr("Minimum is ₦100"); bad = true; }
    else if (a > 500000) { setAmountErr("Maximum is ₦500,000"); bad = true; }
    let n = name;
    if (!n) { n = await verify(); if (!n) return; }
    if (bad) return;
    const ok = await confirmPay({ title: "Fund betting wallet", amount: a, rows: [["Platform", P.name], ["Customer ID", cid], ["Name", n]] });
    if (!ok) return;
    const tx = record(a, { type: "betting", title: `${P.name} Funding`, subtitle: `ID ${cid}`, icon: "bi-trophy", tone: "success" }, { Platform: P.name, "Customer ID": cid, "Account name": n, Fee: "₦0" });
    if (!tx) return;
    showReceipt(tx, {
      title: "Wallet funded",
      message: `${naira(a)} sent to your ${P.name} account.`,
      rows: [["Platform", P.name], ["Customer ID", cid], ["Name", n], ["Amount", naira(a, 2)]],
    });
    setAmount("");
  };

  return (
    <View>
      <Text variant="sm" weight="semibold" style={{ marginBottom: 8 }}>Platform</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {PLATFORMS.map((p) => {
          const on = p.id === plat;
          return (
            <Pressable key={p.id} onPress={() => { setPlat(p.id); clearVerify(); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ width: "31.5%", alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1.5, borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primarySoft : c.surface }}>
              <BrandTile color={p.color} text={p.abbr} size={38} />
              <Text size={12} weight={on ? "bold" : "semibold"} color={on ? c.primary : c.text} numberOfLines={1}>{p.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextField
        containerStyle={{ marginTop: 14 }}
        label="Customer / User ID"
        placeholder="Your account ID on the platform"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={16}
        value={cid}
        onChangeText={(t) => { setCid(t.replace(/\W/g, "").slice(0, 16)); setCidErr(null); clearVerify(); }}
        error={cidErr}
        success={!!name}
        suffix={
          <Pressable onPress={() => verify()} disabled={verifying} hitSlop={6} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: c.primarySoft }}>
            {verifying ? <ActivityIndicator size="small" color={c.primary} /> : <Text size={12} weight="bold" color={c.primary}>{name ? "Verified" : "Verify"}</Text>}
          </Pressable>
        }
      />
      {name ? <VerifiedBox title={name} lines={[P.name]} /> : null}

      <TextField containerStyle={{ marginTop: 14 }} label="Amount" prefix="₦" big keyboardType="number-pad" placeholder="Min ₦100" value={amount} onChangeText={(t) => { setAmount(amountOnly(t)); setAmountErr(null); }} error={amountErr} />
      <Row gap={8} wrap style={{ marginTop: 10 }}>
        {[500, 1000, 2000, 5000, 10000].map((v) => <Chip key={v} label={naira(v)} active={a === v} onPress={() => { setAmount(String(v)); setAmountErr(null); }} />)}
      </Row>
      <Summary style={{ marginTop: 14 }} rows={[["Platform", P.name], ["Fee", "Free", { color: c.success }]]} total={["Total", naira(a, 2)]} />
      <Notice tone="warning" icon="bi-exclamation-triangle" style={{ marginTop: 12 }}>18+ only. Please bet responsibly.</Notice>
      <Button title="Fund betting wallet" size="lg" full icon="bi-trophy" style={{ marginTop: 14 }} onPress={buy} />
    </View>
  );
}
