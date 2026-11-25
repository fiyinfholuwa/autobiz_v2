import { Redirect } from "expo-router";
import { useApp } from "@/store";

/** Entry: first launch → onboarding; otherwise the tabs (guests can browse, payments ask to log in). */
export default function Index() {
  const onboarded = useApp((s) => s.auth.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
