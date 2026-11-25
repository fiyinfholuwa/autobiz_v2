import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { success, toast } from "@/components/overlay";
import { Button, Card, Checkbox, DateField, Header, Icon, Notice, ProgressBar, Row, Screen, Sheet, StatusPill, Text, TextField } from "@/components/ui";
import { isoDay } from "@/lib/format";
import { sleep } from "@/lib/random";
import { app, useApp, type User } from "@/store";
import { radius, useTheme } from "@/theme";

type TierId = User["tier"];
const TIERS: { id: TierId; title: string; reqs: string[]; limits: string[] }[] = [
  { id: "Tier 1", title: "Tier 1 · Basic", reqs: ["Phone number verified", "Email verified"], limits: ["₦50,000 daily", "₦300,000 max balance"] },
  { id: "Tier 2", title: "Tier 2 · Verified", reqs: ["BVN verification", "Date of birth"], limits: ["₦200,000 daily", "₦500,000 max balance", "USD virtual cards"] },
  { id: "Tier 3", title: "Tier 3 · Premium", reqs: ["NIN verification", "Proof of address"], limits: ["₦5,000,000 daily", "Unlimited balance", "Reseller pricing"] },
];

export default function Verification() {
  const { c } = useTheme();
  const tier = useApp((s) => s.user.tier);
  const params = useLocalSearchParams<{ upgrade?: string }>();
  const idx = TIERS.findIndex((t) => t.id === tier);
  const [upgrading, setUpgrading] = useState<TierId | null>(null);

  useEffect(() => {
    if (params.upgrade === "1" && idx < 2) {
      const t = setTimeout(() => setUpgrading(TIERS[idx + 1].id), 600);
      return () => clearTimeout(t);
    }
  }, [params.upgrade]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthGate>
      <Screen header={<Header title="Verification & limits" subtitle="Verify your identity to raise your limits" />}>
        <Card>
          <Row justify="space-between">
            <Text weight="bold">Account level</Text>
            <StatusPill status="info" label={`Current: ${tier}`} />
          </Row>
          <ProgressBar value={(idx + 1) / 3} style={{ marginTop: 12 }} height={10} />
          <Text variant="xs" muted style={{ marginTop: 6 }}>{Math.round(((idx + 1) / 3) * 100)}% verified{idx < 2 ? ` · Next: ${TIERS[idx + 1].id}` : " · Maximum tier reached"}</Text>
        </Card>
        {TIERS.map((t, i) => {
          const current = i === idx, done = i < idx, next = i === idx + 1;
          return (
            <Card key={t.id} style={{ marginTop: 14, borderWidth: current ? 1.5 : 0, borderColor: c.primary }}>
              <Row justify="space-between">
                <Text variant="h3">{t.title}</Text>
                {current ? <StatusPill status="info" label="Current" /> : done ? <StatusPill status="success" label="Done" /> : null}
              </Row>
              <View style={{ marginTop: 12, gap: 8 }}>
                {t.reqs.map((r) => (
                  <Row key={r} gap={8}>
                    <Icon name={i <= idx ? "bi-check-circle-fill" : "bi-check-circle"} size={17} color={i <= idx ? c.success : c.muted} />
                    <Text variant="sm">{r}</Text>
                  </Row>
                ))}
              </View>
              <Row gap={6} wrap style={{ marginTop: 12 }}>
                {t.limits.map((l) => (
                  <View key={l} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: c.surface2 }}>
                    <Text variant="xs" weight="semibold">{l}</Text>
                  </View>
                ))}
              </Row>
              {next ? <Button title={`Upgrade to ${t.id}`} icon="bi-patch-check" style={{ marginTop: 14 }} onPress={() => setUpgrading(t.id)} /> : null}
            </Card>
          );
        })}
        <UpgradeSheet tier={upgrading} onClose={() => setUpgrading(null)} />
      </Screen>
    </AuthGate>
  );
}

function UpgradeSheet({ tier, onClose }: { tier: TierId | null; onClose: () => void }) {
  const { c } = useTheme();
  const [last, setLast] = useState<TierId>("Tier 2");
  useEffect(() => { if (tier) setLast(tier); }, [tier]);
  const t = tier || last;
  const isT2 = t === "Tier 2";
  const [bvn, setBvn] = useState("");
  const [dob, setDob] = useState("");
  const [nin, setNin] = useState("");
  const [addr, setAddr] = useState("");
  const [doc, setDoc] = useState<{ uri: string; name: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [e, setE] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (tier) { setBvn(""); setDob(""); setNin(""); setAddr(""); setDoc(null); setConsent(false); setE({}); } }, [tier]);

  const maxDob = isoDay(Date.now() - 18 * 365.25 * 864e5);

  const pick = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toast("Permission needed to upload your document", "warning");
    const res = camera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    if (a.fileSize && a.fileSize > 5 * 1024 * 1024) return toast("Document is larger than 5MB", "error");
    setDoc({ uri: a.uri, name: a.fileName || "proof-of-address.jpg" });
    setE((x) => ({ ...x, doc: undefined }));
  };

  const submit = async () => {
    const er: Record<string, string> = {};
    if (isT2) {
      if (!/^\d{11}$/.test(bvn)) er.bvn = "Enter a valid 11-digit BVN";
      if (!dob || dob > maxDob) er.dob = "You must be at least 18 years old";
    } else {
      if (!/^\d{11}$/.test(nin)) er.nin = "Enter a valid 11-digit NIN";
      if (addr.trim().length < 8) er.addr = "Enter your address";
      if (!doc) er.doc = "Upload a document";
    }
    if (!consent) er.consent = "Consent is required";
    setE(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    await sleep(1500);
    setBusy(false);
    const info = TIERS.find((x) => x.id === t)!;
    app().update("user", (u) => ({ ...u, tier: t, ...(isT2 ? { bvnVerified: true } : { ninVerified: true }) }));
    app().notify({ icon: "bi-patch-check", tone: "success", title: `Upgraded to ${t}`, body: `Your new limits: ${info.limits.join(", ")}.` });
    onClose();
    setTimeout(() => success({ title: `You're now ${t}`, message: "Your identity has been verified and your limits increased.", rows: info.limits.map((l, i) => [i === 0 ? "Daily limit" : "Benefit", l] as [string, string]) }), 320);
  };

  return (
    <Sheet visible={!!tier} onClose={onClose} locked={busy} title={`Upgrade to ${t}`} scroll
      footer={<Button title="Verify & upgrade" size="lg" full loading={busy} loadingText={isT2 ? "Verifying with NIBSS…" : "Verifying with NIMC…"} onPress={submit} />}>
      <Notice tone="primary" icon="bi-shield-lock" style={{ marginBottom: 14 }}>
        {isT2 ? "We use your BVN only to confirm your identity. It never gives access to your bank account." : "Verify your National Identification Number (NIN) and address to unlock premium limits."}
      </Notice>
      <View style={{ gap: 14 }}>
        {isT2 ? (
          <>
            <TextField label="Bank Verification Number (BVN)" placeholder="11 digits" keyboardType="number-pad" maxLength={11} value={bvn} onChangeText={(v) => { setBvn(v.replace(/\D/g, "")); setE((x) => ({ ...x, bvn: undefined })); }} error={e.bvn} hint="Dial *565*0# to get your BVN" />
            <DateField label="Date of birth" value={dob} max={maxDob} onChange={(v) => { setDob(v); setE((x) => ({ ...x, dob: undefined })); }} error={e.dob} />
          </>
        ) : (
          <>
            <TextField label="National Identification Number (NIN)" placeholder="11 digits" keyboardType="number-pad" maxLength={11} value={nin} onChangeText={(v) => { setNin(v.replace(/\D/g, "")); setE((x) => ({ ...x, nin: undefined })); }} error={e.nin} />
            <TextField label="Residential address" placeholder="House number, street, city" value={addr} onChangeText={(v) => { setAddr(v); setE((x) => ({ ...x, addr: undefined })); }} error={e.addr} />
            <View>
              <Text variant="sm" weight="semibold" style={{ marginBottom: 6 }}>Proof of address</Text>
              {doc ? (
                <Row gap={12} style={{ padding: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border }}>
                  <Image source={{ uri: doc.uri }} style={{ width: 52, height: 52, borderRadius: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="sm" weight="semibold" numberOfLines={1}>{doc.name}</Text>
                    <Text variant="xs" color={c.success}>Ready to upload</Text>
                  </View>
                  <Pressable onPress={() => setDoc(null)} hitSlop={8} accessibilityLabel="Remove document"><Icon name="bi-x-circle-fill" size={22} color={c.muted} /></Pressable>
                </Row>
              ) : (
                <Row gap={10}>
                  <Pressable onPress={() => pick(false)} style={{ flex: 1, alignItems: "center", gap: 6, padding: 16, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: e.doc ? c.danger : c.border }}>
                    <Icon name="bi-cloud-upload" size={24} color={c.primary} />
                    <Text variant="xs" weight="semibold">Choose file</Text>
                  </Pressable>
                  <Pressable onPress={() => pick(true)} style={{ flex: 1, alignItems: "center", gap: 6, padding: 16, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: e.doc ? c.danger : c.border }}>
                    <Icon name="bi-camera" size={24} color={c.primary} />
                    <Text variant="xs" weight="semibold">Take photo</Text>
                  </Pressable>
                </Row>
              )}
              <Text variant="xs" color={e.doc ? c.danger : c.muted} style={{ marginTop: 5 }}>{e.doc || "Utility bill or bank statement from the last 3 months"}</Text>
            </View>
          </>
        )}
        <Checkbox checked={consent} onChange={(v) => { setConsent(v); setE((x) => ({ ...x, consent: undefined })); }} error={e.consent} label={`I consent to AutoBiz verifying my identity with ${isT2 ? "NIBSS" : "NIMC"}`} />
      </View>
    </Sheet>
  );
}
