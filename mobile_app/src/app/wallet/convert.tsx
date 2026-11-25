import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { confirmPay, toast } from "@/components/overlay";
import { Badge, Button, Chip, FieldError, Flag, Header, Icon, Row, Screen, Segment, Summary, Text } from "@/components/ui";
import { BUY_RATE, SELL_RATE } from "@/features/wallet/constants";
import { walletReceipt } from "@/features/wallet/receipt";
import { naira, num, ref, usd } from "@/lib/format";
import { round2 } from "@/lib/random";
import { app, useApp } from "@/store";
import { font, radius, useTheme } from "@/theme";

export default function ConvertScreen() {
  return <AuthGate><Convert /></AuthGate>;
}

function Convert() {
  const { c } = useTheme();
  const wallet = useApp((s) => s.wallet);
  const [dir, setDir] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const a = Number(amount) || 0;
  const buy = dir === "buy";
  const out = buy ? Math.floor((a / BUY_RATE) * 100) / 100 : Math.round(a * SELL_RATE * 100) / 100;
  const presets = buy ? [15800, 79000, 158000] : [10, 50, 100];
  const setDirection = (d: "buy" | "sell") => { setDir(d); setAmount(""); setErr(null); };

  const submit = async () => {
    let e: string | null = null;
    if (!amount) e = "Enter an amount";
    else if (buy) { if (out < 1) e = `Minimum is $1 (${naira(BUY_RATE)})`; else if (a > wallet.balance) e = "Insufficient Naira balance"; }
    else { if (a < 1) e = "Minimum is $1"; else if (a > wallet.usd) e = "Insufficient USD balance"; }
    setErr(e);
    if (e) return;
    const rows: [string, string][] = [["You receive", buy ? usd(out) : naira(out, 2)], ["Rate", `$1 = ${naira(buy ? BUY_RATE : SELL_RATE)}`]];
    const ok = await confirmPay(buy ? { title: "Buy USD", amount: a, rows, cta: "Convert" } : { title: "Sell USD", amount: a, currency: "usd", skipBalanceCheck: true, rows, cta: "Convert" });
    if (!ok) return;
    const s = app();
    let tx;
    if (buy) {
      tx = s.debit(a, { type: "convert", title: "Converted NGN → USD", subtitle: `${usd(out)} at ${naira(BUY_RATE)}/$`, icon: "bi-arrow-left-right", tone: "violet", ref: ref("FX"), meta: { "You paid": naira(a, 2), "You received": usd(out), Rate: `$1 = ${naira(BUY_RATE)}` } });
      if (!tx) return toast("Insufficient Naira balance", "error");
      s.update("wallet", (w) => ({ ...w, usd: round2(w.usd + out) }));
    } else {
      if (s.wallet.usd < a) return toast("Insufficient USD balance", "error");
      s.update("wallet", (w) => ({ ...w, usd: round2(w.usd - a) }));
      tx = s.credit(out, { type: "convert", title: "Converted USD → NGN", subtitle: `${usd(a)} at ${naira(SELL_RATE)}/$`, icon: "bi-arrow-left-right", tone: "violet", ref: ref("FX"), meta: { "You paid": usd(a), "You received": naira(out, 2), Rate: `$1 = ${naira(SELL_RATE)}` } });
    }
    s.notify({ icon: "bi-arrow-left-right", tone: "violet", title: "Conversion successful", body: buy ? `${usd(out)} added to your USD wallet.` : `${naira(out)} added to your Naira wallet.` });
    router.back();
    setTimeout(() => walletReceipt("Conversion successful", buy ? `You bought **${usd(out)}**.` : `You sold **${usd(a)}**.`, [["You paid", buy ? naira(a, 2) : usd(a)], ["You received", buy ? usd(out) : naira(out, 2)], ["New USD balance", usd(app().wallet.usd)]], tx), 300);
  };

  const box = (label: string, cur: "NGN" | "USD", right: React.ReactNode, children: React.ReactNode) => (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: c.border }}>
      <Row justify="space-between">
        <Text variant="xs" muted weight="semibold">{label}</Text>
        {right}
      </Row>
      <Row gap={10} style={{ marginTop: 10 }}>
        <Row gap={6} style={{ backgroundColor: c.surface2, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Flag code={cur === "NGN" ? "ng" : "us"} size={20} />
          <Text weight="bold">{cur}</Text>
        </Row>
        <View style={{ flex: 1 }}>{children}</View>
      </Row>
    </View>
  );

  return (
    <Screen header={<Header title="Convert currency" subtitle="Instant · no fees" />} footer={<Button title="Convert" size="lg" full icon="bi-arrow-left-right" onPress={submit} />}>
      <Segment value={dir} onChange={setDirection} options={[{ value: "buy", label: "NGN → USD" }, { value: "sell", label: "USD → NGN" }]} style={{ marginTop: 8, marginBottom: 16 }} />
      {box("You pay", buy ? "NGN" : "USD", <Text variant="xs" muted>Balance: {buy ? naira(wallet.balance, 2) : usd(wallet.usd)}</Text>,
        <TextInput
          value={amount} onChangeText={(t) => { setAmount(t.replace(/[^\d.]/g, "")); setErr(null); }} keyboardType="numeric" placeholder="0.00" placeholderTextColor={c.muted}
          style={{ fontFamily: font.extrabold, fontSize: 26, color: c.text, textAlign: "right" }}
        />
      )}
      <View style={{ alignItems: "center", marginVertical: -12, zIndex: 2 }}>
        <Pressable accessibilityLabel="Swap direction" onPress={() => setDirection(buy ? "sell" : "buy")} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: c.bg }}>
          <Icon name="ion:swap-vertical" size={20} color="#fff" />
        </Pressable>
      </View>
      {box("You receive", buy ? "USD" : "NGN", <Badge label="Instant" tone="success" />,
        <Text style={{ fontSize: 26, lineHeight: 32, textAlign: "right" }} weight="extrabold" tabular>{buy ? num(out, 2) : num(out, 2)}</Text>
      )}
      <FieldError error={err} />
      <Row gap={8} wrap style={{ marginTop: 14 }}>
        {presets.map((v) => <Chip key={v} label={buy ? naira(v) : usd(v).replace(".00", "")} active={a === v} onPress={() => { setAmount(String(v)); setErr(null); }} />)}
        <Chip label="Max" icon="bi-lightning" onPress={() => { setAmount(String(buy ? Math.floor(wallet.balance) : wallet.usd)); setErr(null); }} />
      </Row>
      <Summary style={{ marginTop: 16 }} rows={[["Rate", `$1 = ${naira(buy ? BUY_RATE : SELL_RATE)}`], ["Fee", "Free", { color: c.success }]]} />
    </Screen>
  );
}
