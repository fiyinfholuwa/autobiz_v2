import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { confirmPay, toast } from "@/components/overlay";
import { BrandTile, Button, Checkbox, Chip, ChipRow, Header, Icon, Row, Screen, Select, Summary, Text, TextField } from "@/components/ui";
import { BANKS, bankAbbr, bankColor, checkLimit, nameFor, withdrawFee } from "@/features/wallet/constants";
import { walletReceipt } from "@/features/wallet/receipt";
import { naira, ref } from "@/lib/format";
import { app, useApp } from "@/store";
import { useTheme } from "@/theme";

export default function WithdrawScreen() {
  return <AuthGate><Withdraw /></AuthGate>;
}

function Withdraw() {
  const params = useLocalSearchParams<{ bank?: string; number?: string }>();
  const { c } = useTheme();
  const saved = useApp((s) => s.bankAccounts);
  const balance = useApp((s) => s.wallet.balance);
  const [bank, setBank] = useState(params.bank || "");
  const [acct, setAcct] = useState(params.number || "");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [save, setSave] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [errs, setErrs] = useState<{ bank?: string; acct?: string; amount?: string }>({});
  const reqId = useRef(0);

  useEffect(() => {
    setName(null);
    setErrs((e) => ({ ...e, acct: undefined }));
    if (!bank || !/^\d{10}$/.test(acct)) { setResolving(false); return; }
    const id = ++reqId.current;
    setResolving(true);
    const t = setTimeout(() => {
      if (id !== reqId.current) return;
      setResolving(false);
      if (acct.startsWith("000")) { setErrs((e) => ({ ...e, acct: `Account not found at ${bank}` })); return; }
      const s = app().bankAccounts.find((b) => b.bank === bank && b.number === acct);
      setName(s ? s.name : nameFor(bank + acct));
    }, 900);
    return () => clearTimeout(t);
  }, [bank, acct]);

  const a = Number(amount) || 0;
  const fee = a > 0 ? withdrawFee(a) : 0;
  const total = a + fee;

  const submit = async () => {
    const e: typeof errs = {};
    if (!bank) e.bank = "Select a bank";
    if (!/^\d{10}$/.test(acct)) e.acct = "Enter a valid 10-digit account number";
    else if (errs.acct) e.acct = errs.acct;
    if (!amount) e.amount = "Enter an amount";
    else if (a < 100) e.amount = "Minimum withdrawal is ₦100";
    else if (total > balance) e.amount = "Insufficient balance (incl. fee)";
    else { const l = checkLimit(total); if (l) e.amount = l; }
    setErrs(e);
    if (Object.keys(e).length) return;
    if (!name) return toast("Please wait — verifying account name", "warning");
    const ok = await confirmPay({
      title: "Confirm withdrawal", amount: total, cta: "Withdraw",
      rows: [["Bank", bank], ["Account", acct], ["Name", name], ["Amount", naira(a, 2)], ["Fee", naira(fee)]],
    });
    if (!ok) return;
    const s = app();
    const tx = s.debit(total, {
      type: "withdrawal", title: `Withdrawal to ${bank}`, subtitle: `${acct} · ${name}`, icon: "bi-bank", tone: "orange", ref: ref("WD"),
      meta: { Bank: bank, "Account number": acct, "Account name": name, Amount: naira(a, 2), Fee: naira(fee), Narration: narration.trim() || "—", "Session ID": "1000" + Date.now() },
    });
    if (!tx) return toast("Insufficient balance", "error");
    if (save && !s.bankAccounts.some((b) => b.bank === bank && b.number === acct))
      s.update("bankAccounts", (l) => [...l, { id: "BA" + Date.now(), bank, number: acct, name }]);
    s.notify({ icon: "bi-bank", tone: "orange", title: "Withdrawal successful", body: `${naira(a)} sent to ${name} (${bank}).` });
    router.back();
    setTimeout(() => walletReceipt("Withdrawal successful", `${naira(a)} is on its way to **${name}**.`, [["Bank", bank], ["Account", acct], ["Amount", naira(a, 2)], ["Fee", naira(fee)]], tx), 300);
  };

  const bankOptions = useMemo(() => BANKS.map((b) => ({ value: b.name, label: b.name, left: <BrandTile color={b.color} text={bankAbbr(b.name)} size={32} /> })), []);

  return (
    <Screen
      header={<Header title="Withdraw to bank" subtitle={`Balance ${naira(balance, 2)}`} />}
      footer={<Button title={total ? `Withdraw ${naira(total)}` : "Withdraw"} size="lg" full icon="bi-bank" onPress={submit} />}
    >
      {saved.length ? (
        <>
          <Text variant="label" muted style={{ marginTop: 8, marginBottom: 8 }}>Saved accounts</Text>
          <ChipRow contentStyle={{ paddingHorizontal: 0 }} style={{ marginBottom: 16 }}>
            {saved.map((b) => (
              <Chip key={b.id} label={`${b.bank} ··${b.number.slice(-4)}`} active={bank === b.bank && acct === b.number} icon="bi-bank" onPress={() => { setBank(b.bank); setAcct(b.number); }} />
            ))}
          </ChipRow>
        </>
      ) : <View style={{ height: 8 }} />}
      <View style={{ gap: 16 }}>
        <Select label="Bank" title="Select bank" placeholder="Select bank" searchable value={bank} options={bankOptions} onChange={(v) => { setBank(v); setErrs((e) => ({ ...e, bank: undefined })); }} error={errs.bank} />
        <View>
          <TextField
            label="Account number" placeholder="10-digit NUBAN" keyboardType="number-pad" maxLength={10} value={acct}
            onChangeText={(t) => setAcct(t.replace(/\D/g, ""))} error={errs.acct} success={!!name}
            suffix={resolving ? <ActivityIndicator size="small" color={c.primary} /> : name ? <Icon name="bi-check-circle-fill" size={18} color={c.success} /> : null}
          />
          {resolving ? <Text variant="xs" muted style={{ marginTop: 5 }}>Verifying account…</Text> : null}
          {name ? (
            <Row gap={6} style={{ marginTop: 6 }}>
              <Icon name="bi-patch-check-fill" size={15} color={c.success} />
              <Text variant="sm" weight="bold" color={c.success}>{name}</Text>
            </Row>
          ) : null}
        </View>
        <View>
          <TextField label="Amount" prefix="₦" big keyboardType="numeric" placeholder="0.00" value={amount} onChangeText={(t) => { setAmount(t.replace(/[^\d.]/g, "")); setErrs((e) => ({ ...e, amount: undefined })); }} error={errs.amount} />
          <Row gap={8} wrap style={{ marginTop: 10 }}>
            {[5000, 10000, 50000, 100000].map((v) => <Chip key={v} label={naira(v)} active={a === v} onPress={() => setAmount(String(v))} />)}
          </Row>
        </View>
        <TextField label="Narration" placeholder="Narration (optional)" maxLength={60} value={narration} onChangeText={setNarration} />
        <Checkbox checked={save} onChange={setSave} label="Save this account" />
        <Summary rows={[["Amount", naira(a, 2)], ["Transfer fee", naira(fee)]]} total={["Total debit", naira(total, 2)]} />
        <Row gap={6}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: bankColor(bank) }} />
          <Text variant="xs" muted>₦25 fee up to ₦50,000 · ₦50 above. Arrives instantly.</Text>
        </Row>
      </View>
    </Screen>
  );
}
