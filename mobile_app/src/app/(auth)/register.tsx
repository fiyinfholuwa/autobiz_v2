import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { toast } from "@/components/overlay";
import { Button, Checkbox, CodeInput, Icon, Notice, Row, StatusPill, Summary, Text, TextField, type CodeInputHandle } from "@/components/ui";
import { AuthShell, goNext, maskEmail, OrDivider, SecureNote, SocialButtons, StrengthMeter, useCountdown } from "@/features/auth/components";
import { sleep } from "@/lib/random";
import { isEmail, isPhone, normPhone, passwordStrength, WEAK_PINS } from "@/lib/validators";
import { app } from "@/store";
import { useTheme } from "@/theme";

type Form = { firstName: string; lastName: string; email: string; phone: string; password: string; confirm: string; referral: string; terms: boolean };
type Errs = Partial<Record<keyof Form, string>>;
const NAME_RE = /^[A-Za-zÀ-ÿ' -]{2,30}$/;
const cap = (s: string) => s.trim().replace(/\s+/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());

export default function Register() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ next?: string; plan?: string; ref?: string }>();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [f, setF] = useState<Form>({ firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "", referral: (params.ref || "").toUpperCase(), terms: false });
  const [showRef, setShowRef] = useState(!!params.ref);
  const [errs, setErrs] = useState<Errs>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Form, v: any) => { setF((x) => ({ ...x, [k]: v })); if (errs[k]) setErrs((e) => ({ ...e, [k]: undefined })); };

  // step 2
  const [otp, setOtp] = useState("");
  const [otpErr, setOtpErr] = useState<string | null>(null);
  const otpRef = useRef<CodeInputHandle>(null);
  const cd = useCountdown(60);
  // step 3
  const [pin, setPin] = useState("");
  const [pin1, setPin1] = useState<string | null>(null);
  const [pinErr, setPinErr] = useState<string | null>(null);
  const pinRef = useRef<CodeInputHandle>(null);

  const normalized = () => {
    let phone = normPhone(f.phone).replace(/^\+?234/, "0");
    return { firstName: cap(f.firstName), lastName: cap(f.lastName), email: f.email.trim().toLowerCase(), phone, referral: f.referral.trim().toUpperCase() };
  };

  const submit1 = async () => {
    const e: Errs = {};
    if (!f.firstName.trim()) e.firstName = "Enter your first name"; else if (!NAME_RE.test(f.firstName.trim())) e.firstName = "Use letters only (2–30)";
    if (!f.lastName.trim()) e.lastName = "Enter your last name"; else if (!NAME_RE.test(f.lastName.trim())) e.lastName = "Use letters only (2–30)";
    if (!f.email.trim()) e.email = "Enter your email address"; else if (!isEmail(f.email)) e.email = "Enter a valid email address";
    if (!isPhone(f.phone)) e.phone = "Enter a valid Nigerian number, e.g. 0803 123 4567";
    if (!f.password) e.password = "Create a password";
    else if (f.password.length < 8 || passwordStrength(f.password).score < 3) e.password = "Use at least 8 characters with a mix of uppercase, numbers or symbols";
    if (!f.confirm) e.confirm = "Confirm your password"; else if (f.confirm !== f.password) e.confirm = "Passwords don't match";
    if (f.referral.trim() && !/^[A-Za-z0-9]{4,12}$/.test(f.referral.trim())) { e.referral = "Referral codes are 4–12 letters or numbers"; setShowRef(true); }
    if (!f.terms) e.terms = "Please accept the terms to continue";
    setErrs(e);
    if (Object.values(e).some(Boolean)) return;
    setBusy(true);
    await sleep(1100);
    setBusy(false);
    setStep(2);
    cd.restart();
    toast(`Verification code sent to ${maskEmail(normalized().email)}`, "success");
  };

  const verifyOtp = async (code = otp) => {
    if (code.length < 6) { setOtpErr("Enter the 6-digit code"); otpRef.current?.shake(); return; }
    setBusy(true);
    await sleep(900);
    setBusy(false);
    if (code === "000000") { setOtpErr("That code is incorrect or expired. Try again."); otpRef.current?.shake(); setOtp(""); return; }
    setOtpErr(null);
    cd.stop();
    setStep(3);
  };

  const submitPin = async (code = pin) => {
    if (code.length < 4) { setPinErr("Enter 4 digits"); pinRef.current?.shake(); return; }
    if (pin1 === null) {
      if (WEAK_PINS.includes(code)) { setPinErr("That PIN is too easy to guess. Choose another."); pinRef.current?.shake(); setPin(""); return; }
      setPinErr(null); setPin1(code); setPin("");
      return;
    }
    if (code !== pin1) {
      setPinErr("PINs didn't match. Let's try again."); pinRef.current?.shake();
      setTimeout(() => { setPin(""); setPin1(null); }, 400);
      return;
    }
    setBusy(true);
    await sleep(1100);
    finish(code);
    setBusy(false);
  };

  const finish = (pinCode: string) => {
    const n = normalized();
    const s = app();
    const username = (n.firstName + n.lastName).toLowerCase().replace(/[^a-z]/g, "").slice(0, 14);
    s.update("user", (u) => ({ ...u, firstName: n.firstName, lastName: n.lastName, email: n.email, phone: n.phone, username, tier: "Tier 1", referral: n.referral || undefined, joined: Date.now(), bvnVerified: false, ninVerified: false }));
    s.update("settings", (st) => ({ ...st, pinSet: true, pin: pinCode, pinChangedAt: Date.now() }));
    s.notify({ icon: "bi-stars", tone: "primary", title: `Welcome to AutoBiz, ${n.firstName}!`, body: "Fund your wallet to start shopping, travelling and paying bills." });
    if (n.referral) s.notify({ icon: "bi-gift", tone: "pink", title: "Referral applied", body: `Code ${n.referral} — you'll both earn ₦500 after your first transaction.` });
    s.login(true);
    setStep(4);
  };

  const back = () => {
    if (step === 2) { cd.stop(); setStep(1); }
    else if (step === 3) { setPin1(null); setPin(""); setStep(2); }
    else if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  if (step === 4) return <SuccessPane first={normalized().firstName} n={normalized()} next={params.next} />;

  const maskedPhone = (() => { const p = normalized().phone; return p.length >= 8 ? `${p.slice(0, 4)} ••• ${p.slice(-4)}` : p; })();

  if (step === 2)
    return (
      <AuthShell onBack={back} step={2} steps={3} title="Verify your email" subtitle={<Text muted style={{ marginTop: 6 }}>We sent a 6-digit code to <Text weight="bold">{maskEmail(normalized().email)}</Text> and by SMS to <Text weight="bold">{maskedPhone}</Text>.</Text>}>
        <CodeInput ref={otpRef} length={6} value={otp} onChange={(v) => { setOtp(v); setOtpErr(null); }} onComplete={verifyOtp} error={!!otpErr} />
        {otpErr ? <Text variant="sm" color={c.danger} center style={{ marginTop: 10 }}>{otpErr}</Text> : <Text variant="xs" muted center style={{ marginTop: 10 }}>Demo: enter any 6 digits</Text>}
        <Button title="Verify email" size="lg" full loading={busy} loadingText="Verifying…" onPress={() => verifyOtp()} style={{ marginTop: 22 }} />
        <Row justify="center" gap={4} style={{ marginTop: 16 }}>
          <Text variant="sm" muted>Didn't get it?</Text>
          <Pressable disabled={cd.left > 0} onPress={() => { setOtp(""); setOtpErr(null); cd.restart(); toast("A new code has been sent", "success"); }}>
            <Text variant="sm" weight="bold" color={cd.left > 0 ? c.muted : c.primary}>{cd.left > 0 ? cd.label : "Resend code"}</Text>
          </Pressable>
        </Row>
      </AuthShell>
    );

  if (step === 3)
    return (
      <AuthShell onBack={back} step={3} steps={3} title={pin1 === null ? "Create your transaction PIN" : "Confirm your PIN"} subtitle={pin1 === null ? "You'll use this 4-digit PIN to approve payments, purchases and withdrawals." : "Re-enter the 4-digit PIN you just created."}>
        <CodeInput key={pin1 === null ? "a" : "b"} ref={pinRef} length={4} secret value={pin} onChange={(v) => { setPin(v); setPinErr(null); }} onComplete={(v) => setTimeout(() => submitPin(v), 120)} error={!!pinErr} />
        {pinErr ? <Text variant="sm" color={c.danger} center style={{ marginTop: 12 }}>{pinErr}</Text> : null}
        <Button title={pin1 === null ? "Continue" : "Create PIN"} size="lg" full loading={busy} loadingText="Setting up your wallet…" onPress={() => submitPin()} style={{ marginTop: 24 }} />
        <Notice tone="warning" icon="bi-shield-lock" style={{ marginTop: 18 }}>Avoid easy PINs like 1234, 0000 or your birth year. Never share your PIN — AutoBiz staff will never ask for it.</Notice>
      </AuthShell>
    );

  return (
    <AuthShell
      onBack={back}
      step={1}
      steps={3}
      title="Create your account"
      subtitle="It's free and takes less than 3 minutes."
      footer={
        <View>
          <Row justify="center" gap={4}>
            <Text variant="sm" muted>Already have an account?</Text>
            <Pressable onPress={() => router.replace({ pathname: "/login", params: params.next ? { next: params.next } : {} })}>
              <Text variant="sm" weight="bold" color={c.primary}>Log in</Text>
            </Pressable>
          </Row>
          <SecureNote />
        </View>
      }
    >
      {params.plan === "reseller" ? <Notice tone="violet" icon="bi-stars" style={{ marginBottom: 14 }}>You're signing up for the Reseller plan — upgrade after verification.</Notice> : null}
      <SocialButtons next={params.next} />
      <OrDivider label="or sign up with email" />
      <View style={{ gap: 14 }}>
        <Row gap={10} align="flex-start">
          <TextField containerStyle={{ flex: 1 }} label="First name" placeholder="Adaeze" autoComplete="given-name" value={f.firstName} onChangeText={(t) => set("firstName", t)} error={errs.firstName} />
          <TextField containerStyle={{ flex: 1 }} label="Last name" placeholder="Okafor" autoComplete="family-name" value={f.lastName} onChangeText={(t) => set("lastName", t)} error={errs.lastName} />
        </Row>
        <TextField label="Email address" placeholder="you@example.com" icon="bi-envelope" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={f.email} onChangeText={(t) => set("email", t)} error={errs.email} />
        <TextField label="Phone number" placeholder="0803 123 4567" prefix={<Text weight="semibold" muted>🇳🇬 +234</Text>} keyboardType="phone-pad" maxLength={14} value={f.phone} onChangeText={(t) => set("phone", t.replace(/[^\d+ ]/g, ""))} error={errs.phone} />
        <View>
          <TextField label="Password" placeholder="Create a password" password autoComplete="new-password" value={f.password} onChangeText={(t) => set("password", t)} error={errs.password} />
          <StrengthMeter password={f.password} />
        </View>
        <TextField label="Confirm password" placeholder="Repeat password" password value={f.confirm} onChangeText={(t) => set("confirm", t)} error={errs.confirm} />
        {showRef ? (
          <TextField label="Referral code" placeholder="e.g. ADAEZE24 (optional)" autoCapitalize="characters" maxLength={12} value={f.referral} onChangeText={(t) => set("referral", t.toUpperCase())} error={errs.referral} />
        ) : (
          <Pressable onPress={() => setShowRef(true)}><Text variant="sm" weight="bold" color={c.primary}>+ Have a referral code?</Text></Pressable>
        )}
        <Checkbox checked={f.terms} onChange={(v) => set("terms", v)} error={errs.terms}>
          <Text variant="sm">I agree to AutoBiz's <Text variant="sm" weight="bold" color={c.primary}>Terms of Service</Text> and <Text variant="sm" weight="bold" color={c.primary}>Privacy Policy</Text>.</Text>
        </Checkbox>
        <Button title="Create account" size="lg" full loading={busy} loadingText="Creating account…" onPress={submit1} />
      </View>
    </AuthShell>
  );
}

function SuccessPane({ first, n, next }: { first: string; n: { firstName: string; lastName: string; email: string; phone: string }; next?: string }) {
  const { c } = useTheme();
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start(); }, [scale]);
  const nextLabel = next ? (next.includes("cart") || next.includes("checkout") ? "Continue to checkout" : "Continue") : "Go to dashboard";
  return (
    <AuthShell onBack={false}>
      <View style={{ alignItems: "center", paddingTop: 20 }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <LinearGradient colors={[c.primary300, c.primary700]} style={{ width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center" }}>
            <Icon name="bi-check-lg" size={56} color="#fff" />
          </LinearGradient>
        </Animated.View>
        <Row gap={8} style={{ marginTop: 18 }}>
          {["#2348ff", "#7048e8", "#e64980", "#12b886", "#f59f00", "#1098ad"].map((col, i) => <View key={col} style={{ width: 8, height: 8, borderRadius: i % 2 ? 2 : 4, backgroundColor: col, transform: [{ rotate: `${i * 30}deg` }] }} />)}
        </Row>
        <Text variant="h1" center style={{ marginTop: 14 }}>You're all set, {first}! 🎉</Text>
        <Text muted center style={{ marginTop: 8 }}>Your AutoBiz account is ready. Fund your wallet to start shopping, travelling and paying bills.</Text>
      </View>
      <Summary style={{ marginTop: 22 }} rows={[["Name", `${n.firstName} ${n.lastName}`], ["Email", n.email], ["Phone", n.phone], ["Account tier", <StatusPill key="t" status="info" label="Tier 1" />]]} />
      <View style={{ gap: 10, marginTop: 22 }}>
        <Button title={nextLabel} size="lg" full iconRight="bi-arrow-right" onPress={() => goNext(next)} />
        <Button title="Verify BVN to unlock USD cards" variant="soft" size="lg" full icon="bi-patch-check" onPress={() => { goNext(); setTimeout(() => router.push({ pathname: "/settings/verification", params: { upgrade: "1" } }), 300); }} />
      </View>
    </AuthShell>
  );
}
