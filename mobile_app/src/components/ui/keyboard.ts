/* Keyboard handling shared by Screen, Sheet and the auth layout.
   - Android runs edge-to-edge (SDK 54+), so the window no longer resizes for the keyboard:
     KeyboardAvoidingView must use "padding" on BOTH platforms.
   - useKeyboardAwareScroll scrolls the focused input into view above the keyboard,
     both when the keyboard opens and when focus moves to another field. */
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, ScrollView, TextInput, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

export const KAV_BEHAVIOR = "padding" as const;
const MARGIN = 28;

/* focus bus: TextField/CodeInput call notifyInputFocus() so open scroll views re-check */
const listeners = new Set<() => void>();
export function notifyInputFocus() {
  listeners.forEach((fn) => fn());
}

type ScrollRef = React.ComponentRef<typeof ScrollView>;

export function useKeyboardAwareScroll() {
  const ref = useRef<ScrollRef>(null);
  const offset = useRef(0);
  const height = useRef(0);
  const kbOpen = useRef(false);

  const adjust = useCallback(() => {
    const sv = ref.current as any;
    const input = (TextInput.State as any)?.currentlyFocusedInput?.();
    if (!sv || !input || !kbOpen.current) return;
    const inner = sv.getInnerViewRef?.() ?? sv.getInnerViewNode?.();
    if (!inner || typeof input.measureLayout !== "function") return;
    try {
      input.measureLayout(
        inner,
        (_x: number, y: number, _w: number, h: number) => {
          const visTop = offset.current;
          const visBottom = offset.current + height.current;
          if (y + h + MARGIN > visBottom) sv.scrollTo({ y: Math.max(0, y + h + MARGIN - height.current), animated: true });
          else if (y - MARGIN < visTop) sv.scrollTo({ y: Math.max(0, y - MARGIN), animated: true });
        },
        () => {} // input is not inside this scroll view (e.g. it's in a sheet above) — ignore
      );
    } catch {
      /* measuring can fail during unmount — ignore */
    }
  }, []);

  useEffect(() => {
    // wait for KeyboardAvoidingView to re-layout before measuring
    const later = () => setTimeout(adjust, 120);
    const show = Keyboard.addListener("keyboardDidShow", () => { kbOpen.current = true; later(); });
    const hide = Keyboard.addListener("keyboardDidHide", () => { kbOpen.current = false; });
    const onFocus = () => { if (kbOpen.current) later(); };
    listeners.add(onFocus);
    return () => { show.remove(); hide.remove(); listeners.delete(onFocus); };
  }, [adjust]);

  return {
    ref,
    scrollProps: {
      scrollEventThrottle: 16,
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => { offset.current = e.nativeEvent.contentOffset.y; },
      onLayout: (e: LayoutChangeEvent) => { height.current = e.nativeEvent.layout.height; },
      keyboardShouldPersistTaps: "handled" as const,
      keyboardDismissMode: "interactive" as const,
    },
  };
}

/** Current keyboard height (0 when hidden). */
export function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const a = Keyboard.addListener("keyboardDidShow", (e) => setH(e.endCoordinates.height));
    const b = Keyboard.addListener("keyboardDidHide", () => setH(0));
    return () => { a.remove(); b.remove(); };
  }, []);
  return h;
}

/** Merge an internal ref with an optional external one. */
export function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (v: T | null) => {
    for (const r of refs) {
      if (!r) continue;
      if (typeof r === "function") r(v);
      else (r as React.RefObject<T | null>).current = v;
    }
  };
}
