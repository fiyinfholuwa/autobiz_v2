import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { confirmPay, requireLogin, success, toast } from "@/components/overlay";
import {
  Badge, Button, Card, Checkbox, Chip, ChipRow, EmptyState, Header, Icon, IconButton, OptionCard, Row, Screen, Segment, Select, Stepper, Summary, Text, TextField,
} from "@/components/ui";
import { giftcards, type GiftCard } from "@/data/catalog";
import { CardTile, CodesBlock, CountryFlag, shade, TradeRow } from "@/features/giftcards/components";
import {
  brand, BONUS, BONUS_MIN, BUY_IDS, BUY_RATE, cleanCode, genBuyCode, maskCode, maxRate, quote, rateFor, topRate, typeInfo,
} from "@/features/giftcards/logic";
import { ago, naira, ref as mkRef, usd } from "@/lib/format";
import { isEmail } from "@/lib/validators";
import { app, useApp, type Trade } from "@/store";
import { radius, useTheme } from "@/theme";

type Tab = "sell" | "buy" | "rates" | "trades";
type Img = { uri: string; name: string; kb: number };
type SellState = { step: number; card: string | null; country: string | null; type: string | null; face: string; qty: number; images: Img[]; codes: string[]; note: string; agree: boolean; q: string };
const EMPTY_SELL: SellState = { step: 1, card: null, country: null, type: null, face: "", qty: 1, images: [], codes: [""], note: "", agree: false, q: "" };
const gc = (id: string | null) => giftcards.find((g) => g.id === id);

export default function GiftCardsScreen() {
  const params = useLocalSearchParams<{ tab?: string; card?: string; country?: string; type?: string; face?: string; brand?: string; step?: string }>();
  const { c } = useTheme();
  const [tab, setTab] = useState<Tab>((["sell", "buy", "rates", "trades"].includes(params.tab || "") ? params.tab : "sell") as Tab);
  const [sell, setSell] = useState<SellState>(EMPTY_SELL);
  const [buyPreset, setBuyPreset] = useState<{ brand?: string; face?: number }>({});
  const trades = useApp((s) => s.trades);
  const authed = useApp((s) => s.auth.authed);
  const scroll = useRef<any>(null);
  const [loadAt] = useState(Date.now() - 3 * 60000);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);

  const goto = (t: Tab) => { setTab(t); scroll.current?.scrollTo({ y: 0, animated: true }); };
  const openSell = (cardId: string, country?: string, type?: string, face?: string, step = 2) => {
    const card = gc(cardId);
    if (!card) return;
    const types = Object.keys(card.types);
    setSell({ ...EMPTY_SELL, card: cardId, country: country || card.countries[0], type: type || (types.length === 1 ? types[0] : null), face: face || "", step });
    goto("sell");
  };

  // deep links
  useEffect(() => {
    if (params.tab && ["sell", "buy", "rates", "trades"].includes(params.tab)) setTab(params.tab as Tab);
    if (params.card && gc(params.card)) openSell(params.card, params.country, params.type, params.face, params.step ? Number(params.step) : 2);
    if (params.brand) { setBuyPreset({ brand: params.brand, face: params.face ? Number(params.face) : undefined }); setTab("buy"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tab, params.card, params.brand, params.country, params.type, params.face]);

  const earned = trades.filter((t) => t.side === "sell" && t.status === "Completed").reduce((a, t) => a + t.naira, 0);

  return (
    <Screen scrollRef={scroll} header={<Header title="Gift Card Exchange" subtitle="Sell cards for Naira · buy e-gift cards" />}>
      <LinearGradient colors={["#e64980", "#7048e8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 20, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -24, bottom: -30, opacity: 0.14 }}><Icon name="bi-gift" size={160} color="#fff" /></View>
        <Badge label={`Rates updated ${ago(loadAt)}`} icon="bi-graph-up" tone="success" solid />
        <Text variant="h2" color="#fff" style={{ marginTop: 10 }}>Trade gift cards at top rates</Text>
        <Text variant="sm" color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>Sell Apple, Steam, Amazon & 9 more cards for Naira — or buy digital gift cards delivered instantly to your email.</Text>
        <Row gap={24} style={{ marginTop: 16 }}>
          <View>
            <Text variant="xs" color="rgba(255,255,255,0.75)">Top rate today</Text>
            <Text variant="h2" color="#fff">₦{topRate().toLocaleString()}/$</Text>
          </View>
          {authed ? (
            <View>
              <Text variant="xs" color="rgba(255,255,255,0.75)">You've earned</Text>
              <Text variant="h2" color="#fff">{naira(earned)}</Text>
            </View>
          ) : null}
        </Row>
        <Row gap={12} wrap style={{ marginTop: 14 }}>
          {[["bi-clock", "Paid in 5–15 min"], ["bi-graph-up", "Best rates"], ["bi-headset", "24/7 support"], ["bi-shield-check", "Bank-grade security"]].map(([i, t]) => (
            <Row key={t} gap={5}><Icon name={i} size={13} color="#fff" /><Text variant="xs" color="#fff">{t}</Text></Row>
          ))}
        </Row>
      </LinearGradient>

      <Segment
        value={tab}
        onChange={goto}
        small
        style={{ marginVertical: 16 }}
        options={[{ value: "sell", label: "Sell" }, { value: "buy", label: "Buy" }, { value: "rates", label: "Rates" }, { value: "trades", label: "My trades", badge: authed && trades.length ? trades.length : undefined }]}
      />

      {tab === "sell" ? <SellTab s={sell} setS={setSell} onDone={() => goto("trades")} /> :
        tab === "buy" ? <BuyTab preset={buyPreset} /> :
        tab === "rates" ? <RatesTab onSell={(id, co, ty, face) => openSell(id, co, ty, face, 3)} /> :
        <TradesTab onSell={() => { setSell(EMPTY_SELL); goto("sell"); }} />}
      <View style={{ height: 8 }} />
      {tab === "sell" ? (
        <Card style={{ marginTop: 8 }}>
          <Text variant="h3" style={{ marginBottom: 10 }}>How it works</Text>
          {[["1", "Pick your card", "Brand, country and card type"], ["2", "Upload or paste code", "Clear photos or the e-code"], ["3", "Get paid in Naira", "Credited to your wallet in minutes"]].map(([n, t, d]) => (
            <Row key={n} gap={12} style={{ paddingVertical: 6 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.pinkSoft, alignItems: "center", justifyContent: "center" }}><Text variant="sm" weight="bold" color={c.pink}>{n}</Text></View>
              <View><Text weight="semibold">{t}</Text><Text variant="xs" muted>{d}</Text></View>
            </Row>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

/* ====================================================================== SELL */
const STEP_LABELS = ["Card", "Type", "Amount", "Proof", "Review"];

function SellTab({ s, setS, onDone }: { s: SellState; setS: React.Dispatch<React.SetStateAction<SellState>>; onDone: () => void }) {
  const { c } = useTheme();
  const [err, setErr] = useState<Record<string, string | null>>({});
  const card = gc(s.card);
  const faceN = Number(s.face) || 0;
  const usdTotal = faceN * s.qty;
  const isCode = s.type === "E-code";
  const q = card && s.country && s.type ? quote(card, s.country, s.type, usdTotal) : null;
  const set = (p: Partial<SellState>) => setS((x) => ({ ...x, ...p }));

  const pickCard = (g: GiftCard) => {
    const types = Object.keys(g.types);
    if (g.id !== s.card) setS((x) => ({ ...x, card: g.id, country: g.countries[0], type: types.length === 1 ? types[0] : null, face: "", qty: 1, codes: [""], images: [], step: 2 }));
    else set({ step: 2 });
    setErr({});
  };

  const validate = (step: number): boolean => {
    const e: Record<string, string | null> = {};
    if (step === 1 && !card) { e.card = "Select a gift card to continue"; toast(e.card, "warning"); }
    if (step === 2 && !s.type) e.type = "Choose a card type";
    if (step === 3 && card) {
      const [min, max] = card.range;
      if (!s.face) e.face = "Enter the card value";
      else if (faceN < min) e.face = `Minimum is $${min} per card`;
      else if (faceN > max) e.face = `Maximum is $${max} per card`;
      else if (!Number.isInteger(faceN)) e.face = "Enter a whole dollar amount";
    }
    if (step === 4) {
      if (isCode) {
        const seen = new Set<string>();
        s.codes.forEach((code, i) => {
          const cl = cleanCode(code).toUpperCase();
          if (cl.length < 10 || !/^[A-Za-z0-9\- ]+$/.test(code)) e["code" + i] = "Enter a valid code (at least 10 letters/numbers)";
          else if (seen.has(cl)) e["code" + i] = "This code is duplicated";
          seen.add(cl);
        });
      } else if (!s.images.length) e.images = "Add at least one photo of your card";
    }
    if (step === 5 && !s.agree) e.agree = "Please confirm to continue";
    setErr(e);
    return !Object.values(e).some(Boolean);
  };

  const next = () => {
    if (!validate(s.step)) return;
    if (s.step === 4 && isCode) set({ codes: s.codes.map((x) => x.toUpperCase()) });
    if (s.step < 5) set({ step: s.step + 1 });
    else submit();
  };

  const submit = async () => {
    if (!card || !q || !s.country || !s.type) return;
    const ok = await confirmPay({
      title: "Confirm trade", amount: q.naira, amountLabel: "You'll receive", skipBalanceCheck: true, cta: "Submit trade",
      rows: [["Card", `${card.name} · ${s.country}`], ["Type", s.type], ["Value", `${s.qty} × $${faceN}`], ["Rate", `₦${q.rate}/$`]],
      note: "Your wallet is credited automatically once the card is verified (usually 5–15 min).",
    });
    if (!ok) return;
    const now = Date.now();
    const codes = isCode ? s.codes.map((x) => x.toUpperCase().trim()) : [];
    const t: Trade = {
      id: mkRef("GC"), side: "sell", card: card.id, cardName: card.name, country: s.country, type: s.type, face: faceN, qty: s.qty, usd: usdTotal,
      rate: q.rate, bonus: q.bonus, naira: q.naira, status: "Pending", images: isCode ? 0 : s.images.length, codes: codes.map(maskCode), note: s.note.trim(),
      createdAt: now, timeline: [{ s: "Pending", at: now }], credited: false,
      failReason: isCode && codes.some((x) => /^USED/i.test(x)) ? "This code has already been redeemed. Please contact the card issuer or your seller." : null,
    };
    app().update("trades", (l) => [t, ...l]);
    app().notify({ icon: "bi-gift", tone: "pink", title: "Trade submitted", body: `${card.name} $${usdTotal} is being reviewed. Expected payout ${naira(q.naira)}.` });
    setS(EMPTY_SELL);
    success({
      title: "Trade submitted",
      message: `We're verifying your ${card.name} card. You'll be paid **${naira(q.naira)}** once it's confirmed.`,
      rows: [["Trade ID", t.id], ["Card", `${card.name} · ${t.type}`], ["Value", usd(usdTotal)], ["Status", "Pending"]],
      actions: [{ label: "Track trade", icon: "bi-activity", onPress: () => { onDone(); setTimeout(() => router.push(`/giftcards/trade/${encodeURIComponent(t.id)}`), 350); } }],
    });
  };

  const pickImages = async (camera: boolean) => {
    const left = 5 - s.images.length;
    if (left <= 0) return toast("You can upload a maximum of 5 images", "warning");
    if (camera) {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) return toast("Camera permission is needed to snap your card", "warning");
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: left, quality: 0.7 });
    if (res.canceled) return;
    const add: Img[] = [];
    for (const a of res.assets) {
      const name = a.fileName || `card-${Date.now()}.jpg`;
      if (a.mimeType && !/image\/(png|jpe?g|webp|gif|heic|heif)/i.test(a.mimeType)) { toast(`**${name}** isn't a supported image (JPG, PNG, WEBP)`, "error"); continue; }
      if (a.fileSize && a.fileSize > 5 * 1024 * 1024) { toast(`**${name}** is larger than 5MB`, "error"); continue; }
      add.push({ uri: a.uri, name, kb: Math.round((a.fileSize || 0) / 1024) });
    }
    if (s.images.length + add.length > 5) toast("You can upload a maximum of 5 images", "warning");
    set({ images: [...s.images, ...add].slice(0, 5) });
    setErr((e) => ({ ...e, images: null }));
  };

  return (
    <View>
      {/* stepper */}
      <Row gap={6} style={{ marginBottom: 16 }}>
        {STEP_LABELS.map((l, i) => {
          const n = i + 1, done = n < s.step, cur = n === s.step;
          return (
            <Pressable key={l} disabled={!done} onPress={() => set({ step: n })} style={{ flex: 1, alignItems: "center", gap: 4 }} accessibilityLabel={`Step ${n} ${l}`}>
              <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: done ? c.success : cur ? c.primary : c.surface2 }}>
                {done ? <Icon name="bi-check-lg" size={15} color="#fff" /> : <Text size={12} weight="bold" color={cur ? "#fff" : c.muted}>{n}</Text>}
              </View>
              <Text size={10} weight={cur ? "bold" : "medium"} color={cur ? c.text : c.muted}>{l}</Text>
            </Pressable>
          );
        })}
      </Row>

      {s.step === 1 ? (
        <View>
          <Text variant="h3">Which card are you selling?</Text>
          <Text variant="xs" muted style={{ marginBottom: 12 }}>{giftcards.length} cards accepted · best rates in Nigeria</Text>
          <TextField icon="bi-search" placeholder="Search gift cards" value={s.q} onChangeText={(t) => set({ q: t })} containerStyle={{ marginBottom: 12 }} />
          {(() => {
            const qq = s.q.trim().toLowerCase();
            const list = giftcards.filter((g) => !qq || g.name.toLowerCase().includes(qq) || g.countries.some((co) => co.toLowerCase().includes(qq)));
            if (!list.length) return <EmptyState icon="bi-search" title={`No cards match “${s.q}”`} action="Clear search" onAction={() => set({ q: "" })} />;
            return (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {list.map((g) => (
                  <OptionCard key={g.id} selected={s.card === g.id} onPress={() => pickCard(g)} style={{ width: "31.5%", alignItems: "center", paddingVertical: 14, paddingHorizontal: 6 }}>
                    {g.hot ? <View style={{ position: "absolute", top: 6, left: 6 }}><Icon name="bi-fire" size={14} color={c.orange} /></View> : null}
                    <CardTile id={g.id} size={46} />
                    <Text variant="xs" weight="bold" center numberOfLines={1} style={{ marginTop: 8 }}>{g.name}</Text>
                    <Text size={10} muted center>Up to ₦{maxRate(g)}/$</Text>
                  </OptionCard>
                ))}
              </View>
            );
          })()}
          {err.card ? <Text variant="xs" color={c.danger} style={{ marginTop: 8 }}>{err.card}</Text> : null}
        </View>
      ) : null}

      {s.step === 2 && card ? (
        <View>
          <Row gap={12} style={{ marginBottom: 14 }}>
            <CardTile id={card.id} size={48} />
            <View><Text variant="h3">{card.name}</Text><Text variant="xs" muted>Accepted ${card.range[0]} – ${card.range[1]} per card</Text></View>
          </Row>
          <Text weight="semibold" style={{ marginBottom: 8 }}>Card country / currency</Text>
          <Row gap={8} wrap style={{ marginBottom: 16 }}>
            {card.countries.map((co) => (
              <OptionCard key={co} selected={s.country === co} onPress={() => set({ country: co })} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingRight: 30 }}>
                <CountryFlag country={co} size={22} />
                <Text weight="semibold">{co}</Text>
              </OptionCard>
            ))}
          </Row>
          <Text weight="semibold" style={{ marginBottom: 8 }}>Card type</Text>
          <View style={{ gap: 10 }}>
            {Object.keys(card.types).map((t) => {
              const info = typeInfo(t);
              return (
                <OptionCard key={t} selected={s.type === t} onPress={() => { set({ type: t }); setErr({}); }}>
                  <Row gap={12}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: t === "E-code" ? c.violetSoft : c.pinkSoft }}>
                      <Icon name={info.icon} size={20} color={t === "E-code" ? c.violet : c.pink} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 20 }}>
                      <Text weight="bold">{t}</Text>
                      <Text variant="xs" muted>{info.desc}</Text>
                    </View>
                    <Text weight="bold" color={c.primary}>₦{rateFor(card, s.country!, t)}/$</Text>
                  </Row>
                </OptionCard>
              );
            })}
          </View>
          {err.type ? <Text variant="xs" color={c.danger} style={{ marginTop: 8 }}>{err.type}</Text> : null}
        </View>
      ) : null}

      {s.step === 3 && card && q ? (
        <View>
          <Text variant="h3">How much is the card worth?</Text>
          <Text variant="xs" muted style={{ marginBottom: 12 }}>{card.name} · {s.country} · {s.type} — accepted ${card.range[0]}–${card.range[1]} per card</Text>
          <TextField label="Value per card (USD)" prefix="$" big keyboardType="number-pad" value={s.face} onChangeText={(t) => { set({ face: t.replace(/[^\d.]/g, "") }); setErr({}); }} error={err.face} placeholder="0" />
          <Row gap={8} wrap style={{ marginTop: 10 }}>
            {[10, 25, 50, 100, 200, 500, 1000].filter((v) => v >= card.range[0] && v <= card.range[1]).map((v) => (
              <Chip key={v} label={`$${v}`} active={faceN === v} onPress={() => { set({ face: String(v) }); setErr({}); }} />
            ))}
          </Row>
          <Row justify="space-between" style={{ marginTop: 16 }}>
            <View><Text weight="semibold">Number of cards</Text><Text variant="xs" muted>Same value & type, up to 10</Text></View>
            <Stepper value={s.qty} onChange={(v) => set({ qty: Math.max(1, Math.min(10, v)), codes: Array.from({ length: Math.max(1, Math.min(10, v)) }, (_, i) => s.codes[i] || "") })} min={1} max={10} />
          </Row>
          <LinearGradient colors={[c.primary700, "#0f3f3a"]} style={{ borderRadius: radius.lg, padding: 16, marginTop: 16 }}>
            <Row justify="space-between">
              <View><Text variant="label" color="rgba(255,255,255,0.7)">You'll receive</Text><Text variant="h1" color="#fff" tabular>{naira(q.naira)}</Text></View>
              <View style={{ alignItems: "flex-end" }}><Text variant="label" color="rgba(255,255,255,0.7)">Rate</Text><Text variant="h3" color="#fff">₦{q.rate}/$</Text></View>
            </Row>
            <Text variant="xs" color="rgba(255,255,255,0.8)" style={{ marginTop: 8 }}>{s.qty} × ${faceN} = <Text variant="xs" weight="bold" color="#fff">${usdTotal}</Text> × ₦{q.base}{q.bonus ? ` + ₦${BONUS} bonus` : ""}</Text>
            <View style={{ marginTop: 8 }}>
              {q.bonus ? <Badge label={`Bonus unlocked · +${naira(usdTotal * BONUS)}`} tone="success" solid icon="bi-stars" /> :
                usdTotal > 0 ? <Text variant="xs" color="#a9f5dc">Add ${BONUS_MIN - usdTotal} more to earn +₦{BONUS}/$ bonus</Text> :
                <Text variant="xs" color="#a9f5dc">Trades of ${BONUS_MIN}+ earn a +₦{BONUS}/$ bonus</Text>}
            </View>
          </LinearGradient>
        </View>
      ) : null}

      {s.step === 4 && card ? (
        <View>
          {isCode ? (
            <>
              <Text variant="h3">Enter your e-code(s)</Text>
              <Text variant="xs" muted style={{ marginBottom: 12 }}>Copy the code exactly as it appears in your email or app.</Text>
              <View style={{ gap: 12 }}>
                {s.codes.map((code, i) => (
                  <TextField key={i} label={`Card ${s.qty > 1 ? i + 1 + " " : ""}code ($${faceN})`} placeholder="e.g. XXXX-XXXX-XXXX-XXXX" autoCapitalize="characters" autoCorrect={false} value={code}
                    onChangeText={(t) => { const codes = [...s.codes]; codes[i] = t.toUpperCase(); set({ codes }); setErr((e) => ({ ...e, ["code" + i]: null })); }} error={err["code" + i]} />
                ))}
              </View>
              <Text variant="xs" muted style={{ marginTop: 10 }}>Demo: codes starting with USED are declined so you can see a failed trade.</Text>
            </>
          ) : (
            <>
              <Text variant="h3">Upload card photos</Text>
              <Text variant="xs" muted style={{ marginBottom: 12 }}>Clear photos of the full card with the scratched PIN visible. JPG, PNG or WEBP · max 5MB each · up to 5 images.</Text>
              <Pressable onPress={() => pickImages(false)} style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: err.images ? c.danger : c.primary300, borderRadius: radius.lg, padding: 22, alignItems: "center", backgroundColor: c.primarySoft }}>
                <Icon name="bi-cloud-upload" size={30} color={c.primary} />
                <Text weight="bold" style={{ marginTop: 6 }}>Choose from gallery</Text>
                <Text variant="xs" muted>{s.images.length}/5 added</Text>
              </Pressable>
              <Button title="Take a photo" icon="bi-camera" variant="outline" style={{ marginTop: 10 }} onPress={() => pickImages(true)} />
              {err.images ? <Text variant="xs" color={c.danger} style={{ marginTop: 6 }}>{err.images}</Text> : null}
              {s.images.length ? (
                <Row gap={10} wrap style={{ marginTop: 12 }}>
                  {s.images.map((im, i) => (
                    <View key={im.uri + i} style={{ width: 96 }}>
                      <Image source={{ uri: im.uri }} style={{ width: 96, height: 96, borderRadius: 12, backgroundColor: c.surface2 }} />
                      <IconButton icon="bi-x-lg" size={26} bg="rgba(0,0,0,0.6)" color="#fff" style={{ position: "absolute", top: 4, right: 4 }} onPress={() => set({ images: s.images.filter((_, j) => j !== i) })} accessibilityLabel="Remove image" />
                      <Text size={10} muted numberOfLines={1}>{im.name}{im.kb ? ` · ${im.kb}KB` : ""}</Text>
                    </View>
                  ))}
                </Row>
              ) : null}
            </>
          )}
          <TextField label="Note for our team (optional)" multiline maxLength={240} placeholder="e.g. Card bought at Walmart, receipt attached" value={s.note} onChangeText={(t) => set({ note: t })} containerStyle={{ marginTop: 16 }} />
        </View>
      ) : null}

      {s.step === 5 && card && q ? (
        <View>
          <Text variant="h3">Review your trade</Text>
          <Text variant="xs" muted style={{ marginBottom: 12 }}>Please confirm the details. Incorrect information may delay payment.</Text>
          <Card style={{ marginBottom: 12 }}>
            <Row gap={12}>
              <CardTile id={card.id} size={44} />
              <View style={{ flex: 1 }}><Text weight="bold">{card.name}</Text><Text variant="xs" muted>{s.country} · {s.type}</Text></View>
              <Button title="Change" size="sm" variant="soft" onPress={() => set({ step: 1 })} />
            </Row>
          </Card>
          <Summary
            rows={[
              ["Card value", `${s.qty} × $${faceN} = $${usdTotal}`],
              ["Rate", <Text key="r" variant="sm" weight="semibold">₦{q.base}/${q.bonus ? <Text variant="sm" weight="bold" color={c.success}> +₦{BONUS} bonus</Text> : null}</Text>],
              isCode ? ["E-codes", s.codes.map((x) => maskCode(x.toUpperCase())).join("\n")] : ["Photos", `${s.images.length} image${s.images.length === 1 ? "" : "s"}`],
              ...(s.note.trim() ? [["Note", s.note.trim()] as [string, string]] : []),
            ]}
            total={["You'll receive", <Text key="t" variant="h2" color={c.success}>{naira(q.naira)}</Text>]}
          />
          <View style={{ marginTop: 14 }}>
            <Checkbox checked={s.agree} onChange={(v) => { set({ agree: v }); setErr({}); }} error={err.agree} label="I confirm this card was obtained legitimately and hasn't been used or shared." />
          </View>
        </View>
      ) : null}

      {/* trade summary */}
      {card && s.step > 1 && s.step < 5 ? (
        <Card style={{ marginTop: 16 }}>
          <Text variant="label" muted style={{ marginBottom: 8 }}>Trade summary</Text>
          <Row gap={10} style={{ marginBottom: 10 }}>
            <CardTile id={card.id} size={36} />
            <View><Text weight="bold">{card.name}</Text><Text variant="xs" muted>{s.country || "—"} · {s.type || "Select type"}</Text></View>
          </Row>
          <Summary rows={[
            ["Card value", faceN ? `${s.qty} × $${faceN}` : "—"],
            ["Rate", q && s.type ? `₦${q.base}/$` : "—"],
            ...(q?.bonus ? [["Bonus", `+₦${BONUS}/$`] as [string, string]] : []),
          ]} total={["You'll receive", <Text key="y" variant="h3" color={c.success}>{naira(q && faceN ? q.naira : 0)}</Text>]} />
        </Card>
      ) : null}

      <Row gap={10} style={{ marginTop: 16 }}>
        {s.step > 1 ? <Button title="Back" variant="outline" icon="bi-arrow-left" style={{ flex: 1 }} onPress={() => { setErr({}); set({ step: s.step - 1 }); }} /> : null}
        {s.step > 1 || card ? <Button title={s.step === 5 ? "Submit trade" : "Continue"} icon={s.step === 5 ? "bi-send" : undefined} iconRight={s.step < 5 ? "bi-arrow-right" : undefined} style={{ flex: 2 }} onPress={next} /> : null}
      </Row>
    </View>
  );
}

/* ====================================================================== BUY */
function BuyTab({ preset }: { preset: { brand?: string; face?: number } }) {
  const { c } = useTheme();
  const user = useApp((s) => s.user);
  const balance = useApp((s) => (s.auth.authed ? s.wallet.balance : 0));
  const [b, setB] = useState(preset.brand && BUY_IDS.includes(preset.brand) ? preset.brand : "amazon");
  const [face, setFace] = useState(preset.face && [10, 25, 50, 100, 200].includes(preset.face) ? preset.face : 25);
  const [qty, setQty] = useState(1);
  const [email, setEmail] = useState(user.email);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  useEffect(() => {
    if (preset.brand && BUY_IDS.includes(preset.brand)) setB(preset.brand);
    setFace(preset.face && [10, 25, 50, 100, 200].includes(preset.face) ? preset.face : 25);
    setQty(1);
  }, [preset]);
  const br = brand(b);
  const base = face * qty * BUY_RATE;
  const fee = Math.max(150, Math.round(base * 0.01));
  const total = base + fee;

  const buy = async () => {
    if (!isEmail(email)) return setEmailErr("Enter a valid email address");
    const ok = await confirmPay({
      title: `Buy ${br.name} gift card`, amount: total, cta: "Pay & get code",
      rows: [["Card", `${br.name} · ${qty} × $${face}`], ["Rate", `₦${BUY_RATE.toLocaleString()}/$`], ["Fee", naira(fee)], ["Deliver to", email]],
    });
    if (!ok) return;
    const tx = app().debit(total, { type: "giftcard", title: `${br.name} Gift Card`, subtitle: `${qty} × $${face} · e-code`, icon: "bi-gift", tone: "pink" });
    if (!tx) return toast("Insufficient wallet balance", "error");
    const codes = Array.from({ length: qty }, genBuyCode);
    const now = Date.now();
    const t: Trade = {
      id: mkRef("GB"), side: "buy", card: b, cardName: br.name, country: "USA", type: "E-code", face, qty, usd: face * qty, rate: BUY_RATE, bonus: 0, fee,
      naira: total, status: "Completed", codes, email, createdAt: now, timeline: [{ s: "Pending", at: now }, { s: "Processing", at: now }, { s: "Completed", at: now }], txId: tx.id,
    };
    app().update("trades", (l) => [t, ...l]);
    app().notify({ icon: "bi-gift", tone: "pink", title: "Gift card delivered", body: `Your ${br.name} $${face * qty} code was sent to ${email}.` });
    success({
      title: "Gift card ready",
      message: `Your code${qty > 1 ? "s were" : " was"} also sent to **${email}**.`,
      rows: [["Card", `${br.name} · $${face * qty}`], ["Paid", naira(total, 2)], ["Reference", tx.id]],
      extra: <CodesBlock codes={codes} />,
    });
  };

  return (
    <View>
      <Text variant="h3">Choose a gift card</Text>
      <Text variant="xs" muted style={{ marginBottom: 12 }}>Digital codes, delivered instantly by email and saved in My trades.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {BUY_IDS.map((id) => (
          <OptionCard key={id} selected={b === id} onPress={() => setB(id)} style={{ width: "31.5%", alignItems: "center", paddingVertical: 14 }}>
            <CardTile id={id} size={44} />
            <Text variant="xs" weight="bold" style={{ marginTop: 8 }}>{brand(id).name}</Text>
            <Text size={10} muted>Digital · instant</Text>
          </OptionCard>
        ))}
      </View>

      <LinearGradient colors={[br.color, shade(br.color)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 20, marginTop: 18, aspectRatio: 1.7 }}>
        <Row justify="space-between">
          <Icon name={br.icon} size={30} color="#fff" />
          <Badge label={qty > 1 ? `${qty} cards` : "e-Gift card"} tone="neutral" />
        </Row>
        <View style={{ flex: 1 }} />
        <Text variant="h2" color="#fff">{br.name}</Text>
        <Text variant="sm" color="rgba(255,255,255,0.85)">Value ${face}</Text>
      </LinearGradient>

      <Text weight="semibold" style={{ marginTop: 18, marginBottom: 8 }}>Card value (USD)</Text>
      <Row gap={8} wrap>{[10, 25, 50, 100, 200].map((v) => <Chip key={v} label={`$${v}`} active={face === v} onPress={() => setFace(v)} />)}</Row>
      <Row justify="space-between" style={{ marginTop: 16 }}>
        <View><Text weight="semibold">Quantity</Text><Text variant="xs" muted>Max 5 cards per order</Text></View>
        <Stepper value={qty} onChange={(v) => setQty(Math.max(1, Math.min(5, v)))} min={1} max={5} />
      </Row>
      <TextField label="Delivery email" keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" value={email} onChangeText={(t) => { setEmail(t); setEmailErr(null); }} error={emailErr} hint="We'll send the code here. It's also shown on your receipt." containerStyle={{ marginTop: 16 }} />
      <Summary style={{ marginTop: 16 }} rows={[[`${qty} × $${face} @ ₦${BUY_RATE.toLocaleString()}/$`, naira(base)], ["Service fee", naira(fee)]]} total={["Total", naira(total)]} />
      <Button title={`Buy for ${naira(total)}`} icon="bi-bag-check" size="lg" full style={{ marginTop: 14 }} onPress={buy} />
      <Text variant="xs" muted center style={{ marginTop: 6 }}>Paid from your Naira wallet · {naira(balance, 2)}</Text>
    </View>
  );
}

/* ====================================================================== RATES */
function RatesTab({ onSell }: { onSell: (id: string, country: string, type: string, face?: string) => void }) {
  const { c } = useTheme();
  const [type, setType] = useState("All");
  const [q, setQ] = useState("");
  const rows = useMemo(() => giftcards.flatMap((g) => g.countries.flatMap((co) => Object.keys(g.types).map((t) => ({ g, co, t, rate: rateFor(g, co, t) })))), []);
  const types = ["All", ...Array.from(new Set(giftcards.flatMap((g) => Object.keys(g.types))))];
  const qq = q.trim().toLowerCase();
  const shown = rows.filter((r) => (type === "All" || r.t === type) && (!qq || r.g.name.toLowerCase().includes(qq) || r.co.toLowerCase().includes(qq)));

  // calculator
  const [cid, setCid] = useState(giftcards[0].id);
  const card = gc(cid)!;
  const [co, setCo] = useState(card.countries[0]);
  const [ty, setTy] = useState(Object.keys(card.types)[0]);
  const [amt, setAmt] = useState("100");
  const a = Number(amt) || 0;
  const cq = quote(card, co, ty, a);
  const out = a > 0 && (a < card.range[0] || a > card.range[1] * 10);

  return (
    <View>
      <Card>
        <Text variant="h3">Rate calculator</Text>
        <View style={{ gap: 10, marginTop: 12 }}>
          <Select label="Gift card" value={cid} onChange={(v) => { const g = gc(v)!; setCid(v); setCo(g.countries[0]); setTy(Object.keys(g.types)[0]); }} options={giftcards.map((g) => ({ value: g.id, label: g.name, left: <CardTile id={g.id} size={28} /> }))} searchable />
          <Row gap={10}>
            <Select containerStyle={{ flex: 1 }} label="Country" value={co} onChange={setCo} options={card.countries.map((x) => ({ value: x, label: x }))} />
            <Select containerStyle={{ flex: 1 }} label="Type" value={ty} onChange={setTy} options={Object.keys(card.types).map((x) => ({ value: x, label: x }))} />
          </Row>
          <TextField label="Amount (USD)" prefix="$" keyboardType="number-pad" value={amt} onChangeText={(t) => setAmt(t.replace(/[^\d.]/g, ""))} />
        </View>
        <Row justify="space-between" style={{ marginTop: 14 }}>
          <View><Text variant="xs" muted>Rate</Text><Text variant="h3">₦{cq.rate}/$</Text></View>
          <View style={{ alignItems: "flex-end" }}><Text variant="xs" muted>You'll receive</Text><Text variant="h2" color={c.success}>{naira(cq.naira)}</Text></View>
        </Row>
        <Text variant="xs" color={out ? c.danger : c.muted} style={{ marginTop: 6 }}>
          {out ? `${card.name} accepts $${card.range[0]}–$${card.range[1]} per card` : cq.bonus ? `Includes +₦${BONUS}/$ bonus` : `Bonus +₦${BONUS}/$ from $${BONUS_MIN}`}
        </Text>
        <Button title="Sell this card" iconRight="bi-arrow-right" variant="soft" style={{ marginTop: 12 }}
          onPress={() => onSell(cid, co, ty, Number.isInteger(a) && a >= card.range[0] && a <= card.range[1] ? String(a) : undefined)} />
      </Card>

      <Text variant="h3" style={{ marginTop: 20 }}>Today's rates</Text>
      <Text variant="xs" muted style={{ marginBottom: 10 }}>₦ per $1 · +₦{BONUS}/$ bonus on trades of ${BONUS_MIN}+</Text>
      <TextField icon="bi-search" placeholder="Search brand or country" value={q} onChangeText={setQ} containerStyle={{ marginBottom: 10 }} />
      <ChipRow style={{ marginHorizontal: -16, marginBottom: 12 }}>{types.map((t) => <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />)}</ChipRow>
      <Card padded={false}>
        {shown.length ? shown.map((r, i) => (
          <Row key={r.g.id + r.co + r.t} gap={12} style={{ paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
            <CardTile id={r.g.id} size={38} />
            <View style={{ flex: 1 }}>
              <Row gap={4}><Text weight="semibold" numberOfLines={1}>{r.g.name}</Text>{r.g.hot ? <Icon name="bi-fire" size={13} color={c.orange} /> : null}</Row>
              <Row gap={6}><CountryFlag country={r.co} size={14} /><Text variant="xs" muted>{r.co} · {r.t}</Text></Row>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text weight="bold">₦{r.rate}</Text>
              <Text size={10} muted>$100 gets {naira(r.rate * 100)}</Text>
            </View>
            <Button title="Sell" size="sm" variant="soft" onPress={() => onSell(r.g.id, r.co, r.t)} />
          </Row>
        )) : <EmptyState icon="bi-search" title="No rates found" message="Try another brand or country" />}
      </Card>
    </View>
  );
}

/* ====================================================================== TRADES */
const TFILTERS = ["All", "Pending", "Processing", "Completed", "Failed", "Bought"] as const;
function TradesTab({ onSell }: { onSell: () => void }) {
  const authed = useApp((s) => s.auth.authed);
  const trades = useApp((s) => s.trades);
  const [f, setF] = useState<(typeof TFILTERS)[number]>("All");
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  if (!authed)
    return <Card><EmptyState icon="bi-person-lock" title="Sign in to see your trades" message="Track gift card sales and purchases from your account." action="Log in" onAction={() => requireLogin({ title: "Log in to view your trades", next: "/giftcards?tab=trades" })} /></Card>;
  const sold = trades.filter((t) => t.side === "sell");
  const bought = trades.filter((t) => t.side === "buy");
  const earned = sold.filter((t) => t.status === "Completed").reduce((a, t) => a + t.naira, 0);
  const count = (k: string) => (k === "All" ? trades.length : k === "Bought" ? bought.length : sold.filter((t) => t.status === k).length);
  const shown = f === "All" ? trades : f === "Bought" ? bought : sold.filter((t) => t.status === f);
  return (
    <View>
      <Row justify="space-between" style={{ marginBottom: 10 }}>
        <View><Text variant="h3">My trades</Text><Text variant="xs" muted>{sold.length} sold · {bought.length} bought · {naira(earned)} earned</Text></View>
        <Button title="New trade" icon="bi-plus-lg" size="sm" variant="soft" onPress={onSell} />
      </Row>
      <ChipRow style={{ marginHorizontal: -16, marginBottom: 12 }}>{TFILTERS.map((k) => <Chip key={k} label={k} count={count(k)} active={f === k} onPress={() => setF(k)} />)}</ChipRow>
      <Card style={{ paddingVertical: 4 }}>
        {!trades.length ? <EmptyState icon="bi-gift" tone="pink" title="No trades yet" message="Sell your first gift card and get paid in minutes." action="Sell a gift card" onAction={onSell} /> :
          !shown.length ? <EmptyState icon="bi-funnel" title={`No ${f.toLowerCase()} trades`} message="Try another filter." action="Show all trades" onAction={() => setF("All")} /> :
          shown.map((t) => <TradeRow key={t.id} t={t} />)}
      </Card>
    </View>
  );
}
