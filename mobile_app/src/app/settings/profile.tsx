import React, { useState } from "react";
import { View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { toast } from "@/components/overlay";
import { Avatar, Badge, Button, Card, Header, Row, Screen, Text, TextField } from "@/components/ui";
import { initials } from "@/lib/format";
import { sleep } from "@/lib/random";
import { isEmail } from "@/lib/validators";
import { app, useApp } from "@/store";

type F = { firstName: string; lastName: string; email: string; phone: string; username: string };

export default function Profile() {
  const user = useApp((s) => s.user);
  const load = (): F => ({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, username: user.username || "" });
  const [f, setF] = useState<F>(load);
  const [e, setE] = useState<Partial<F>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof F, v: string) => { setF((x) => ({ ...x, [k]: v })); setE((x) => ({ ...x, [k]: undefined })); };
  const dirty = JSON.stringify(f) !== JSON.stringify(load());

  const save = async () => {
    const er: Partial<F> = {};
    const username = f.username.replace(/^@/, "").toLowerCase().trim();
    if (f.firstName.trim().length < 2) er.firstName = "Enter your first name";
    if (f.lastName.trim().length < 2) er.lastName = "Enter your last name";
    if (!isEmail(f.email)) er.email = "Enter a valid email address";
    if (!/^0[789][01]\d{8}$/.test(f.phone)) er.phone = "Enter a valid 11-digit phone number";
    if (!/^[a-z0-9_.]{3,20}$/.test(username)) er.username = "3–20 letters, numbers, _ or .";
    setE(er);
    if (Object.values(er).some(Boolean)) return;
    setBusy(true);
    await sleep(700);
    app().update("user", (u) => ({ ...u, firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim(), phone: f.phone, username }));
    setF((x) => ({ ...x, username }));
    setBusy(false);
    toast("Profile updated", "success");
  };

  return (
    <AuthGate>
      <Screen
        header={<Header title="Profile" subtitle="Your personal details" />}
        footer={
          <Row gap={10}>
            <Button title="Cancel" variant="outline" style={{ flex: 1 }} disabled={!dirty || busy} onPress={() => { setF(load()); setE({}); }} />
            <Button title="Save changes" style={{ flex: 2 }} loading={busy} loadingText="Saving…" onPress={save} />
          </Row>
        }
      >
        <Card style={{ alignItems: "center" }}>
          <Avatar text={initials(user.firstName, user.lastName)} size={76} />
          <Text variant="h2" style={{ marginTop: 10 }}>{user.firstName} {user.lastName}</Text>
          <Text variant="sm" muted>@{user.username || "user"} · {user.email}</Text>
          <Badge label={user.tier} style={{ marginTop: 8, alignSelf: "center" }} />
        </Card>
        <Card style={{ marginTop: 16, gap: 14 }}>
          <Row gap={10} align="flex-start">
            <TextField containerStyle={{ flex: 1 }} label="First name" maxLength={40} value={f.firstName} onChangeText={(t) => set("firstName", t)} error={e.firstName} />
            <TextField containerStyle={{ flex: 1 }} label="Last name" maxLength={40} value={f.lastName} onChangeText={(t) => set("lastName", t)} error={e.lastName} />
          </Row>
          <TextField label="Email" icon="bi-envelope" keyboardType="email-address" autoCapitalize="none" value={f.email} onChangeText={(t) => set("email", t)} error={e.email} />
          <TextField label="Phone" icon="bi-phone" keyboardType="number-pad" maxLength={11} value={f.phone} onChangeText={(t) => set("phone", t.replace(/\D/g, ""))} error={e.phone} />
          <View>
            <TextField label="Username" prefix="@" autoCapitalize="none" autoCorrect={false} maxLength={20} value={f.username} onChangeText={(t) => set("username", t.replace(/^@/, ""))} error={e.username} hint="Friends can send you money with your username" />
          </View>
        </Card>
      </Screen>
    </AuthGate>
  );
}
