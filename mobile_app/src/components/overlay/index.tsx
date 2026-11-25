/* ==========================================================================
   Global overlays — the mobile equivalent of the web app's AB.* UI helpers.
     toast(msg, type?, opts?)            — "**bold**" supported in msg
     confirmPay(opts) → Promise<boolean> — PIN keypad + balance check (guests → login prompt)
     success(opts)                        — receipt sheet with check animation
     openFund()                           — Fund wallet sheet (bank / card / voucher)
     requireLogin(opts) → boolean         — true if authed, else shows login prompt
     confirmDialog(opts) → Promise<boolean>
     copy(text, msg?)
   Render <OverlayHost/> once at the root.
   ========================================================================== */
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Easing, Pressable, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import { naira, usd as fmtUsd, datetime } from "@/lib/format";
import { sleep } from "@/lib/random";
import { app, useApp } from "@/store";
import { radius, shadow, useTheme } from "@/theme";
import { Button, IconButton } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Checkbox, Keypad, PinDots, TextField } from "../ui/Input";
import { backHandlers, PortalHost } from "../ui/Portal";
import { Chip, IconTile, Notice, Row, Segment, Summary, type SummaryRow } from "../ui/primitives";
import { Sheet } from "../ui/Sheet";
import { RichText, Text } from "../ui/Text";

/* ---------------- Types ---------------- */
export type ToastType = "success" | "error" | "warning" | "info";
type Toast = { id: number; msg: string; type: ToastType; action?: { label: string; onPress: () => void }; duration: number };
export type PayOpts = {
  title?: string;
  amount: number;
  rows?: SummaryRow[];
  note?: string;
  currency?: "ngn" | "usd";
  amountLabel?: string;
  cta?: string;
  skipBalanceCheck?: boolean;
  delay?: number;
};
export type SuccessAction = { label: string; onPress: () => void; variant?: "soft" | "outline" | "primary"; icon?: string; keepOpen?: boolean };
export type SuccessOpts = { title?: string; message?: string; rows?: SummaryRow[]; extra?: React.ReactNode; actions?: SuccessAction[]; icon?: string; tone?: string };
export type ConfirmOpts = { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; tone?: "danger" | "warning" | "primary"; icon?: string; check?: string; children?: React.ReactNode; loadingMs?: number };
export type LoginOpts = { title?: string; message?: string; next?: string };

type UIState = {
  toasts: Toast[];
  pay: (PayOpts & { resolve: (v: boolean) => void }) | null;
  success: SuccessOpts | null;
  fund: boolean;
  login: LoginOpts | null;
  confirm: (ConfirmOpts & { resolve: (v: boolean) => void }) | null;
};
const useUI = create<UIState>(() => ({ toasts: [], pay: null, success: null, fund: false, login: null, confirm: null }));

/* ---------------- Public API ---------------- */
let tid = 0;
export function toast(msg: string, type: ToastType = "success", opts: { action?: Toast["action"]; duration?: number } = {}) {
  const t: Toast = { id: ++tid, msg, type, action: opts.action, duration: opts.duration ?? 3800 };
  if (type === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  else if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  useUI.setState((s) => ({ toasts: [...s.toasts.slice(-2), t] }));
  setTimeout(() => dismissToast(t.id), t.duration);
}
const dismissToast = (id: number) => useUI.setState((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));

export function requireLogin(opts: LoginOpts = {}): boolean {
  if (app().auth.authed) return true;
  useUI.setState({ login: { title: "Log in to continue", message: "Sign in or create a free account to continue.", ...opts } });
  return false;
}

export function confirmPay(opts: PayOpts): Promise<boolean> {
  if (!app().auth.authed) {
    requireLogin({ title: "Log in to continue", message: "Create a free account or log in to complete this payment. You'll come right back here." });
    return Promise.resolve(false);
  }
  return new Promise((resolve) => useUI.setState({ pay: { ...opts, resolve } }));
}

export function success(opts: SuccessOpts) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  useUI.setState({ success: opts });
}
export const closeSuccess = () => useUI.setState({ success: null });

export function openFund() {
  if (!requireLogin({ title: "Log in to fund your wallet", message: "Create a free account or log in to add money to your AutoBiz wallet." })) return;
  useUI.setState({ fund: true });
}

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => useUI.setState({ confirm: { ...opts, resolve } }));
}

export async function copy(text: string, msg = "Copied to clipboard") {
  try { await Clipboard.setStringAsync(text); toast(msg, "success"); } catch { toast("Copy failed", "error"); }
}

/** Share receipt text via the native share sheet. */
export async function shareText(title: string, message: string) {
  try { await Share.share({ title, message }); } catch { copy(message, "Receipt copied to clipboard"); }
}

/** Plain-text receipt for sharing/copying */
export function receiptText(title: string, rows: SummaryRow[]) {
  const val = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
  return ["AutoBiz Receipt", title, ...rows.map(([k, v]) => `${k}: ${val(v)}`)].join("\n");
}

/* ---------------- Host ---------------- */
export function OverlayHost() {
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const top = backHandlers.top();
      if (top) { top(); return true; }
      return false;
    });
    return () => sub.remove();
  }, []);
  return (
    <>
      <PortalHost />
      <PaySheet />
      <SuccessSheet />
      <FundSheet />
      <LoginSheet />
      <ConfirmSheet />
      <Toasts />
    </>
  );
}

/* ---------------- Toasts ---------------- */
function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 8, left: 12, right: 12, gap: 8 }}>
      {toasts.map((t) => <ToastView key={t.id} t={t} />)}
    </View>
  );
}
function ToastView({ t }: { t: Toast }) {
  const { c, dark } = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 8 }).start(); }, [a]);
  const meta = { success: ["bi-check-circle-fill", c.success], error: ["bi-x-circle-fill", c.danger], warning: ["bi-exclamation-triangle-fill", c.warning], info: ["bi-info-circle-fill", c.primary] }[t.type];
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }}>
      <Pressable onPress={() => dismissToast(t.id)} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: dark ? "#2a2a2e" : "#191919", borderRadius: radius.lg, padding: 14, ...shadow(3, false) }}>
        <Icon name={meta[0]} size={20} color={meta[1]} />
        <View style={{ flex: 1 }}>
          <RichText text={t.msg} variant="sm" color="#fff" />
          {t.action ? (
            <Pressable onPress={() => { dismissToast(t.id); t.action!.onPress(); }} hitSlop={8} style={{ marginTop: 4 }}>
              <Text variant="sm" weight="bold" color={c.primary300}>{t.action.label} →</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ---------------- PIN / Pay sheet ---------------- */
function PaySheet() {
  const pay = useUI((s) => s.pay);
  const { c } = useTheme();
  const balance = useApp((s) => (s.auth.authed ? s.wallet.balance : 0));
  const settings = useApp((s) => s.settings);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const resolved = useRef(false);

  const [lastPay, setLastPay] = useState<UIState["pay"]>(null);
  useEffect(() => { if (pay) { setLastPay(pay); setPin(""); setBusy(false); setErr(false); resolved.current = false; } }, [pay]);

  const close = (v: boolean) => {
    if (!pay || resolved.current) return;
    resolved.current = true;
    pay.resolve(v);
    useUI.setState({ pay: null });
  };
  const doShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Animated.sequence([10, -10, 7, -7, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 55, useNativeDriver: true }))).start();
  };
  const submit = async (p: string) => {
    if (!pay) return;
    const ok = settings.pin ? p === settings.pin : p !== "0000";
    if (!ok) {
      setErr(true); doShake(); toast("Incorrect PIN. Try again.", "error");
      setTimeout(() => { setPin(""); setErr(false); }, 450);
      return;
    }
    setBusy(true);
    await sleep(pay.delay ?? 1100);
    close(true);
  };

  const p = pay || lastPay;
  const isUsd = p?.currency === "usd";
  const insufficient = !!p && !isUsd && p.skipBalanceCheck !== true && balance < p.amount;
  return (
    <Sheet visible={!!pay} onClose={() => close(false)} locked={busy} title={p?.title || "Confirm payment"} scroll>
      {p ? (
        <>
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text variant="label" muted>{p.amountLabel || "You're paying"}</Text>
            <Text variant="display" tabular style={{ marginTop: 4 }}>{isUsd ? fmtUsd(p.amount) : naira(p.amount, 2)}</Text>
          </View>
          {p.rows?.length ? <Summary rows={p.rows} style={{ marginVertical: 10 }} /> : null}
          {!isUsd && p.skipBalanceCheck !== true ? (
            <Row justify="space-between" style={{ padding: 12, borderRadius: radius.lg, borderWidth: 1.5, borderColor: insufficient ? c.danger : c.border, marginBottom: 12 }}>
              <Row gap={10}>
                <IconTile icon="bi-wallet2" size={36} />
                <View>
                  <Text variant="sm" weight="semibold">Wallet balance</Text>
                  <Text variant="xs" muted tabular>{naira(balance, 2)}</Text>
                </View>
              </Row>
              {insufficient ? (
                <Button title="Top up" size="sm" variant="soft" onPress={() => { close(false); setTimeout(openFund, 320); }} />
              ) : (
                <Icon name="bi-check-circle-fill" size={20} color={c.success} />
              )}
            </Row>
          ) : null}
          {insufficient ? (
            <Notice tone="danger" icon="bi-exclamation-circle">Insufficient balance. Fund your wallet to continue.</Notice>
          ) : (
            <>
              <Text variant="sm" muted center style={{ marginBottom: 14 }}>{busy ? "Processing…" : "Enter your 4-digit transaction PIN"}</Text>
              <Animated.View style={{ transform: [{ translateX: shake }], marginBottom: 6 }}>
                <PinDots value={pin} error={err} />
              </Animated.View>
              {!settings.pin ? <Text variant="xs" muted center style={{ marginTop: 8 }}>Demo: any PIN works except 0000</Text> : null}
              <View style={{ marginTop: 14, opacity: busy ? 0.4 : 1 }}>
                <Keypad
                  disabled={busy}
                  onKey={(d) => {
                    if (pin.length >= 4) return;
                    const v = pin + d;
                    setPin(v);
                    if (v.length === 4) setTimeout(() => submit(v), 120);
                  }}
                  onDelete={() => setPin((x) => x.slice(0, -1))}
                />
              </View>
              {busy ? <Button title={p.cta || "Confirm & Pay"} loading loadingText="Processing…" full style={{ marginTop: 10 }} /> : null}
            </>
          )}
          {p.note ? <Text variant="xs" muted center style={{ marginTop: 12 }}>{p.note}</Text> : null}
        </>
      ) : null}
    </Sheet>
  );
}

/* ---------------- Success receipt ---------------- */
function SuccessSheet() {
  const s = useUI((x) => x.success);
  const [last, setLast] = useState<SuccessOpts | null>(null);
  useEffect(() => { if (s) setLast(s); }, [s]);
  const o = s || last;
  const { c, tone } = useTheme();
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (s) { scale.setValue(0); Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start(); }
  }, [s, scale]);
  const close = () => useUI.setState({ success: null });
  const tc = tone(o?.tone || "success");
  return (
    <Sheet
      visible={!!s}
      onClose={close}
      scroll
      footer={
        o ? (
          <>
            {o.actions?.length ? (
              <Row gap={10}>
                {o.actions.map((a) => (
                  <Button key={a.label} title={a.label} icon={a.icon} variant={a.variant || "soft"} style={{ flex: 1 }} onPress={() => { if (!a.keepOpen) { close(); setTimeout(a.onPress, 280); } else a.onPress(); }} />
                ))}
              </Row>
            ) : null}
            <Button title="Done" full onPress={close} />
          </>
        ) : null
      }
    >
      {o ? (
        <View style={{ alignItems: "center" }}>
          <Animated.View style={{ transform: [{ scale }], marginTop: 6 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: tc.bg, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: tc.fg, alignItems: "center", justifyContent: "center" }}>
                <Icon name={o.icon || "bi-check-lg"} size={32} color="#fff" />
              </View>
            </View>
          </Animated.View>
          <Text variant="h2" center style={{ marginTop: 14 }}>{o.title || "Successful"}</Text>
          {o.message ? <RichText text={o.message} variant="sm" muted center style={{ marginTop: 6, maxWidth: 320 }} /> : null}
          {o.rows?.length ? <Summary rows={o.rows} style={{ alignSelf: "stretch", marginTop: 16 }} /> : null}
          {o.extra ? <View style={{ alignSelf: "stretch", marginTop: 12 }}>{o.extra}</View> : null}
        </View>
      ) : null}
    </Sheet>
  );
}

/* ---------------- Fund wallet ---------------- */
const DEDICATED = [["Wema Bank", "7821443609"], ["Moniepoint MFB", "5093227184"]] as const;
export { DEDICATED as DEDICATED_ACCOUNTS };

function FundSheet() {
  const open = useUI((s) => s.fund);
  const user = useApp((s) => s.user);
  const { c } = useTheme();
  const [tab, setTab] = useState<"bank" | "card" | "voucher">("bank");
  const [amount, setAmount] = useState("");
  const [voucher, setVoucher] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (open) { setTab("bank"); setAmount(""); setVoucher(""); setBusy(null); } }, [open]);
  const close = () => useUI.setState({ fund: false });

  const fund = (amt: number, sub: string) => {
    const s = app();
    s.credit(amt, { type: "funding", title: "Wallet Funding", subtitle: sub, icon: "bi-arrow-down-left", tone: "success" });
    s.notify({ icon: "bi-wallet2", tone: "success", title: "Wallet funded", body: `${naira(amt)} was added to your wallet.` });
    close();
    setTimeout(() => success({ title: "Wallet funded", message: `${naira(amt, 2)} has been added to your wallet.`, rows: [["New balance", naira(app().wallet.balance, 2)], ["Method", sub]] }), 320);
  };
  const run = async (key: string, ms: number, fn: () => void) => { setBusy(key); await sleep(ms); setBusy(null); fn(); };

  return (
    <Sheet visible={open} onClose={close} locked={!!busy} title="Fund wallet" scroll>
      <Segment value={tab} onChange={setTab} options={[{ value: "bank", label: "Bank transfer" }, { value: "card", label: "Card" }, { value: "voucher", label: "Voucher" }]} style={{ marginBottom: 14 }} />
      {tab === "bank" ? (
        <View style={{ gap: 10 }}>
          <Text variant="sm" muted>Transfer to your dedicated account. Your wallet is credited automatically within 1 minute.</Text>
          {DEDICATED.map(([b, n]) => (
            <Row key={b} justify="space-between" style={{ padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border }}>
              <View>
                <Text variant="xs" muted>{b}</Text>
                <Text variant="h2" tabular>{n.replace(/(\d{4})(\d{4})(\d{2})/, "$1 $2 $3")}</Text>
                <Text variant="xs" muted>AutoBiz – {user.firstName} {user.lastName}</Text>
              </View>
              <Button title="Copy" icon="bi-copy" size="sm" variant="soft" onPress={() => copy(n, "Account number copied")} />
            </Row>
          ))}
          <Text variant="xs" muted>ⓘ A ₦50 stamp fee applies to transfers above ₦10,000.</Text>
          <Button title="Simulate ₦50,000 transfer (demo)" icon="bi-lightning" variant="outline" loading={busy === "sim"} onPress={() => run("sim", 1200, () => fund(50000, "Bank transfer · Wema"))} />
        </View>
      ) : tab === "card" ? (
        <View style={{ gap: 12 }}>
          <TextField label="Amount" prefix="₦" big keyboardType="numeric" placeholder="0.00" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ""))} />
          <Row gap={8} wrap>
            {[5000, 10000, 20000, 50000].map((v) => <Chip key={v} label={naira(v)} active={Number(amount) === v} onPress={() => setAmount(String(v))} />)}
          </Row>
          <Text variant="xs" muted>1.5% card processing fee (capped at ₦2,000). Secured by Paystack.</Text>
          <Button title="Continue" size="lg" loading={busy === "card"} onPress={() => {
            const amt = Number(amount);
            if (!amt || amt < 100) return toast("Enter an amount of at least ₦100", "warning");
            run("card", 1500, () => fund(amt, "Debit card •••• 4081"));
          }} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <TextField label="Voucher PIN" placeholder="XXXX-XXXX-XXXX" autoCapitalize="characters" maxLength={14} value={voucher} onChangeText={setVoucher} />
          <Button title="Redeem voucher" size="lg" loading={busy === "v"} onPress={() => {
            const v = voucher.replace(/\W/g, "");
            if (v.length < 12) return toast("Enter a valid 12-character voucher PIN", "warning");
            run("v", 1000, () => fund(5000, "Voucher " + v.slice(0, 4).toUpperCase() + "••••"));
          }} />
        </View>
      )}
    </Sheet>
  );
}

/* ---------------- Login prompt ---------------- */
function LoginSheet() {
  const l = useUI((s) => s.login);
  const cartCount = useApp((s) => s.cart.reduce((a, x) => a + x.qty, 0));
  const { c } = useTheme();
  const close = () => useUI.setState({ login: null });
  const go = (path: "/login" | "/register") => { const next = l?.next; close(); setTimeout(() => router.push({ pathname: path, params: next ? { next } : {} } as any), 250); };
  return (
    <Sheet visible={!!l} onClose={close} footer={
      <>
        <Button title="Log in" size="lg" full onPress={() => go("/login")} />
        <Button title="Create free account" size="lg" variant="soft" full onPress={() => go("/register")} />
        <Button title="Keep browsing" variant="ghost" onPress={close} />
      </>
    }>
      <View style={{ alignItems: "center", paddingTop: 4 }}>
        <IconTile icon="bi-person-lock" size={72} rounded />
        <Text variant="h2" center style={{ marginTop: 14 }}>{l?.title}</Text>
        <Text variant="sm" muted center style={{ marginTop: 6 }}>{l?.message}</Text>
        {cartCount ? <Text variant="xs" muted center style={{ marginTop: 8 }}><Icon name="bi-bag-check" size={12} color={c.success} /> Your {cartCount} cart item{cartCount > 1 ? "s are" : " is"} saved.</Text> : null}
      </View>
    </Sheet>
  );
}

/* ---------------- Confirm dialog ---------------- */
function ConfirmSheet() {
  const o = useUI((s) => s.confirm);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (o) { setChecked(false); setBusy(false); } }, [o]);
  const done = async (v: boolean) => {
    if (!o) return;
    if (v && o.loadingMs) { setBusy(true); await sleep(o.loadingMs); }
    o.resolve(v);
    useUI.setState({ confirm: null });
  };
  const tone = o?.tone || "primary";
  return (
    <Sheet visible={!!o} onClose={() => done(false)} locked={busy} footer={
      o ? (
        <Row gap={10}>
          <Button title={o.cancelLabel || "Cancel"} variant="outline" style={{ flex: 1 }} onPress={() => done(false)} disabled={busy} />
          <Button title={o.confirmLabel || "Confirm"} variant={tone === "danger" ? "danger" : "primary"} style={{ flex: 1 }} disabled={!!o.check && !checked} loading={busy} loadingText="Please wait…" onPress={() => done(true)} />
        </Row>
      ) : null
    }>
      {o ? (
        <View style={{ alignItems: "center" }}>
          <IconTile icon={o.icon || (tone === "danger" ? "bi-exclamation-triangle" : "bi-question-circle")} tone={tone} size={64} rounded />
          <Text variant="h2" center style={{ marginTop: 12 }}>{o.title}</Text>
          {o.message ? <RichText text={o.message} variant="sm" muted center style={{ marginTop: 6 }} /> : null}
          {o.children ? <View style={{ alignSelf: "stretch", marginTop: 12 }}>{o.children}</View> : null}
          {o.check ? <View style={{ alignSelf: "stretch", marginTop: 12 }}><Checkbox checked={checked} onChange={setChecked} label={o.check} /></View> : null}
        </View>
      ) : null}
    </Sheet>
  );
}

export { datetime };
