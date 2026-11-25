import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { confirmPay, success, toast } from "@/components/overlay";
import { Button, Chip, Header, Icon, OptionCard, Row, Screen, Summary, Text, TextField } from "@/components/ui";
import { BrandMark, StaticCard } from "@/features/cards/CardVisual";
import {
  BRANDS, buildCard, createCost, MAX_CARDS, MAX_INITIAL, MIN_CREATE, PREVIEW_NUMBER, THEMES, useCardsUI, type Brand, type Theme,
} from "@/features/cards/constants";
import { naira, usd } from "@/lib/format";
import { sleep } from "@/lib/random";
import { app, useApp } from "@/store";
import { radius, useTheme } from "@/theme";

const STEPS = ["Brand", "Design", "Details", "Review"];

export default function CreateCardScreen() {
  return (
    <AuthGate>
      <CreateCard />
    </AuthGate>
  );
}

function CreateCard() {
  const { c } = useTheme();
  const count = useApp((s) => s.cards.length);
  const user = useApp((s) => s.user);
  const balance = useApp((s) => s.wallet.balance);
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState<Brand>("visa");
  const [theme, setTheme] = useState<Theme>(THEMES[count % THEMES.length]);
  const [label, setLabel] = useState(count ? `Card ${count + 1}` : "Online Shopping");
  const [amountStr, setAmountStr] = useState("10");
  const [errs, setErrs] = useState<{ label?: string; amount?: string }>({});
  const [busy, setBusy] = useState(false);

  const amount = Number(amountStr) || 0;
  const { fee, totalUsd, naira: ngn } = createCost(amount);
  const holder = `${user.firstName} ${user.lastName}`;

  const validateDetails = () => {
    const e: typeof errs = {};
    if (label.trim().length < 2) e.label = "Enter a nickname (2–20 characters).";
    if (!amount || amount < MIN_CREATE) e.amount = "Minimum initial funding is $5.00.";
    else if (amount > MAX_INITIAL) e.amount = "Maximum initial funding is $2,500.";
    else if (/\.\d{3,}$/.test(amountStr)) e.amount = "Use at most 2 decimal places.";
    setErrs(e);
    return !e.label && !e.amount;
  };

  const next = () => {
    if (step === 2 && !validateDetails()) return;
    if (step < 3) setStep(step + 1);
    else pay();
  };
  const back = () => (step === 0 ? router.back() : setStep(step - 1));

  const pay = async () => {
    if (app().cards.length >= MAX_CARDS) return toast("You can have up to 5 cards. Terminate one to create another.", "warning");
    setBusy(true);
    await sleep(320);
    const name = label.trim();
    const ok = await confirmPay({
      title: "Create USD card", amount: ngn, cta: "Create card",
      rows: [["Card", `${BRANDS[brand].name} · ${name}`], ["Initial balance", usd(amount)], ["Fees", usd(2 + fee)], ["Rate", "₦1,580/$"]],
    });
    setBusy(false);
    if (!ok) return;
    const s = app();
    const tx = s.debit(ngn, { type: "card", title: "Virtual Card Created", subtitle: `${BRANDS[brand].name} · ${name} · ${usd(amount)}`, icon: "bi-credit-card-2-front", tone: "success" });
    if (!tx) return toast("Insufficient wallet balance", "error");
    const card = buildCard({ brand, theme, label: name, amount, holder: holder.toUpperCase() });
    s.update("cards", (cards) => [...cards, card]);
    s.notify({ icon: "bi-credit-card-2-front", tone: "success", title: "Your USD card is ready", body: `${name} (•••• ${card.number.slice(-4)}) funded with ${usd(card.balance)}.` });
    useCardsUI.getState().select(card.id);
    router.replace("/(tabs)/cards");
    setTimeout(() => success({
      title: "Card created!",
      message: `Your ${BRANDS[brand].name} USD card is ready to use online.`,
      rows: [["Card", `•••• ${card.number.slice(-4)}`], ["Balance", usd(card.balance)], ["Charged", naira(ngn, 2)], ["Reference", tx.id]],
      actions: [{ label: "Reveal details", icon: "bi-eye", onPress: () => useCardsUI.getState().requestReveal(card.id) }],
    }), 350);
  };

  const preview = { brand, theme, label: label.trim() || "Card", balance: amount || 0, number: PREVIEW_NUMBER[brand], holder };

  return (
    <Screen
      header={<Header title="Create USD card" subtitle={`Step ${step + 1} of 4 · ${STEPS[step]}`} back={back} />}
      footer={
        <Row gap={10}>
          <Button title={step === 0 ? "Cancel" : "Back"} variant="outline" style={{ flex: 1 }} onPress={back} disabled={busy} />
          <Button title={step === 3 ? `Pay ${naira(ngn, 2)}` : "Continue"} icon={step === 3 ? "bi-lock-fill" : undefined} iconRight={step < 3 ? "bi-arrow-right" : undefined} style={{ flex: 2 }} loading={busy} onPress={next} />
        </Row>
      }
    >
      {/* Stepper */}
      <Row gap={6} style={{ marginBottom: 16 }}>
        {STEPS.map((s, i) => (
          <Pressable key={s} disabled={i >= step} onPress={() => setStep(i)} style={{ flex: 1 }} accessibilityLabel={`Step ${i + 1} ${s}`}>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: i <= step ? c.primary : c.border }} />
            <Text size={11} weight={i === step ? "bold" : "medium"} color={i === step ? c.primary : c.muted} style={{ marginTop: 5 }}>{i + 1}. {s}</Text>
          </Pressable>
        ))}
      </Row>

      {step < 3 ? <StaticCard face={preview} style={{ marginBottom: 18 }} /> : null}

      {step === 0 ? (
        <View style={{ gap: 12 }}>
          <Text variant="h3">Choose card network</Text>
          {(Object.keys(BRANDS) as Brand[]).map((b) => (
            <OptionCard key={b} selected={brand === b} onPress={() => setBrand(b)}>
              <Row gap={14}>
                <View style={{ width: 72, height: 46, borderRadius: radius.md, backgroundColor: BRANDS[b].panel, alignItems: "center", justifyContent: "center" }}>
                  <BrandMark brand={b} size={0.8} />
                </View>
                <View style={{ flex: 1, paddingRight: 18 }}>
                  <Text weight="bold">{BRANDS[b].name}</Text>
                  <Text variant="xs" muted>{BRANDS[b].desc}</Text>
                </View>
              </Row>
            </OptionCard>
          ))}
        </View>
      ) : null}

      {step === 1 ? (
        <View>
          <Text variant="h3" style={{ marginBottom: 12 }}>Pick a design</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 }}>
            {THEMES.map((t) => {
              const on = t.id === theme.id;
              return (
                <Pressable key={t.id} onPress={() => setTheme(t)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ width: "31%", alignItems: "center", gap: 6 }}>
                  <LinearGradient colors={t.colors as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: "100%", aspectRatio: 1.586, borderRadius: radius.md, borderWidth: 3, borderColor: on ? c.primary : "transparent", alignItems: "flex-end", justifyContent: "flex-start", padding: 6 }}>
                    {on ? <Icon name="bi-check-circle-fill" size={18} color="#fff" /> : null}
                  </LinearGradient>
                  <Text size={12} weight={on ? "bold" : "medium"} color={on ? c.primary : c.text}>{t.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: 14 }}>
          <TextField label="Card nickname" value={label} maxLength={20} onChangeText={(t) => { setLabel(t); setErrs((e) => ({ ...e, label: undefined })); }} error={errs.label} placeholder="e.g. Subscriptions" />
          <View>
            <TextField
              label="Initial funding" prefix="$" big keyboardType="decimal-pad" value={amountStr} error={errs.amount} hint="Minimum $5.00"
              onChangeText={(t) => { setAmountStr(t.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1")); setErrs((e) => ({ ...e, amount: undefined })); }}
            />
            <Row gap={8} wrap style={{ marginTop: 10 }}>
              {[5, 10, 25, 50, 100].map((p) => <Chip key={p} label={"$" + p} active={amount === p} onPress={() => { setAmountStr(String(p)); setErrs((e) => ({ ...e, amount: undefined })); }} />)}
            </Row>
          </View>
          <Summary rows={[["Fees ($2 + 1%)", usd(2 + fee)], ["You pay (at ₦1,580/$)", naira(ngn, 2), { bold: true }]]} />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: 14 }}>
          <Row gap={14}>
            <LinearGradient colors={theme.colors as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 110, aspectRatio: 1.586, borderRadius: radius.md, padding: 8, justifyContent: "space-between" }}>
              <Text size={10} weight="bold" color="#fff" numberOfLines={1}>{label.trim()}</Text>
              <View style={{ alignSelf: "flex-end" }}><BrandMark brand={brand} size={0.5} /></View>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text variant="h3">{label.trim()}</Text>
              <Text variant="sm" muted>{BRANDS[brand].name} · {theme.name} design</Text>
            </View>
          </Row>
          <Summary
            rows={[
              ["Initial card balance", usd(amount)],
              ["Card creation fee", "$2.00"],
              ["Funding fee (1%)", usd(fee)],
              ["Total in USD", usd(totalUsd)],
              ["Exchange rate", "$1 = ₦1,580"],
            ]}
            total={["You pay", naira(ngn, 2)]}
          />
          <Text variant="xs" muted center>Charged from your Naira wallet ({naira(balance, 2)} available).</Text>
        </View>
      ) : null}
    </Screen>
  );
}
