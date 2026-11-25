import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { toast } from "@/components/overlay";
import { Button, Checkbox, CodeInput, Icon, Row, Text, TextField, type CodeInputHandle } from "@/components/ui";
import { AuthShell, maskEmail, StrengthMeter, useCountdown } from "@/features/auth/components";
import { sleep } from "@/lib/random";
import { isEmail, passwordStrength } from "@/lib/validators";
import { app } from "@/store";
import { useTheme } from "@/theme";

export default function ForgotPassword() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState(params.email || "");
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const codeRef = useRef<CodeInputHandle>(null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwErr, setPwErr] = useState<{ pw?: string; confirm?: string }>({});
  const [signOutAll, setSignOutAll] = useState(true);
  const [busy, setBusy] = useState(false);
  const cd = useCountdown(60);
  const masked = maskEmail(email.trim().toLowerCase());

  const sendCode = async () => {
    if (!email.trim()) return setEmailErr("Enter your email address");
    if (!isEmail(email)) return setEmailErr("Enter a valid email address");
    setEmailErr(null);
    setBusy(true);
    await sleep(1000);
    setBusy(false);
    toast(`Reset code sent to ${masked}`, "success");
    cd.restart();
    setStep(2);
  };

  const verify = async (v = code) => {
    if (v.length < 6) { setCodeErr("Enter the 6-digit code"); codeRef.current?.shake(); return; }
    setBusy(true);
    await sleep(900);
    setBusy(false);
    if (v === "000000") { setCodeErr("That code is incorrect or expired."); codeRef.current?.shake(); setCode(""); return; }
    setCodeErr(null);
    cd.stop();
    setStep(3);
  };

  const update = async () => {
    const e: typeof pwErr = {};
    if (!pw) e.pw = "Create a new password";
    else if (pw.length < 8 || passwordStrength(pw).score < 3) e.pw = "Use at least 8 characters with a mix of uppercase, numbers or symbols";
    if (!confirm) e.confirm = "Confirm your new password";
    else if (confirm !== pw) e.confirm = "Passwords don't match";
    setPwErr(e);
    if (e.pw || e.confirm) return;
    setBusy(true);
    await sleep(1100);
    setBusy(false);
    const s = app();
    if (signOutAll) {
      s.logout();
      s.update("sessions", (list) => list.filter((x) => x.current));
    }
    s.notify({ icon: "bi-shield-check", tone: "success", title: "Password changed", body: "Your AutoBiz password was reset. If this wasn't you, contact support immediately." });
    setStep(4);
  };

  const back = () => {
    if (step === 2) { cd.stop(); setStep(1); }
    else if (step === 3) setStep(2);
    else router.canGoBack() ? router.back() : router.replace("/login");
  };

  if (step === 4)
    return (
      <AuthShell onBack={false}>
        <View style={{ alignItems: "center", paddingTop: 24 }}>
          <LinearGradient colors={[c.primary300, c.primary700]} style={{ width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" }}>
            <Icon name="bi-shield-check" size={48} color="#fff" />
          </LinearGradient>
          <Text variant="h1" center style={{ marginTop: 18 }}>Password reset!</Text>
          <Text muted center style={{ marginTop: 8 }}>Your password has been updated successfully. For your security, we've emailed you a confirmation.</Text>
        </View>
        <Button title="Continue to log in" size="lg" full style={{ marginTop: 28 }} onPress={() => router.replace({ pathname: "/login", params: { reset: "1" } })} />
      </AuthShell>
    );

  if (step === 3)
    return (
      <AuthShell onBack={back} step={3} steps={3} title="Set a new password" subtitle="Choose a strong password you haven't used before on AutoBiz.">
        <View style={{ gap: 14 }}>
          <View>
            <TextField label="New password" placeholder="New password" password autoComplete="new-password" value={pw} onChangeText={(t) => { setPw(t); setPwErr((x) => ({ ...x, pw: undefined })); }} error={pwErr.pw} />
            <StrengthMeter password={pw} />
          </View>
          <TextField label="Confirm new password" placeholder="Repeat password" password value={confirm} onChangeText={(t) => { setConfirm(t); setPwErr((x) => ({ ...x, confirm: undefined })); }} error={pwErr.confirm} />
          <Checkbox checked={signOutAll} onChange={setSignOutAll} label="Sign out of all other devices" />
          <Button title="Update password" size="lg" full loading={busy} loadingText="Updating password…" onPress={update} />
        </View>
      </AuthShell>
    );

  if (step === 2)
    return (
      <AuthShell onBack={back} step={2} steps={3} title="Check your inbox" subtitle={<Text muted style={{ marginTop: 6 }}>Enter the 6-digit code we sent to <Text weight="bold">{masked}</Text>. It expires in 10 minutes.</Text>}>
        <Pressable onPress={back} style={{ marginBottom: 16 }}><Text variant="sm" weight="bold" color={c.primary}>← Change email</Text></Pressable>
        <CodeInput ref={codeRef} length={6} value={code} onChange={(v) => { setCode(v); setCodeErr(null); }} onComplete={verify} error={!!codeErr} />
        {codeErr ? <Text variant="sm" color={c.danger} center style={{ marginTop: 10 }}>{codeErr}</Text> : <Text variant="xs" muted center style={{ marginTop: 10 }}>Demo: enter any 6 digits</Text>}
        <Button title="Verify code" size="lg" full loading={busy} loadingText="Verifying…" onPress={() => verify()} style={{ marginTop: 22 }} />
        <Row justify="center" gap={4} style={{ marginTop: 16 }}>
          <Text variant="sm" muted>Didn't get it?</Text>
          <Pressable disabled={cd.left > 0} onPress={() => { setCode(""); cd.restart(); toast("A new code has been sent", "success"); }}>
            <Text variant="sm" weight="bold" color={cd.left > 0 ? c.muted : c.primary}>{cd.left > 0 ? cd.label : "Resend code"}</Text>
          </Pressable>
        </Row>
      </AuthShell>
    );

  return (
    <AuthShell onBack={back} step={1} steps={3} title="Forgot your password?" subtitle="No worries. Enter the email linked to your account and we'll send you a 6-digit reset code.">
      <View style={{ gap: 16 }}>
        <TextField label="Email address" placeholder="you@example.com" icon="bi-envelope" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={(t) => { setEmail(t); setEmailErr(null); }} error={emailErr} returnKeyType="send" onSubmitEditing={sendCode} />
        <Button title="Send reset code" size="lg" full loading={busy} loadingText="Sending code…" onPress={sendCode} />
        <Pressable onPress={back} style={{ alignSelf: "center" }}><Text variant="sm" weight="bold" color={c.primary}>← Back to log in</Text></Pressable>
      </View>
      <Row justify="center" gap={4} style={{ marginTop: 28 }}>
        <Text variant="xs" muted>Need help?</Text>
        <Pressable onPress={() => router.push("/settings/help")}><Text variant="xs" weight="bold" color={c.primary}>Contact support</Text></Pressable>
      </Row>
    </AuthShell>
  );
}
