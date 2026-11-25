import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { confirmPay, toast } from "@/components/overlay";
import { Avatar, Button, Chip, Header, Icon, Notice, Row, Screen, Summary, Text, TextField, type TextInputRef } from "@/components/ui";
import { KNOWN_USERS, checkLimit, nameFor } from "@/features/wallet/constants";
import { walletReceipt } from "@/features/wallet/receipt";
import { naira, phraseInitials, ref, titleCase } from "@/lib/format";
import { app, useApp } from "@/store";
import { useTheme } from "@/theme";

export default function TransferScreen() {
  return <AuthGate><Transfer /></AuthGate>;
}

type Recipient = { name: string; handle: string };

function Transfer() {
  const { c } = useTheme();
  const balance = useApp((s) => s.wallet.balance);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [rcp, setRcp] = useState<Recipient | null>(null);
  const [toErr, setToErr] = useState<string | null>(null);
  const [amtErr, setAmtErr] = useState<string | null>(null);
  const reqId = useRef(0);
  const amtRef = useRef<TextInputRef>(null);

  useEffect(() => {
    setRcp(null); setToErr(null);
    const v = to.trim().replace(/^@/, "").toLowerCase();
    const isPhone = /^0\d{10}$/.test(v);
    const isUser = /^[a-z0-9_.]{3,20}$/.test(v);
    if (!v || (!isPhone && !isUser)) { setBusy(false); return; }
    const id = ++reqId.current;
    const t = setTimeout(() => {
      setBusy(true);
      setTimeout(() => {
        if (id !== reqId.current) return;
        setBusy(false);
        const u = app().user;
        if (v === (u.username || "").toLowerCase() || v === u.phone) { setToErr("You can't send money to yourself"); return; }
        if (v.startsWith("x") || v.startsWith("000")) { setToErr("No AutoBiz user found with that username/phone"); return; }
        const handle = isPhone ? v : "@" + v;
        const name = KNOWN_USERS[v] || titleCase(nameFor(v));
        setRcp({ name, handle });
      }, 700);
    }, 350);
    return () => clearTimeout(t);
  }, [to]);

  const a = Number(amount) || 0;
  const submit = async () => {
    let te: string | null = null;
    if (!to.trim()) te = "Enter a username or phone number";
    else if (toErr) te = toErr;
    let ae: string | null = null;
    if (!amount) ae = "Enter an amount";
    else if (a < 50) ae = "Minimum is ₦50";
    else if (a > balance) ae = "Insufficient balance";
    else ae = checkLimit(a);
    setToErr(te); setAmtErr(ae);
    if (te || ae) return;
    if (!rcp) return toast("Please wait — confirming recipient", "warning");
    const rows: [string, string][] = [["To", rcp.name], ["Username/phone", rcp.handle], ["Fee", "Free"]];
    if (note.trim()) rows.push(["Note", note.trim()]);
    const ok = await confirmPay({ title: "Confirm transfer", amount: a, cta: "Send money", rows });
    if (!ok) return;
    const s = app();
    const tx = s.debit(a, {
      type: "transfer", title: `Transfer to ${rcp.name}`, subtitle: `AutoBiz · ${rcp.handle}`, icon: "bi-send", tone: "primary", ref: ref("TR"),
      meta: { Recipient: rcp.name, "Username/phone": rcp.handle, Amount: naira(a, 2), Fee: "₦0", Note: note.trim() || "—" },
    });
    if (!tx) return toast("Insufficient balance", "error");
    s.notify({ icon: "bi-send", tone: "primary", title: "Transfer sent", body: `${naira(a)} sent to ${rcp.name}.` });
    router.back();
    setTimeout(() => walletReceipt("Money sent", `${naira(a)} sent to **${rcp.name}** instantly.`, [["Recipient", rcp.name], ["Username/phone", rcp.handle], ["Amount", naira(a, 2)]], tx), 300);
  };

  return (
    <Screen
      header={<Header title="Send to AutoBiz user" subtitle={`Balance ${naira(balance, 2)}`} />}
      footer={<Button title={a ? `Send ${naira(a)}` : "Send money"} size="lg" full icon="bi-send" onPress={submit} />}
    >
      <Notice icon="bi-lightning-charge" style={{ marginTop: 8 }}>Instant and free transfers to any AutoBiz wallet.</Notice>
      <Text variant="label" muted style={{ marginTop: 18, marginBottom: 10 }}>Frequent</Text>
      <Row gap={14} style={{ marginBottom: 18 }}>
        {Object.entries(KNOWN_USERS).slice(0, 4).map(([u, n]) => (
          <Pressable key={u} onPress={() => { setTo(u); setTimeout(() => amtRef.current?.focus(), 300); }} style={{ alignItems: "center", gap: 6, width: 64 }}>
            <Avatar text={phraseInitials(n)} size={50} />
            <Text variant="xs" weight="semibold" numberOfLines={1}>@{u}</Text>
          </Pressable>
        ))}
      </Row>
      <View style={{ gap: 16 }}>
        <View>
          <TextField
            label="Username or phone number" prefix="@" placeholder="username or 080…" autoCapitalize="none" autoCorrect={false}
            value={to} onChangeText={setTo} error={toErr} success={!!rcp}
            suffix={busy ? <ActivityIndicator size="small" color={c.primary} /> : rcp ? <Icon name="bi-check-circle-fill" size={18} color={c.success} /> : null}
          />
          {rcp ? (
            <Row gap={10} style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: c.successSoft }}>
              <Avatar text={phraseInitials(rcp.name)} size={36} bg={c.success} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text weight="bold">{rcp.name}</Text>
                <Text variant="xs" muted>{rcp.handle}</Text>
              </View>
              <Icon name="bi-patch-check-fill" size={18} color={c.success} />
            </Row>
          ) : null}
        </View>
        <TextField ref={amtRef} label="Amount" prefix="₦" big keyboardType="numeric" placeholder="0.00" value={amount} onChangeText={(t) => { setAmount(t.replace(/[^\d.]/g, "")); setAmtErr(null); }} error={amtErr} />
        <Row gap={8} wrap>
          {[1000, 5000, 10000, 20000].map((v) => <Chip key={v} label={naira(v)} active={a === v} onPress={() => setAmount(String(v))} />)}
        </Row>
        <TextField label="Note" placeholder="What's it for? (optional)" maxLength={60} value={note} onChangeText={setNote} />
        <Summary rows={[["Fee", "Free", { color: c.success }]]} total={["You send", naira(a, 2)]} />
      </View>
    </Screen>
  );
}
