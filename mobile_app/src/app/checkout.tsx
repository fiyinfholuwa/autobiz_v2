import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { confirmPay, openFund, success, toast } from "@/components/overlay";
import { Button, Card, EmptyState, Header, Icon, IconTile, Notice, OptionCard, Row, Screen, Select, Text, TextField } from "@/components/ui";
import { naira } from "@/lib/format";
import { sleep } from "@/lib/random";
import { isEmail } from "@/lib/validators";
import { app, useApp, type Address, type DeliveryMethod, type Order } from "@/store";
import { radius, useTheme } from "@/theme";
import { anyDigital, buildTimeline, deliveryFee, eta, hubsFor, METHOD_LABEL, STATES, voucherCode } from "@/features/shop/logic";
import { SummaryCard, useTotals } from "@/features/shop/OrderSummary";

type Errs = Partial<Record<keyof Address, string>>;

export default function CheckoutScreen() {
  return <AuthGate><Checkout /></AuthGate>;
}

function defaultAddress(): Address {
  const s = app();
  const past = s.orders.find((o) => o.address?.state)?.address;
  return { name: `${s.user.firstName} ${s.user.lastName}`, phone: s.user.phone, email: s.user.email, state: "Lagos", city: "", street: "", landmark: "", ...(past || {}) };
}

function Checkout() {
  const { c } = useTheme();
  const [step, setStep] = useState(1);
  const [addr, setAddr] = useState<Address>(defaultAddress);
  const [errs, setErrs] = useState<Errs>({});
  const [method, setMethod] = useState<DeliveryMethod>("standard");
  const [hub, setHub] = useState("");
  const [pay, setPay] = useState<"wallet" | "pod">("wallet");
  const [placing, setPlacing] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const balance = useApp((s) => s.wallet.balance);
  const t = useTotals(method, addr.state);
  const digital = t.digital;
  const mixed = anyDigital(t.items) && !digital;
  const hubs = hubsFor(addr.state);
  const curHub = hub && hubs.includes(hub) ? hub : hubs[0];

  if (!t.items.length && !placing)
    return (
      <Screen header={<Header title="Checkout" />}>
        <EmptyState icon="ion:cart-outline" title="Your cart is empty" message="Add items to your cart to check out." action="Start shopping" onAction={() => router.replace("/(tabs)/shop")} />
      </Screen>
    );

  const go = (n: number) => { setStep(n); scroll.current?.scrollTo({ y: 0, animated: true }); };
  const set = (k: keyof Address) => (v: string) => { setAddr((a) => ({ ...a, [k]: v })); setErrs((e) => ({ ...e, [k]: undefined })); };

  const submitAddress = () => {
    const e: Errs = {};
    if (addr.name.trim().length < 3 || !/\s/.test(addr.name.trim())) e.name = "Enter your first and last name.";
    if (!/^0[789][01]\d{8}$/.test(addr.phone.replace(/\s/g, ""))) e.phone = "Enter a valid 11-digit Nigerian number (e.g. 08031234567).";
    if (!isEmail(addr.email)) e.email = "Enter a valid email address.";
    if (!digital) {
      if (addr.city.trim().length < 2) e.city = "Enter your city or LGA.";
      if (addr.street.trim().length < 6) e.street = "Enter your full street address.";
    }
    setErrs(e);
    if (Object.keys(e).length) return toast("Please fix the highlighted fields", "warning");
    setAddr((a) => ({ ...a, phone: a.phone.replace(/\s/g, ""), name: a.name.trim() }));
    if (digital) setMethod("digital");
    else if (method === "digital") setMethod("standard");
    go(digital ? 3 : 2);
  };

  const place = async () => {
    const s = app();
    const id = "ORD-" + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 5).toUpperCase();
    const m: DeliveryMethod = t.method;
    const count = t.units;
    let tx = null;
    if (pay === "wallet") {
      const rows: [string, string][] = [["Order", id], ["Items", `${count} item${count > 1 ? "s" : ""}`], ["Delivery", t.delivery ? naira(t.delivery) : "Free"]];
      if (t.coupon) rows.push(["Coupon", `−${naira(t.discount)}`]);
      const ok = await confirmPay({ title: "Confirm order payment", amount: t.total, cta: `Pay ${naira(t.total)}`, rows });
      if (!ok) return;
      tx = s.debit(t.total, { type: "shop", title: "Marketplace Order", subtitle: `${t.items.length === 1 ? t.items[0].name : `${t.items.length} items`} · ${id}`, icon: "bi-bag", tone: "violet" });
      if (!tx) return toast("Insufficient wallet balance. Please fund your wallet.", "error");
    } else {
      if (placing) return;
      setPlacing(true);
      await sleep(1000);
    }
    setPlacing(true);
    const order: Order = {
      id, date: Date.now(), status: "processing",
      items: t.items.map((l) => ({ ...l, codes: l.digital ? Array.from({ length: l.qty }, (_, n) => voucherCode(id, l.id, n)) : undefined })),
      subtotal: t.sub, discount: t.discount, coupon: t.coupon, deliveryFee: t.delivery, total: t.total,
      address: { ...addr }, method: m, pickupHub: m === "pickup" ? curHub : null,
      payment: pay, paid: pay === "wallet", txId: tx?.id ?? null,
      eta: m === "digital" ? "Instant" : eta(addr.state, m), timeline: buildTimeline(m),
    };
    s.update("orders", (o) => [order, ...o]);
    s.cartClear();
    s.notify({ icon: "bi-bag-check", tone: "success", title: `Order placed · ${id}`, body: `${count} item${count > 1 ? "s" : ""} · ${naira(t.total)} · ${pay === "wallet" ? "Paid from wallet" : "Pay on delivery"}` });
    const hasDigital = order.items.some((i) => i.digital);
    const rows: [string, string][] = [["Order ID", id], ["Amount", naira(t.total, 2)], ["Payment", pay === "wallet" ? "Wallet (paid)" : "Pay on delivery"]];
    if (pay === "wallet") rows.push(["New balance", naira(app().wallet.balance, 2)]);
    router.replace("/orders");
    success({
      title: "Order placed!",
      message: hasDigital ? "Your digital codes are ready in My Orders." : `We'll notify you as your order moves. Estimated delivery: **${order.eta}**.`,
      rows,
      actions: [{ label: "View order", icon: "bi-box-seam", onPress: () => router.push(`/orders/${id}`) }],
    });
  };

  const steps = ["Address", "Delivery", "Payment"];
  const short = pay === "wallet" && balance < t.total;

  return (
    <Screen
      scrollRef={scroll}
      header={<Header title="Checkout" subtitle="Secure checkout — just 3 quick steps." back={step > 1 ? () => go(step === 3 && digital ? 1 : step - 1) : true} />}
      footer={
        step === 1 ? <Button title="Continue" iconRight="bi-arrow-right" size="lg" full onPress={submitAddress} />
          : step === 2 ? <Button title="Continue to payment" iconRight="bi-arrow-right" size="lg" full onPress={() => go(3)} />
          : <Button title={pay === "wallet" ? `Pay · ${naira(t.total)}` : `Place order · ${naira(t.total)}`} icon={pay === "wallet" ? "bi-lock-fill" : "bi-bag-check"} size="lg" full loading={placing && pay === "pod"} loadingText="Placing order…" onPress={place} />
      }
    >
      {/* Stepper */}
      <Row gap={6} style={{ marginBottom: 16 }}>
        {steps.map((s, i) => {
          const n = i + 1;
          const done = n < step;
          const on = n === step;
          const skip = digital && n === 2;
          return (
            <Pressable key={s} disabled={!done || skip} onPress={() => go(n)} style={{ flex: 1, opacity: skip ? 0.4 : 1 }}>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: done || on ? c.primary : c.border }} />
              <Row gap={5} style={{ marginTop: 6 }}>
                {done ? <Icon name="bi-check-circle-fill" size={14} color={c.primary} /> : <Text size={11} weight="bold" color={on ? c.primary : c.muted}>{n}.</Text>}
                <Text size={12} weight={on ? "bold" : "semibold"} color={on || done ? c.text : c.muted}>{s}</Text>
              </Row>
            </Pressable>
          );
        })}
      </Row>

      {step === 1 ? (
        <Card style={{ gap: 12 }}>
          <View>
            <Text variant="h3">{digital ? "Contact details" : "Delivery address"}</Text>
            <Text variant="sm" muted>{digital ? "Your codes will be shown in My Orders and sent to this email." : "Where should we deliver your order?"}</Text>
          </View>
          <TextField label="Full name" value={addr.name} onChangeText={set("name")} error={errs.name} autoComplete="name" />
          <TextField label="Phone number" value={addr.phone} onChangeText={set("phone")} error={errs.phone} keyboardType="phone-pad" maxLength={11} placeholder="08012345678" />
          <TextField label="Email" value={addr.email} onChangeText={set("email")} error={errs.email} keyboardType="email-address" autoCapitalize="none" />
          {!digital ? (
            <>
              <Select label="State" value={addr.state} onChange={set("state")} options={STATES.map((s) => ({ value: s, label: s }))} searchable title="Choose state" />
              <TextField label="City / LGA" value={addr.city} onChangeText={set("city")} error={errs.city} placeholder="e.g. Ikeja" />
              <TextField label="Street address" value={addr.street} onChangeText={set("street")} error={errs.street} placeholder="House number, street name" />
              <TextField label="Nearest landmark (optional)" value={addr.landmark} onChangeText={set("landmark")} placeholder="e.g. Opposite Shoprite" />
            </>
          ) : null}
        </Card>
      ) : step === 2 ? (
        <Card style={{ gap: 12 }}>
          <Text variant="h3">Delivery method</Text>
          <Row gap={6} wrap>
            <Text variant="sm" muted>Delivering to <Text variant="sm" weight="bold">{addr.city}, {addr.state}</Text> ·</Text>
            <Pressable onPress={() => go(1)}><Text variant="sm" weight="bold" color={c.primary}>Change</Text></Pressable>
          </Row>
          {(
            [["standard", "Standard door delivery", "Delivered to your address", "bi-truck", "primary"], ["express", "Express delivery", "Priority dispatch, fastest route", "bi-lightning", "violet"], ["pickup", "Pickup station", "Collect at a hub near you", "bi-shop-window", "success"]] as const
          ).map(([m, title, desc, ic, tone]) => {
            const fee = deliveryFee(t.items, m, addr.state);
            return (
              <OptionCard key={m} selected={method === m} onPress={() => setMethod(m)}>
                <Row gap={12}>
                  <IconTile icon={ic} tone={tone} size={40} />
                  <View style={{ flex: 1, paddingRight: 18 }}>
                    <Text weight="semibold">{title}</Text>
                    <Text variant="xs" muted>{desc} · <Text variant="xs" weight="bold">{eta(addr.state, m)}</Text></Text>
                  </View>
                  <Text weight="bold" color={fee ? c.text : c.success} style={{ marginRight: 14 }}>{fee ? naira(fee) : "Free"}</Text>
                </Row>
              </OptionCard>
            );
          })}
          {method === "pickup" ? <Select label="Choose pickup station" value={curHub} onChange={setHub} options={hubs.map((h) => ({ value: h, label: h }))} /> : null}
          {mixed ? <Notice tone="warning" icon="bi-lightning-charge">Digital items in your cart are delivered instantly after payment.</Notice> : null}
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          <Card style={{ gap: 12 }}>
            <View>
              <Text variant="h3">Payment</Text>
              <Text variant="sm" muted>Choose how you'd like to pay.</Text>
            </View>
            <OptionCard selected={pay === "wallet"} onPress={() => setPay("wallet")}>
              <Row gap={12}>
                <IconTile icon="bi-wallet2" size={40} />
                <View style={{ flex: 1, paddingRight: 18 }}>
                  <Text weight="semibold">AutoBiz wallet</Text>
                  <Text variant="xs" color={short ? c.danger : c.muted}>Balance: {naira(balance, 2)} · {short ? "Insufficient for this order" : "Instant confirmation"}</Text>
                </View>
              </Row>
              {short ? <Button title="Top up" size="sm" variant="soft" icon="bi-plus-lg" onPress={openFund} style={{ alignSelf: "flex-start", marginTop: 10 }} /> : null}
            </OptionCard>
            <OptionCard selected={pay === "pod"} onPress={() => (anyDigital(t.items) ? toast("Pay on delivery isn't available for digital items", "warning") : setPay("pod"))} style={{ opacity: anyDigital(t.items) ? 0.5 : 1 }}>
              <Row gap={12}>
                <IconTile icon="bi-cash" tone="success" size={40} />
                <View style={{ flex: 1, paddingRight: 18 }}>
                  <Text weight="semibold">Pay on delivery</Text>
                  <Text variant="xs" muted>{anyDigital(t.items) ? "Not available for orders with digital items" : "Cash, transfer or POS when your order arrives"}</Text>
                </View>
              </Row>
            </OptionCard>
          </Card>
          <Card style={{ gap: 12 }}>
            <ReviewBlock title={digital ? "Contact" : "Ship to"} onEdit={() => go(1)}>
              <Text variant="sm" weight="semibold">{addr.name} · {addr.phone}</Text>
              <Text variant="xs" muted>{digital ? addr.email : `${addr.street}, ${addr.city}, ${addr.state}${addr.landmark ? ` · ${addr.landmark}` : ""}`}</Text>
            </ReviewBlock>
            {!digital ? (
              <ReviewBlock title="Delivery" onEdit={() => go(2)}>
                <Text variant="sm" weight="semibold">{METHOD_LABEL[t.method]}{t.method === "pickup" ? ` · ${curHub}` : ""}</Text>
                <Text variant="xs" muted>Est. {eta(addr.state, t.method)} · {t.delivery ? naira(t.delivery) : "Free"}</Text>
              </ReviewBlock>
            ) : null}
          </Card>
          <Text variant="xs" muted center>By placing this order you agree to AutoBiz's Terms of Sale.{pay === "pod" ? " Please have the exact amount ready on delivery." : ""}</Text>
        </View>
      )}

      <View style={{ marginTop: 14 }}>
        <SummaryCard t={t} deliveryNote={digital ? "" : step === 1 ? `(${addr.state}, standard)` : `(${t.method})`} showItems>
          <Pressable onPress={() => router.back()}><Text variant="sm" weight="bold" color={c.primary} center>Edit cart</Text></Pressable>
        </SummaryCard>
      </View>
    </Screen>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Row align="flex-start" gap={10} style={{ padding: 12, borderRadius: radius.md, backgroundColor: c.surface2 }}>
      <View style={{ flex: 1 }}>
        <Text variant="label" muted style={{ marginBottom: 4 }}>{title}</Text>
        {children}
      </View>
      <Pressable onPress={onEdit} hitSlop={8}><Text variant="sm" weight="bold" color={c.primary}>Edit</Text></Pressable>
    </Row>
  );
}
