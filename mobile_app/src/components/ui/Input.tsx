import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { isoDay, longDay, parseDay } from "@/lib/format";
import { font, radius, useTheme } from "@/theme";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Row } from "./primitives";
import { Sheet } from "./Sheet";
import { Text } from "./Text";
import { notifyInputFocus } from "./keyboard";

export type TextInputRef = React.ComponentRef<typeof TextInput>;

/* ---------------- Field wrapper ---------------- */
export function FieldLabel({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <Row justify="space-between" style={{ marginBottom: 6 }}>
      <Text variant="sm" weight="semibold">{label}</Text>
      {right}
    </Row>
  );
}
export function FieldError({ error, hint }: { error?: string | null; hint?: string }) {
  const { c } = useTheme();
  if (error) return <Text variant="xs" color={c.danger} style={{ marginTop: 5 }}>{error}</Text>;
  if (hint) return <Text variant="xs" muted style={{ marginTop: 5 }}>{hint}</Text>;
  return null;
}

/* ---------------- TextField ---------------- */
export type TextFieldProps = TextInputProps & {
  label?: string;
  labelRight?: React.ReactNode;
  error?: string | null;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  icon?: string;
  containerStyle?: StyleProp<ViewStyle>;
  big?: boolean;
  /** show/hide toggle for passwords */
  password?: boolean;
  success?: boolean;
};

export const TextField = forwardRef<TextInputRef, TextFieldProps>(function TextField(
  { label, labelRight, error, hint, prefix, suffix, icon, containerStyle, big, password, success, style, multiline, editable = true, ...rest },
  ref
) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const border = error ? c.danger : success ? c.success : focus ? c.primary : c.border;
  return (
    <View style={containerStyle}>
      {label ? <FieldLabel label={label} right={labelRight} /> : null}
      <View
        style={{
          flexDirection: "row", alignItems: multiline ? "flex-start" : "center", gap: 8,
          minHeight: big ? 58 : 50, borderRadius: radius.md + 2, borderWidth: 1.5, borderColor: border,
          backgroundColor: editable ? c.surface : c.surface2, paddingHorizontal: 14,
          ...(focus && !error ? { shadowColor: c.primary, shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } } : {}),
        }}
      >
        {icon ? <Icon name={icon} size={18} color={c.muted} /> : null}
        {typeof prefix === "string" ? <Text weight="semibold" muted size={big ? 18 : 15}>{prefix}</Text> : prefix}
        <TextInput
          ref={ref}
          placeholderTextColor={c.muted}
          editable={editable}
          multiline={multiline}
          secureTextEntry={password && !show}
          onFocus={(e) => { setFocus(true); notifyInputFocus(); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
          style={[
            { flex: 1, fontFamily: big ? font.bold : font.medium, fontSize: big ? 20 : 15, color: c.text, paddingVertical: multiline ? 12 : 0, minHeight: multiline ? 90 : undefined, textAlignVertical: multiline ? "top" : "center" },
            style,
          ]}
          {...rest}
        />
        {password ? (
          <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} accessibilityLabel={show ? "Hide password" : "Show password"}>
            <Icon name={show ? "bi-eye-slash" : "bi-eye"} size={19} color={c.muted} />
          </Pressable>
        ) : null}
        {suffix}
      </View>
      <FieldError error={error} hint={hint} />
    </View>
  );
});

/* ---------------- Select (opens a sheet) ---------------- */
export type SelectOption<T extends string = string> = { value: T; label: string; sub?: string; icon?: string; left?: React.ReactNode; disabled?: boolean };
export function Select<T extends string = string>({ label, value, options, onChange, placeholder = "Select", error, hint, title, searchable, containerStyle, renderValue }: {
  label?: string; value: T | "" | null | undefined; options: SelectOption<T>[]; onChange: (v: T) => void; placeholder?: string; error?: string | null; hint?: string; title?: string; searchable?: boolean; containerStyle?: StyleProp<ViewStyle>; renderValue?: (o: SelectOption<T>) => React.ReactNode;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const cur = options.find((o) => o.value === value);
  const list = q ? options.filter((o) => (o.label + " " + (o.sub || "")).toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <View style={containerStyle}>
      {label ? <FieldLabel label={label} /> : null}
      <Pressable
        onPress={() => { Haptics.selectionAsync().catch(() => {}); setQ(""); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        style={{ minHeight: 50, borderRadius: radius.md + 2, borderWidth: 1.5, borderColor: error ? c.danger : c.border, backgroundColor: c.surface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        {cur?.left}
        {cur?.icon && !cur.left ? <Icon name={cur.icon} size={18} color={c.muted} /> : null}
        <View style={{ flex: 1 }}>
          {cur ? (renderValue ? renderValue(cur) : <Text weight="medium" numberOfLines={1}>{cur.label}</Text>) : <Text muted>{placeholder}</Text>}
        </View>
        <Icon name="bi-chevron-down" size={16} color={c.muted} />
      </Pressable>
      <FieldError error={error} hint={hint} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={title || label || placeholder} scroll>
        {searchable ? <TextField icon="bi-search" placeholder="Search…" value={q} onChangeText={setQ} autoCorrect={false} containerStyle={{ marginBottom: 8 }} /> : null}
        {list.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              disabled={o.disabled}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(o.value); setOpen(false); }}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: on ? c.primarySoft : pressed ? c.surface2 : "transparent", opacity: o.disabled ? 0.4 : 1 })}
            >
              {o.left}
              {o.icon && !o.left ? <Icon name={o.icon} size={18} color={c.muted} /> : null}
              <View style={{ flex: 1 }}>
                <Text weight={on ? "bold" : "medium"} color={on ? c.primary : undefined}>{o.label}</Text>
                {o.sub ? <Text variant="xs" muted>{o.sub}</Text> : null}
              </View>
              {on ? <Icon name="bi-check-lg" size={18} color={c.primary} /> : null}
            </Pressable>
          );
        })}
        {list.length === 0 ? <Text muted center style={{ paddingVertical: 20 }}>No matches</Text> : null}
      </Sheet>
    </View>
  );
}

/* ---------------- Checkbox ---------------- */
export function Checkbox({ checked, onChange, label, error, children }: { checked: boolean; onChange: (v: boolean) => void; label?: string; error?: string | null; children?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(!checked); }} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 4 }}>
        <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: error ? c.danger : checked ? c.primary : c.border, backgroundColor: checked ? c.primary : c.surface, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
          {checked ? <Icon name="bi-check-lg" size={15} color="#fff" /> : null}
        </View>
        <View style={{ flex: 1 }}>{children ?? <Text variant="sm">{label}</Text>}</View>
      </Pressable>
      <FieldError error={error} />
    </View>
  );
}

/* ---------------- DateField (value = "YYYY-MM-DD") ---------------- */
export function DateField({ label, value, onChange, min, max, error, placeholder = "Select date", display = "long", containerStyle }: {
  label?: string; value: string; onChange: (v: string) => void; min?: string; max?: string; error?: string | null; placeholder?: string; display?: "long" | "iso"; containerStyle?: StyleProp<ViewStyle>;
}) {
  const { c, dark } = useTheme();
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<Date>(value ? new Date(parseDay(value)) : max ? new Date(parseDay(max)) : new Date());
  const pickerProps = {
    value: temp,
    mode: "date" as const,
    minimumDate: min ? new Date(parseDay(min)) : undefined,
    maximumDate: max ? new Date(parseDay(max)) : undefined,
  };
  return (
    <View style={containerStyle}>
      {label ? <FieldLabel label={label} /> : null}
      <Pressable
        onPress={() => { setTemp(value ? new Date(parseDay(value)) : max ? new Date(parseDay(max)) : min ? new Date(parseDay(min)) : new Date()); setOpen(true); }}
        style={{ minHeight: 50, borderRadius: radius.md + 2, borderWidth: 1.5, borderColor: error ? c.danger : c.border, backgroundColor: c.surface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        <Icon name="bi-calendar3" size={18} color={c.muted} />
        <Text weight="medium" muted={!value} style={{ flex: 1 }}>{value ? (display === "long" ? longDay(parseDay(value)) : value) : placeholder}</Text>
      </Pressable>
      <FieldError error={error} />
      {open && Platform.OS === "android" ? (
        <DateTimePicker
          {...pickerProps}
          onChange={(e, d) => { setOpen(false); if (e.type === "set" && d) onChange(isoDay(d)); }}
        />
      ) : null}
      {Platform.OS !== "android" ? (
        <Sheet visible={open} onClose={() => setOpen(false)} title={label || "Select date"}>
          <DateTimePicker {...pickerProps} display="inline" themeVariant={dark ? "dark" : "light"} accentColor={c.primary} onChange={(_, d) => d && setTemp(d)} style={{ alignSelf: "center" }} />
          <Button title="Done" full onPress={() => { onChange(isoDay(temp)); setOpen(false); }} style={{ marginTop: 8 }} />
        </Sheet>
      ) : null}
    </View>
  );
}

/* ---------------- Code boxes (OTP / PIN) ---------------- */
export type CodeInputHandle = { clear: () => void; shake: () => void; focus: () => void };
export const CodeInput = forwardRef<CodeInputHandle, { length?: number; value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; secret?: boolean; autoFocus?: boolean; error?: boolean }>(
  function CodeInput({ length = 6, value, onChange, onComplete, secret, autoFocus = true, error }, ref) {
    const { c } = useTheme();
    const input = useRef<TextInputRef>(null);
    const shakeA = useRef(new Animated.Value(0)).current;
    const [focused, setFocused] = useState(false);
    React.useImperativeHandle(ref, () => ({
      clear: () => onChange(""),
      focus: () => input.current?.focus(),
      shake: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        Animated.sequence([10, -10, 7, -7, 0].map((x) => Animated.timing(shakeA, { toValue: x, duration: 55, useNativeDriver: true }))).start();
      },
    }));
    useEffect(() => { if (autoFocus) setTimeout(() => input.current?.focus(), 250); }, [autoFocus]);
    return (
      <Pressable onPress={() => input.current?.focus()}>
        <Animated.View style={{ flexDirection: "row", justifyContent: "center", gap: length > 4 ? 8 : 14, transform: [{ translateX: shakeA }] }}>
          {Array.from({ length }).map((_, i) => {
            const ch = value[i];
            const active = focused && i === Math.min(value.length, length - 1);
            return (
              <View key={i} style={{ width: length > 4 ? 46 : 58, height: length > 4 ? 54 : 62, borderRadius: radius.lg, borderWidth: 1.5, borderColor: error ? c.danger : active ? c.primary : ch ? c.primary300 : c.border, backgroundColor: ch ? c.primarySoft : c.surface, alignItems: "center", justifyContent: "center" }}>
                {ch ? (secret ? <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: c.text }} /> : <Text variant="h2">{ch}</Text>) : null}
              </View>
            );
          })}
        </Animated.View>
        <TextInput
          ref={input}
          value={value}
          onChangeText={(t) => {
            const v = t.replace(/\D/g, "").slice(0, length);
            onChange(v);
            if (v.length === length) onComplete?.(v);
          }}
          onFocus={() => { setFocused(true); notifyInputFocus(); }}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={length}
          caretHidden
          style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
        />
      </Pressable>
    );
  }
);

/* ---------------- Numeric keypad (PIN entry) ---------------- */
export function Keypad({ onKey, onDelete, disabled }: { onKey: (d: string) => void; onDelete: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 6 }}>
      {keys.map((k, i) =>
        k === "" ? (
          <View key={i} style={{ width: "31%", height: 56 }} />
        ) : (
          <Pressable
            key={i}
            disabled={disabled}
            accessibilityLabel={k === "del" ? "Delete" : k}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); k === "del" ? onDelete() : onKey(k); }}
            style={({ pressed }) => ({ width: "31%", height: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.surface2 : "transparent" })}
          >
            {k === "del" ? <Icon name="ion:backspace-outline" size={24} color={c.text} /> : <Text variant="h2">{k}</Text>}
          </Pressable>
        )
      )}
    </View>
  );
}

/** PIN dots display (4 digits) */
export function PinDots({ value, length = 4, error }: { value: string; length?: number; error?: boolean }) {
  const { c } = useTheme();
  return (
    <Row gap={18} justify="center">
      {Array.from({ length }).map((_, i) => (
        <View key={i} style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: error ? c.danger : i < value.length ? c.primary : c.border, backgroundColor: i < value.length ? (error ? c.danger : c.primary) : "transparent" }} />
      ))}
    </Row>
  );
}
