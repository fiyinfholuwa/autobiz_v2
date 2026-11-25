import { router } from "expo-router";
import { requireLogin, toast } from "@/components/overlay";
import { app } from "@/store";
import { MAX_CARDS } from "./constants";

/** Entry point for creating a card (login + 5-card cap). */
export function startCreate() {
  if (!requireLogin({ title: "Log in to get a USD card", message: "Create a free account or log in to create your virtual dollar card." })) return;
  if (app().cards.length >= MAX_CARDS) return toast("You can have up to 5 cards. Terminate one to create another.", "warning");
  router.push("/cards/create");
}
