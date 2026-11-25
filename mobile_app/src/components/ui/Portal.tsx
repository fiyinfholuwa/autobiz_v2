/* Minimal portal: content is rendered by <PortalHost/> at the app root, above all screens. */
import React, { useEffect, useId } from "react";
import { create } from "zustand";

type Entry = { key: string; node: React.ReactNode; order: number };
type PortalState = { entries: Record<string, Entry>; mount: (key: string, node: React.ReactNode) => void; unmount: (key: string) => void };

let counter = 0;
export const usePortalStore = create<PortalState>((set) => ({
  entries: {},
  mount: (key, node) =>
    set((s) => ({ entries: { ...s.entries, [key]: { key, node, order: s.entries[key]?.order ?? ++counter } } })),
  unmount: (key) =>
    set((s) => {
      const e = { ...s.entries };
      delete e[key];
      return { entries: e };
    }),
}));

export function Portal({ children }: { children: React.ReactNode }) {
  const key = useId();
  const mount = usePortalStore((s) => s.mount);
  const unmount = usePortalStore((s) => s.unmount);
  useEffect(() => {
    mount(key, children);
  });
  useEffect(() => () => unmount(key), [key, unmount]);
  return null;
}

export function PortalHost() {
  const entries = usePortalStore((s) => s.entries);
  const list = Object.values(entries).sort((a, b) => a.order - b.order);
  return <>{list.map((e) => <React.Fragment key={e.key}>{e.node}</React.Fragment>)}</>;
}

/** Imperatively-managed stack of back-press handlers (topmost sheet closes first). */
const backStack: (() => void)[] = [];
export const backHandlers = {
  push: (fn: () => void) => { backStack.push(fn); return () => { const i = backStack.lastIndexOf(fn); if (i > -1) backStack.splice(i, 1); }; },
  top: () => backStack[backStack.length - 1],
};
