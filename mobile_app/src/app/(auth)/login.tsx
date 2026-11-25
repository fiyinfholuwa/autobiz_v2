import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { toast } from "@/components/overlay";
import { Button, Checkbox, Notice, Row, Text, TextField, type TextInputRef } from "@/components/ui";
import { AuthShell, goNext, OrDivider, SecureNote, SocialButtons } from "@/features/auth/components";
import { sleep } from "@/lib/random";
import { isEmail, isPhone } from "@/lib/validators";
import { app, useApp } from "@/store";
import { useTheme } from "@/theme";

export default function Login() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ next?: string; reset?: string }>();
  const remembered = useApp((s) => s.auth.remember);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(remembered);
  const [errs, setErrs] = useState<{ id?: string; pw?: string }>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const pwRef = useRef<TextInputRef>(null);

  useEffect(() => {
    if (params.reset === "1") toast("Password updated. Log in with your new password.", "success");
  }, [params.reset]);

  const validate = () => {
    const e: typeof errs = {};
    const v = id.trim();
    if (!v) e.id = "Enter your email or phone number";
    else if (!isEmail(v) && !isPhone(v)) e.id = /^\+?\d/.test(v) ? "Enter a valid Nigerian phone number, e.g. 08031234567" : "Enter a valid email address";
    if (!pw) e.pw = "Enter your password";
    else if (pw.length < 6) e.pw = "Password must be at least 6 characters";
    setErrs(e);
    return !e.id && !e.pw;
  };

  const submit = async () => {
    setAlert(null);
    if (!validate()) return;
    setBusy(true);
    await sleep(1200);
    if (pw.toLowerCase() === "wrongpass") {
      setBusy(false);
      setAlert("Incorrect email/phone or password. Please try again.");
      pwRef.current?.focus();
      return;
    }
    app().login(remember);
    setBusy(false);
    setDone(true);
    await sleep(450);
    goNext(params.next);
  };

  return (
    <AuthShell
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
      title="Log in to your account"
      subtitle="Welcome back! Enter your details to continue."
      footer={
        <View>
          <Row justify="center" gap={4}>
            <Text variant="sm" muted>Don't have an account?</Text>
            <Pressable onPress={() => router.replace({ pathname: "/register", params: params.next ? { next: params.next } : {} })}>
              <Text variant="sm" weight="bold" color={c.primary}>Sign up free</Text>
            </Pressable>
          </Row>
          <SecureNote />
        </View>
      }
    >
      <SocialButtons next={params.next} />
      <OrDivider label="or continue with email / phone" />
      {alert ? <Notice tone="danger" icon="bi-exclamation-circle" style={{ marginBottom: 14 }}>{alert}</Notice> : null}
      <View style={{ gap: 14 }}>
        <TextField
          label="Email or phone number"
          placeholder="you@example.com or 0803…"
          icon="bi-person"
          autoCapitalize="none"
          autoComplete="username"
          keyboardType="email-address"
          value={id}
          onChangeText={(t) => { setId(t); if (errs.id) setErrs((e) => ({ ...e, id: undefined })); }}
          error={errs.id}
          returnKeyType="next"
          onSubmitEditing={() => pwRef.current?.focus()}
        />
        <TextField
          ref={pwRef}
          label="Password"
          labelRight={<Pressable onPress={() => router.push({ pathname: "/forgot-password", params: isEmail(id) ? { email: id.trim() } : {} })} hitSlop={8}><Text variant="sm" weight="bold" color={c.primary}>Forgot password?</Text></Pressable>}
          placeholder="Your password"
          icon="bi-lock"
          password
          autoComplete="password"
          value={pw}
          onChangeText={(t) => { setPw(t); if (errs.pw) setErrs((e) => ({ ...e, pw: undefined })); }}
          error={errs.pw}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Checkbox checked={remember} onChange={setRemember} label="Keep me signed in for 30 days" />
        <Button title={done ? "Welcome back!" : "Log in"} icon={done ? "bi-check-lg" : undefined} size="lg" full loading={busy} loadingText="Signing you in…" onPress={submit} />
      </View>
      <Notice tone="primary" icon="bi-info-circle" style={{ marginTop: 18 }}>
        <Text variant="sm" color={c.primary}>
          <Text variant="sm" weight="bold" color={c.primary}>Demo mode: </Text>use any valid email or Nigerian phone number with a password of 6+ characters.
        </Text>
        <Pressable onPress={() => { setId(app().user.email); setPw("demo1234"); setErrs({}); }} style={{ marginTop: 6 }} hitSlop={6}>
          <Text variant="sm" weight="bold" color={c.primary}>Fill demo details →</Text>
        </Pressable>
      </Notice>
    </AuthShell>
  );
}
