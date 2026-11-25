import { Redirect, usePathname } from "expo-router";
import React from "react";
import { useApp } from "@/store";

/** Wrap members-only screens. Guests are sent to /login and returned here afterwards. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const authed = useApp((s) => s.auth.authed);
  const path = usePathname();
  if (!authed) return <Redirect href={{ pathname: "/login", params: { next: path } }} />;
  return <>{children}</>;
}

/** Hook variant */
export const useAuthed = () => useApp((s) => s.auth.authed);
