import React, { useState } from "react";
import { Switch, View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { copy, toast } from "@/components/overlay";
import { Button, Card, Header, IconTile, ListRow, Notice, Row, Screen, Sheet, StatusPill, Text, TextField } from "@/components/ui";
import { StrengthMeter } from "@/features/auth/components";
import { Group } from "@/features/settings/shared";
import { ago, date } from "@/lib/format";
import { sleep } from "@/lib/random";
import { isSequentialOrRepeated } from "@/lib/validators";
import { app, useApp } from "@/store";
import { useTheme } from "@/theme";

export default function Security() {
  return (
    <AuthGate>
      <Screen header={<Header title="Security" subtitle="Keep your account and money safe" />}>
        <PasswordCard />
        <PinCard />
        <TwoFACard />
        <Sessions />
      </Screen>
    </AuthGate>
  );
}

function PasswordCard() {
  const [f, setF] = useState({ cur: "", next: "", confirm: "" });
  const [e, setE] = useState<{ cur?: string; next?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setE((x) => ({ ...x, [k]: undefined })); };
  const submit = async () => {
    const er: typeof e = {};
    if (f.cur.length < 6) er.cur = "Enter your current password";
    if (!(f.next.length >= 8 && /\d/.test(f.next) && /[A-Z]/.test(f.next))) er.next = "Use at least 8 characters with a number and an uppercase letter";
    if (f.confirm !== f.next || !f.confirm) er.confirm = "Passwords don't match";
    setE(er);
    if (Object.values(er).some(Boolean)) return;
    if (f.next === f.cur) { setE({ next: "New password must be different from current" }); toast("New password must be different from current", "warning"); return; }
    setBusy(true);
    await sleep(900);
    setBusy(false);
    setF({ cur: "", next: "", confirm: "" });
    app().notify({ icon: "bi-key", tone: "success", title: "Password changed", body: "Your password was updated. If this wasn't you, contact support." });
    toast("Password updated successfully", "success");
  };
  return (
    <View style={{ marginTop: 6 }}>
      <SectionTitle icon="bi-key" tone="primary" title="Change password" sub="Use 8+ characters with upper case, numbers & symbols" />
      <Card style={{ gap: 12 }}>
        <TextField label="Current password" password value={f.cur} onChangeText={(t) => set("cur", t)} error={e.cur} />
        <View>
          <TextField label="New password" password value={f.next} onChangeText={(t) => set("next", t)} error={e.next} />
          <StrengthMeter password={f.next} />
        </View>
        <TextField label="Confirm new password" password value={f.confirm} onChangeText={(t) => set("confirm", t)} error={e.confirm} />
        <Button title="Update password" loading={busy} loadingText="Updating…" onPress={submit} />
      </Card>
    </View>
  );
}

function PinCard() {
  const settings = useApp((s) => s.settings);
  const [f, setF] = useState({ cur: "", next: "", confirm: "" });
  const [e, setE] = useState<{ cur?: string; next?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v.replace(/\D/g, "").slice(0, 4) })); setE((x) => ({ ...x, [k]: undefined })); };
  const submit = async () => {
    const er: typeof e = {};
    const curOk = /^\d{4}$/.test(f.cur) && f.cur !== "0000" && (!settings.pin || settings.pin === f.cur);
    if (!curOk) er.cur = settings.pin && /^\d{4}$/.test(f.cur) ? "Incorrect current PIN" : "Enter your current 4-digit PIN";
    if (!/^\d{4}$/.test(f.next)) er.next = "PIN must be 4 digits";
    else if (isSequentialOrRepeated(f.next)) er.next = "Avoid repeated or sequential digits";
    else if (f.next === f.cur) er.next = "New PIN must differ from current PIN";
    if (f.confirm !== f.next || !f.confirm) er.confirm = "PINs don't match";
    setE(er);
    if (Object.values(er).some(Boolean)) return;
    setBusy(true);
    await sleep(900);
    setBusy(false);
    app().update("settings", (s) => ({ ...s, pinSet: true, pin: f.next, pinChangedAt: Date.now() }));
    setF({ cur: "", next: "", confirm: "" });
    app().notify({ icon: "bi-grid-3x3-gap", tone: "primary", title: "Transaction PIN changed", body: "Use your new PIN for your next payment." });
    toast("Transaction PIN changed", "success");
  };
  const pinProps = { keyboardType: "number-pad" as const, secureTextEntry: true, maxLength: 4, placeholder: "••••" };
  return (
    <View style={{ marginTop: 22 }}>
      <SectionTitle icon="bi-grid-3x3-gap" tone="violet" title="Transaction PIN" sub={settings.pinChangedAt ? `Last changed ${date(settings.pinChangedAt)}` : "Approves every payment and withdrawal"} />
      <Card style={{ gap: 12 }}>
        <TextField label="Current PIN" {...pinProps} value={f.cur} onChangeText={(t) => set("cur", t)} error={e.cur} hint={!settings.pin ? "Demo: any 4 digits except 0000" : undefined} />
        <Row gap={10} align="flex-start">
          <TextField containerStyle={{ flex: 1 }} label="New PIN" {...pinProps} value={f.next} onChangeText={(t) => set("next", t)} error={e.next} />
          <TextField containerStyle={{ flex: 1 }} label="Confirm PIN" {...pinProps} value={f.confirm} onChangeText={(t) => set("confirm", t)} error={e.confirm} />
        </Row>
        <Button title="Change PIN" variant="soft" loading={busy} loadingText="Updating…" onPress={submit} />
      </Card>
    </View>
  );
}

const B32 = "ABCDEFGHJKLMNPQRSTUVWXYZ234567";
function TwoFACard() {
  const { c } = useTheme();
  const on = useApp((s) => s.settings.twoFA);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = (v: boolean) => {
    if (!v) { app().update("settings", (s) => ({ ...s, twoFA: false })); toast("Two-factor authentication turned off", "warning"); return; }
    setKey(Array.from({ length: 16 }, () => B32[Math.floor(Math.random() * B32.length)]).join(""));
    setOtp(""); setErr(null); setOpen(true);
  };
  const verify = async () => {
    if (!/^\d{6}$/.test(otp)) return setErr("Enter the 6-digit code from your app");
    setBusy(true);
    await sleep(900);
    setBusy(false);
    app().update("settings", (s) => ({ ...s, twoFA: true }));
    app().notify({ icon: "bi-shield-lock", tone: "success", title: "2FA enabled", body: "Your account is now protected with two-factor authentication." });
    setOpen(false);
    toast("Two-factor authentication enabled", "success");
  };
  return (
    <View style={{ marginTop: 22 }}>
      <Card>
        <Row gap={12}>
          <IconTile icon="bi-shield-check" tone="success" size={44} />
          <View style={{ flex: 1 }}>
            <Text weight="bold">Two-factor authentication</Text>
            <Text variant="xs" muted>{on ? "On · Authenticator app" : "Off · Add an extra layer of security"}</Text>
          </View>
          <Switch value={on} onValueChange={toggle} trackColor={{ true: c.primary, false: c.border }} thumbColor="#fff" ios_backgroundColor={c.border} />
        </Row>
      </Card>
      <Sheet visible={open} onClose={() => setOpen(false)} locked={busy} title="Enable two-factor authentication" scroll footer={<Button title="Verify & enable" size="lg" full loading={busy} loadingText="Verifying…" onPress={verify} />}>
        {[
          ["1", "Open Google Authenticator or Authy."],
          ["2", "Add an account using this setup key."],
          ["3", "Enter the 6-digit code it shows."],
        ].map(([n, t]) => (
          <Row key={n} gap={10} style={{ marginBottom: 10 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}><Text variant="xs" weight="bold" color={c.primary}>{n}</Text></View>
            <Text variant="sm" style={{ flex: 1 }}>{t}</Text>
          </Row>
        ))}
        <Row justify="space-between" style={{ backgroundColor: c.surface2, borderRadius: 14, padding: 14, marginVertical: 8 }}>
          <View>
            <Text variant="label" muted>Setup key</Text>
            <Text variant="h3" tabular selectable>{key.replace(/(.{4})(?=.)/g, "$1 ")}</Text>
          </View>
          <Button title="Copy" icon="bi-copy" size="sm" variant="soft" onPress={() => copy(key, "Setup key copied")} />
        </Row>
        <TextField label="6-digit code" keyboardType="number-pad" maxLength={6} placeholder="000000" value={otp} onChangeText={(t) => { setOtp(t.replace(/\D/g, "")); setErr(null); }} error={err} />
      </Sheet>
    </View>
  );
}

function Sessions() {
  const sessions = useApp((s) => s.sessions);
  const [busy, setBusy] = useState<string | null>(null);
  const others = sessions.filter((s) => !s.current);
  const signOut = async (id: string) => {
    setBusy(id);
    await sleep(600);
    app().update("sessions", (l) => l.filter((x) => x.id !== id));
    setBusy(null);
    toast("Device signed out", "success");
  };
  const signOutAll = async () => {
    setBusy("all");
    await sleep(800);
    app().update("sessions", (l) => l.filter((x) => x.current));
    setBusy(null);
    toast("Signed out of all other devices", "success");
  };
  return (
    <Group title="Active sessions" subtitle="Devices signed in to your account">
      {sessions.map((s) => (
        <ListRow
          key={s.id}
          icon={s.icon}
          tone={s.current ? "success" : "neutral"}
          title={s.device}
          subtitle={`${s.loc} · ${s.ip} · ${s.current ? "Active now" : ago(s.last)}`}
          right={s.current ? <StatusPill status="success" label="This device" /> : <Button title="Sign out" size="sm" variant="dangerSoft" loading={busy === s.id} loadingText="…" onPress={() => signOut(s.id)} />}
        />
      ))}
      {others.length ? (
        <View style={{ paddingVertical: 12 }}>
          <Button title="Sign out all other devices" variant="outline" icon="bi-box-arrow-right" loading={busy === "all"} loadingText="Signing out…" onPress={signOutAll} />
        </View>
      ) : (
        <View style={{ paddingVertical: 12 }}><Notice tone="success" icon="bi-shield-check">Only this device is signed in.</Notice></View>
      )}
    </Group>
  );
}

function SectionTitle({ icon, tone, title, sub }: { icon: string; tone: string; title: string; sub: string }) {
  return (
    <Row gap={10} style={{ marginBottom: 10 }}>
      <IconTile icon={icon} tone={tone} size={34} />
      <View style={{ flex: 1 }}>
        <Text variant="h3">{title}</Text>
        <Text variant="xs" muted>{sub}</Text>
      </View>
    </Row>
  );
}

