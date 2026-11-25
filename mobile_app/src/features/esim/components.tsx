import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Svg, { Circle } from "react-native-svg";
import { confirmDialog, copy, toast } from "@/components/overlay";
import { Badge, Button, Card, Flag, Icon, IconButton, Notice, ProgressBar, Row, Select, Sheet, StatusPill, Text } from "@/components/ui";
import type { EsimCountry } from "@/data/catalog";
import { ago, date, naira } from "@/lib/format";
import { sleep } from "@/lib/random";
import { app, type Esim } from "@/store";
import { radius, useTheme } from "@/theme";
import { activate, computeStatus, countryByCode, DAY, DEVICE_OPTIONS, deviceOk, lpaParts, minFrom, regionName, usedGb } from "./logic";

/* ---------------- Flag or regional tile ---------------- */
export function CountryArt({ c, size = 40 }: { c: { code: string; regional?: boolean; icon?: string | null }; size?: number }) {
  const { c: col } = useTheme();
  if (c.regional)
    return (
      <LinearGradient colors={[col.violet, col.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
        <Icon name={c.icon || "bi-globe2"} size={size * 0.55} color="#fff" />
      </LinearGradient>
    );
  return <Flag code={c.code} size={size} />;
}

export function CountryTile({ c, onPress }: { c: EsimCountry; onPress: () => void }) {
  const { c: col } = useTheme();
  return (
    <Card onPress={onPress} style={{ flex: 1, padding: 14 }}>
      <Row justify="space-between" align="flex-start">
        <CountryArt c={c} size={38} />
        <Badge label={c.speed} tone={/5G/.test(c.speed) ? "success" : "cyan"} />
      </Row>
      <Text weight="bold" numberOfLines={1} style={{ marginTop: 10 }}>{c.name}</Text>
      <Text variant="xs" muted numberOfLines={1}>{c.regional ? "Multi-country pack" : c.networks}</Text>
      <Text variant="sm" weight="bold" color={col.primary} style={{ marginTop: 8 }}>from ${minFrom(c).toFixed(2)}</Text>
      <Text variant="xs" muted>≈ {naira(Math.round(minFrom(c) * 1580))}</Text>
    </Card>
  );
}

/* ---------------- Device compatibility ---------------- */
export function DeviceCheck({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: boolean }) {
  const ok = value ? deviceOk(value) : undefined;
  return (
    <View style={{ gap: 8 }}>
      <Select label="Device compatibility" placeholder="Select your phone model…" title="Select your phone" searchable value={value} onChange={onChange} options={DEVICE_OPTIONS} error={error ? "Pick a compatible phone" : undefined} />
      {value ? (
        ok ? (
          <Notice tone="success" icon="bi-check-circle-fill"><Text variant="sm" color={undefined}><Text variant="sm" weight="bold">{value}</Text> supports eSIM. You're good to go!</Text></Notice>
        ) : (
          <Notice tone="danger" icon="bi-x-circle-fill"><Text variant="sm"><Text variant="sm" weight="bold">{value}</Text> doesn't support eSIM. This plan won't work on this device.</Text></Notice>
        )
      ) : null}
    </View>
  );
}

/* ---------------- Install block (QR + manual codes) ---------------- */
export function InstallBlock({ code, compact }: { code: string; compact?: boolean }) {
  const { c } = useTheme();
  const { smdp, act } = lpaParts(code);
  const field = (label: string, v: string) => (
    <Row key={label} justify="space-between" style={{ padding: 12, borderRadius: radius.md, backgroundColor: c.surface2 }}>
      <View style={{ flex: 1 }}>
        <Text variant="xs" muted>{label}</Text>
        <Text variant="sm" weight="semibold" selectable numberOfLines={2}>{v}</Text>
      </View>
      <IconButton icon="bi-copy" size={34} bg={c.surface} onPress={() => copy(v, `${label} copied`)} accessibilityLabel={`Copy ${label}`} />
    </Row>
  );
  return (
    <View style={{ gap: 10 }}>
      <View style={{ alignItems: "center", padding: 16, borderRadius: radius.lg, backgroundColor: "#fff", alignSelf: "center" }}>
        <QRCode value={code} size={compact ? 150 : 190} color="#111" backgroundColor="#fff" />
      </View>
      <Text variant="xs" muted center>Settings → Mobile data → Add eSIM → Use QR code</Text>
      {compact ? <Text variant="xs" muted center>— or enter manually —</Text> : null}
      {field("SM-DP+ address", smdp)}
      {field("Activation code", act)}
      {!compact ? field("Full LPA string", code) : null}
    </View>
  );
}

/* ---------------- Usage ring ---------------- */
export function UsageRing({ e }: { e: Esim }) {
  const { c } = useTheme();
  const st = computeStatus(e);
  const unlimited = e.gb >= 999;
  const used = usedGb(e);
  let frac = 1, big = "", sub = "", color = c.primary;
  if (st === "Active") {
    if (unlimited) { big = "∞"; sub = `${used.toFixed(1)} GB used`; }
    else {
      const left = Math.max(0, e.gb - used);
      frac = left / e.gb;
      big = `${left < 10 ? left.toFixed(1) : left.toFixed(0)} GB`;
      sub = `of ${e.gb} GB left`;
      if (frac < 0.2) color = c.danger;
    }
  } else if (st === "Expired") { frac = 0; big = "0 GB"; sub = "expired"; color = c.muted; }
  else { big = unlimited ? "∞" : `${e.gb} GB`; sub = "unused"; color = c.violet; }
  const r = 40, C = 2 * Math.PI * r;
  return (
    <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
      <Svg width={96} height={96} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={48} cy={48} r={r} stroke={c.surface2} strokeWidth={8} fill="none" />
        <Circle cx={48} cy={48} r={r} stroke={color} strokeWidth={8} fill="none" strokeDasharray={`${C} ${C}`} strokeDashoffset={C * (1 - frac)} strokeLinecap="round" />
      </Svg>
      <Text weight="extrabold" size={16}>{big}</Text>
      <Text size={10} muted>{sub}</Text>
    </View>
  );
}

/* ---------------- eSIM card (My eSIMs) ---------------- */
export function EsimCard({ e }: { e: Esim }) {
  const { c } = useTheme();
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const st = computeStatus(e);
  const country = countryByCode(e.code);
  const strip: [string, string] = e.archived || st === "Expired" ? ["#adb5bd", "#868e96"] : st === "Active" ? [c.primary300, c.primary700] : [c.violet, c.pink];
  const now = Date.now();
  const used = usedGb(e);
  const limited = st === "Active" && e.gb < 999;
  const update = (fn: (x: Esim) => Esim) => app().update("esims", (l) => l.map((x) => (x.id === e.id ? fn(x) : x)));
  const meta: [string, string][] = [
    [st === "Active" ? "Expires" : st === "Expired" ? "Expired" : "Install by", date(e.expiresAt || e.purchasedAt + 180 * DAY)],
    st === "Active" ? ["Days left", (() => { const d = Math.max(0, Math.ceil(((e.expiresAt || now) - now) / DAY)); return `${d} ${d === 1 ? "day" : "days"}`; })()] : ["Validity", `${e.days} days`],
    ["Network", country?.networks || "—"],
    ["ICCID", `•••• ${e.iccid.slice(-4)}`],
  ];
  const archive = async () => {
    setMenu(false);
    if (await confirmDialog({ title: "Archive this eSIM?", message: `${e.country} · ${e.data} will be hidden from your list. You can restore it from the Archived filter.`, confirmLabel: "Archive", tone: "warning", icon: "mci:archive-outline" })) {
      update((x) => ({ ...x, archived: true })); toast("eSIM archived", "info");
    }
  };
  const del = async () => {
    setMenu(false);
    if (await confirmDialog({ title: "Delete this eSIM?", message: `This permanently removes the ${e.country} eSIM record and its QR code from AutoBiz.${st === "Active" ? " **Remaining data will be lost.**" : ""}`, confirmLabel: "Delete", tone: "danger", icon: "bi-trash" })) {
      app().update("esims", (l) => l.filter((x) => x.id !== e.id)); toast("eSIM deleted", "info");
    }
  };
  return (
    <Card padded={false} style={{ overflow: "hidden" }}>
      <LinearGradient colors={strip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 5 }} />
      <View style={{ padding: 16 }}>
        <Row gap={12} align="flex-start">
          <CountryArt c={{ code: e.code, regional: e.regional, icon: e.icon }} size={40} />
          <View style={{ flex: 1 }}>
            <Text weight="bold" numberOfLines={1}>{e.country}</Text>
            <Text variant="xs" muted>{e.plan}</Text>
            <View style={{ marginTop: 6 }}><StatusPill status={e.archived ? "Archived" : st} tone={e.archived ? "neutral" : st === "Active" ? "success" : st === "Expired" ? "neutral" : "primary"} /></View>
          </View>
          <IconButton icon="bi-three-dots-vertical" size={34} bg={c.surface2} onPress={() => setMenu(true)} accessibilityLabel="More options" />
        </Row>
        <Row gap={14} style={{ marginTop: 14 }}>
          <UsageRing e={e} />
          <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", rowGap: 10 }}>
            {meta.map(([k, v]) => (
              <View key={k} style={{ width: "50%" }}>
                <Text variant="xs" muted>{k}</Text>
                <Text variant="sm" weight="semibold" numberOfLines={1}>{v}</Text>
              </View>
            ))}
          </View>
        </Row>
        {limited ? (
          <View style={{ marginTop: 12 }}>
            <ProgressBar value={used / e.gb} color={(e.gb - used) / e.gb < 0.2 ? c.danger : c.primary} />
            <Row justify="space-between" style={{ marginTop: 4 }}>
              <Text variant="xs" muted>{used} GB used</Text>
              <Text variant="xs" muted>{Math.round((used / e.gb) * 100)}%</Text>
            </Row>
          </View>
        ) : null}
        {e.topups.length ? <Text variant="xs" muted style={{ marginTop: 8 }}>{e.topups.length} top-up{e.topups.length > 1 ? "s" : ""} · last {ago(e.topups[e.topups.length - 1].at)}</Text> : null}
        <Row gap={10} style={{ marginTop: 14 }}>
          {e.archived ? (
            <Button title="Restore" icon="bi-arrow-counterclockwise" variant="soft" style={{ flex: 1 }} onPress={() => { update((x) => ({ ...x, archived: false })); toast("eSIM restored", "success"); }} />
          ) : st === "Not installed" ? (
            <>
              <Button title="Install" icon="bi-qr-code" style={{ flex: 1 }} onPress={() => router.push(`/esim/install/${e.id}`)} />
              <Button title="Mark installed" variant="soft" style={{ flex: 1 }} loading={busy} onPress={async () => { setBusy(true); await sleep(800); setBusy(false); activate(e.id); }} />
            </>
          ) : st === "Active" ? (
            <>
              <Button title="Top up" icon="bi-plus-lg" style={{ flex: 1 }} onPress={() => router.push({ pathname: "/esim/[code]", params: { code: e.code, topup: e.id } })} />
              <Button title="QR & setup" variant="soft" style={{ flex: 1 }} onPress={() => router.push(`/esim/install/${e.id}`)} />
            </>
          ) : (
            <Button title="Renew" icon="bi-arrow-repeat" style={{ flex: 1 }} onPress={() => router.push({ pathname: "/esim/[code]", params: { code: e.code, topup: e.id } })} />
          )}
        </Row>
      </View>
      <Sheet visible={menu} onClose={() => setMenu(false)} title={e.country} subtitle={e.plan}>
        {[
          { icon: "bi-qr-code", label: "View QR & instructions", fn: () => { setMenu(false); router.push(`/esim/install/${e.id}`); } },
          { icon: "bi-copy", label: "Copy ICCID", fn: () => { setMenu(false); copy(e.iccid, "ICCID copied"); } },
          ...(!e.archived ? [{ icon: "mci:archive-outline", label: "Archive", fn: archive }] : []),
          { icon: "bi-trash", label: "Delete", fn: del, danger: true },
        ].map((a) => (
          <Pressable key={a.label} onPress={a.fn} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}>
            <Icon name={a.icon} size={20} color={(a as any).danger ? c.danger : c.text} />
            <Text weight="semibold" color={(a as any).danger ? c.danger : undefined}>{a.label}</Text>
          </Pressable>
        ))}
      </Sheet>
    </Card>
  );
}

export { regionName };
