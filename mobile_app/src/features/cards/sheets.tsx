import Slider from "./RangeSlider";
import React, { useEffect, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { confirmPay, success, toast } from "@/components/overlay";
import { Button, Checkbox, Chip, Keypad, PinDots, Row, Select, Sheet, Summary, Text, TextField } from "@/components/ui";
import { naira, usd } from "@/lib/format";
import { sleep } from "@/lib/random";
import { app, useApp, type VirtualCard } from "@/store";
import { useTheme } from "@/theme";
import { addCardTx, fundCost, getCard, last4, MAX_BAL, MERCHANTS, monthSpent, patchCardTx, r2, RATE, SELL_RATE, updateCard } from "./constants";

type Base = { visible: boolean; onClose: () => void };
const amt = (s: string) => Number(s.replace(/[^\d.]/g, "")) || 0;
const cleanAmt = (t: string) => t.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
const tag = (c: VirtualCard) => `•••• ${last4(c.number)}`;

/* ---------------- Reveal PIN ---------------- */
export function RevealPinSheet({ visible, onClose, onSuccess }: Base & { onSuccess: () => void }) {
  const pinSetting = useApp((s) => s.settings.pin);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (visible) { setPin(""); setBusy(false); setErr(false); } }, [visible]);
  const submit = async (p: string) => {
    const ok = pinSetting ? p === pinSetting : p !== "0000";
    if (!ok) {
      setErr(true);
      Animated.sequence([10, -10, 7, -7, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 55, useNativeDriver: true }))).start();
      toast("Incorrect PIN. Try again.", "error");
      setTimeout(() => { setPin(""); setErr(false); }, 450);
      return;
    }
    setBusy(true);
    await sleep(600);
    onClose();
    onSuccess();
  };
  return (
    <Sheet visible={visible} onClose={onClose} locked={busy} title="Reveal card details" subtitle="Enter your transaction PIN to view the full card number, expiry date and CVV.">
      <Animated.View style={{ transform: [{ translateX: shake }], marginVertical: 10 }}>
        <PinDots value={pin} error={err} />
      </Animated.View>
      <Text variant="xs" muted center>{busy ? "Verifying…" : pinSetting ? "Use your transaction PIN" : "Demo: any PIN works except 0000"}</Text>
      <View style={{ marginTop: 12, opacity: busy ? 0.4 : 1 }}>
        <Keypad
          disabled={busy}
          onKey={(d) => {
            if (pin.length >= 4) return;
            const v = pin + d;
            setPin(v);
            if (v.length === 4) setTimeout(() => submit(v), 120);
          }}
          onDelete={() => setPin((x) => x.slice(0, -1))}
        />
      </View>
    </Sheet>
  );
}

/* ---------------- Fund ---------------- */
export function FundSheet({ visible, onClose, card }: Base & { card: VirtualCard }) {
  const balance = useApp((s) => s.wallet.balance);
  const { c } = useTheme();
  const [v, setV] = useState("");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (visible) { setV(""); setErr(null); } }, [visible]);
  const a = amt(v);
  const { fee, naira: ngn } = fundCost(a);
  const go = async () => {
    if (a < 1) return setErr("Enter at least $1.00.");
    if (card.balance + a > MAX_BAL) return setErr("Card balance can't exceed $10,000.00.");
    if (!app().canAfford(ngn)) return setErr(`Insufficient wallet balance (needs ${naira(ngn, 2)}).`);
    onClose();
    await sleep(320);
    const ok = await confirmPay({ title: "Fund virtual card", amount: ngn, cta: "Fund card", rows: [["Card", `${card.label} · ${tag(card)}`], ["Amount", usd(a)], ["Fee", usd(fee)], ["Rate", "₦1,580/$"]] });
    if (!ok) return;
    const s = app();
    const tx = s.debit(ngn, { type: "card", title: "Card Funding", subtitle: `${card.label} ${tag(card)} · ${usd(a)}`, icon: "bi-credit-card-2-front", tone: "success" });
    if (!tx) return toast("Insufficient wallet balance", "error");
    updateCard(card.id, (x) => ({ ...x, balance: r2(x.balance + a) }));
    addCardTx(card.id, { kind: "topup", direction: "in", title: "Card top-up", note: "From NGN wallet", amount: a, status: "success" });
    s.notify({ icon: "bi-credit-card-2-front", tone: "success", title: "Card funded", body: `${usd(a)} added to ${card.label} (${tag(card)}).` });
    success({ title: "Card funded", message: `${usd(a)} has been added to your card.`, rows: [["New card balance", usd(getCard(card.id)?.balance ?? 0)], ["Charged", naira(ngn, 2)], ["Reference", tx.id]] });
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={`Fund card ${tag(card)}`} scroll footer={<Button title="Continue" size="lg" full onPress={go} />}>
      <TextField label="Amount (USD)" prefix="$" big keyboardType="decimal-pad" placeholder="0.00" value={v} onChangeText={(t) => { setV(cleanAmt(t)); setErr(null); }} error={err} />
      <Row gap={8} wrap style={{ marginTop: 10 }}>
        {[5, 10, 20, 50, 100].map((p) => <Chip key={p} label={"$" + p} active={a === p} onPress={() => { setV(String(p)); setErr(null); }} />)}
      </Row>
      <Summary style={{ marginTop: 14 }} rows={[["Funding fee (1%)", usd(fee)], ["Rate", "$1 = ₦1,580"]]} total={["You pay", naira(ngn, 2)]} />
      <Text variant="xs" muted style={{ marginTop: 10 }}>Card balance after: <Text variant="xs" weight="bold" color={c.text}>{usd(card.balance + a)}</Text> · Wallet: {naira(balance, 2)}</Text>
    </Sheet>
  );
}

/* ---------------- Withdraw ---------------- */
export function WithdrawSheet({ visible, onClose, card }: Base & { card: VirtualCard }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (visible) { setV(""); setErr(null); } }, [visible]);
  const a = amt(v);
  const ngn = r2(a * SELL_RATE);
  const go = async () => {
    if (a < 1) return setErr("Minimum withdrawal is $1.00.");
    if (a > card.balance) return setErr("Amount exceeds card balance.");
    onClose();
    await sleep(320);
    const ok = await confirmPay({ title: "Withdraw from card", amount: ngn, amountLabel: "You'll receive", skipBalanceCheck: true, cta: "Withdraw", rows: [["From", `${card.label} · ${tag(card)}`], ["Amount", usd(a)], ["Rate", "₦1,540/$"]] });
    if (!ok) return;
    const fresh = getCard(card.id);
    if (!fresh || a > fresh.balance) return toast("Card balance changed. Try again.", "error");
    updateCard(card.id, (x) => ({ ...x, balance: r2(x.balance - a) }));
    addCardTx(card.id, { kind: "withdraw", direction: "out", title: "Withdrawal", note: "To NGN wallet", amount: a, status: "success" });
    const s = app();
    const tx = s.credit(ngn, { type: "card", title: "Card Withdrawal", subtitle: `${card.label} ${tag(card)} · ${usd(a)}`, icon: "bi-credit-card-2-front", tone: "success" });
    s.notify({ icon: "bi-arrow-down-left", tone: "success", title: "Card withdrawal", body: `${naira(ngn)} credited to your wallet.` });
    success({ title: "Withdrawal successful", message: `${naira(ngn, 2)} has been credited to your Naira wallet.`, rows: [["Card balance", usd(getCard(card.id)?.balance ?? 0)], ["Wallet balance", naira(app().wallet.balance, 2)], ["Reference", tx.id]] });
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Withdraw to Naira wallet" scroll footer={<Button title="Continue" size="lg" full onPress={go} />}>
      <Text variant="sm" muted style={{ marginBottom: 10 }}>Available on card <Text variant="sm" weight="bold">{usd(card.balance)}</Text></Text>
      <TextField
        label="Amount (USD)" prefix="$" big keyboardType="decimal-pad" placeholder="0.00" value={v}
        onChangeText={(t) => { setV(cleanAmt(t)); setErr(null); }} error={err}
        suffix={<Button title="Max" size="sm" variant="soft" onPress={() => { setV(String(card.balance)); setErr(null); }} />}
      />
      <Summary style={{ marginTop: 14 }} rows={[["Withdrawal rate", "$1 = ₦1,540"]]} total={["You'll receive", naira(ngn, 2)]} />
    </Sheet>
  );
}

/* ---------------- Limit ---------------- */
export function LimitSheet({ visible, onClose, card }: Base & { card: VirtualCard }) {
  const [lim, setLim] = useState(card.limit);
  useEffect(() => { if (visible) setLim(card.limit); }, [visible, card.limit]);
  const spent = monthSpent(card);
  return (
    <Sheet visible={visible} onClose={onClose} title="Monthly spending limit" subtitle="Payments that would take this month's spend above the limit will be declined." footer={
      <Button title="Save limit" size="lg" full onPress={() => { updateCard(card.id, (x) => ({ ...x, limit: lim })); onClose(); toast(`Monthly limit set to **${usd(lim)}**`, "success"); }} />
    }>
      <View style={{ alignItems: "center", marginVertical: 10 }}>
        <Text variant="display" tabular>{usd(lim)}</Text>
        <Text variant="sm" muted>per month · spent so far {usd(spent)}</Text>
      </View>
      <Slider min={50} max={5000} step={50} value={lim} onChange={setLim} />
      <Row justify="space-between" style={{ marginTop: 4 }}>
        <Text variant="xs" muted>$50</Text>
        <Text variant="xs" muted>$5,000</Text>
      </Row>
      <Row gap={8} wrap style={{ marginTop: 14 }}>
        {[100, 250, 500, 1000, 2500].map((p) => <Chip key={p} label={usd(p).replace(".00", "")} active={lim === p} onPress={() => setLim(p)} />)}
      </Row>
    </Sheet>
  );
}

/* ---------------- Rename ---------------- */
export function RenameSheet({ visible, onClose, card }: Base & { card: VirtualCard }) {
  const [v, setV] = useState(card.label);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (visible) { setV(card.label); setErr(null); } }, [visible, card.label]);
  const save = () => {
    const t = v.trim();
    if (t.length < 2) return setErr("Enter 2–20 characters.");
    updateCard(card.id, (x) => ({ ...x, label: t }));
    onClose();
    toast("Card renamed", "success");
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Rename card" footer={<Button title="Save" size="lg" full onPress={save} />}>
      <TextField label="Nickname" value={v} maxLength={20} onChangeText={(t) => { setV(t); setErr(null); }} error={err} returnKeyType="done" onSubmitEditing={save} autoFocus />
      <Row gap={8} wrap style={{ marginTop: 12 }}>
        {["Subscriptions", "Shopping", "Ads", "Travel", "Business"].map((p) => <Chip key={p} label={p} active={v === p} onPress={() => { setV(p); setErr(null); }} />)}
      </Row>
    </Sheet>
  );
}

/* ---------------- Terminate ---------------- */
export function TerminateSheet({ visible, onClose, card, onTerminated }: Base & { card: VirtualCard; onTerminated: () => void }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { if (visible) setOk(false); }, [visible]);
  const ngn = r2(card.balance * SELL_RATE);
  const go = async () => {
    onClose();
    await sleep(320);
    const confirmed = await confirmPay({ title: "Confirm termination", amount: ngn, amountLabel: "Refund to wallet", skipBalanceCheck: true, cta: "Terminate card", rows: [["Card", `${card.label} · ${tag(card)}`], ["Balance", usd(card.balance)]] });
    if (!confirmed) return;
    const s = app();
    s.update("cards", (cards) => cards.filter((x) => x.id !== card.id));
    let txId: string | null = null;
    if (ngn > 0) txId = s.credit(ngn, { type: "card", title: "Card Terminated · Refund", subtitle: `${card.label} ${tag(card)} · ${usd(card.balance)}`, icon: "bi-credit-card-2-front", tone: "success" }).id;
    s.notify({ icon: "bi-trash", tone: "danger", title: "Card terminated", body: `${card.label} (${tag(card)}) was closed.` });
    onTerminated();
    success({ title: "Card terminated", message: ngn > 0 ? `${naira(ngn, 2)} has been returned to your wallet.` : "Your card has been closed.", rows: txId ? [["Refund", naira(ngn, 2)], ["Reference", txId]] : [] });
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Terminate this card?" subtitle={`${card.label} (${tag(card)}) will be permanently closed. Subscriptions using it will fail.`} footer={
      <Row gap={10}>
        <Button title="Keep card" variant="outline" style={{ flex: 1 }} onPress={onClose} />
        <Button title="Terminate" variant="danger" style={{ flex: 1 }} disabled={!ok} onPress={go} />
      </Row>
    }>
      <Summary rows={[["Card balance", usd(card.balance)], ["Returned to wallet", naira(ngn, 2)]]} />
      <View style={{ marginTop: 12 }}>
        <Checkbox checked={ok} onChange={setOk} label="I understand this action cannot be undone" />
      </View>
    </Sheet>
  );
}

/* ---------------- Simulate online payment ---------------- */
export function SimulateSheet({ visible, onClose, card, onSent }: Base & { card: VirtualCard; onSent: () => void }) {
  const keys = Object.keys(MERCHANTS);
  const [m, setM] = useState(keys[0]);
  const [v, setV] = useState("");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setM(keys[Math.floor(Math.random() * keys.length)]);
      setV((1 + Math.random() * 14).toFixed(2));
      setErr(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const send = () => {
    const a = r2(amt(v));
    if (a < 0.5) return setErr("Enter an amount of at least $0.50.");
    const M = MERCHANTS[m];
    const t = addCardTx(card.id, { kind: "purchase", direction: "out", merchant: m, title: M.name, note: "Authorizing…", amount: a, status: "pending" });
    onClose();
    onSent();
    setTimeout(() => {
      const fresh = getCard(card.id);
      if (!fresh) return;
      const spent = monthSpent(fresh);
      const reason = fresh.status === "frozen" ? "card frozen" : a > fresh.balance ? "insufficient funds" : spent + a > fresh.limit ? "monthly limit exceeded" : null;
      const s = app();
      if (reason) {
        patchCardTx(card.id, t.id, { status: "declined", note: `Declined · ${reason}` });
        toast(`**${M.short}** ${usd(a)} declined — ${reason}`, "error");
        s.notify({ icon: "bi-x-octagon", tone: "danger", title: "Card payment declined", body: `${M.short} ${usd(a)} · ${reason}` });
      } else {
        updateCard(card.id, (x) => ({ ...x, balance: r2(x.balance - a) }));
        patchCardTx(card.id, t.id, { status: "success", note: `${M.cat} · online` });
        toast(`**${M.short}** charged ${usd(a)}`, "success");
        s.notify({ icon: "bi-credit-card-2-front", tone: "primary", title: "Card payment", body: `${M.short} charged ${usd(a)} on ${tag(card)}` });
      }
    }, 1600);
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Simulate online payment" subtitle={`Pretend a merchant charges card ${tag(card)} (balance ${usd(card.balance)}).`} scroll footer={<Button title="Send charge" icon="bi-send" size="lg" full onPress={send} />}>
      <Select label="Merchant" value={m} onChange={setM} searchable options={keys.map((k) => ({ value: k, label: MERCHANTS[k].name, sub: MERCHANTS[k].cat, icon: MERCHANTS[k].icon }))} />
      <TextField containerStyle={{ marginTop: 12 }} label="Amount (USD)" prefix="$" keyboardType="decimal-pad" value={v} onChangeText={(t) => { setV(cleanAmt(t)); setErr(null); }} error={err} />
      <Text variant="xs" muted style={{ marginTop: 10 }}>Declines if the card is frozen, the balance is too low or the monthly limit is exceeded.</Text>
    </Sheet>
  );
}

export { RATE };
