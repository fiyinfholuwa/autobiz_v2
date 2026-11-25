import { copy, receiptText, success } from "@/components/overlay";
import type { SummaryRow } from "@/components/ui";
import { datetime } from "@/lib/format";
import type { Tx } from "@/store";

/** Wallet receipt (web: mkReceipt) — appends Reference + Date, single "Copy receipt" action. */
export function walletReceipt(title: string, message: string, rows: SummaryRow[], tx: Tx) {
  const all: SummaryRow[] = [...rows, ["Reference", tx.ref || tx.id], ["Date", datetime(tx.date)]];
  success({
    title,
    message,
    rows: all,
    actions: [{ label: "Copy receipt", icon: "bi-copy", keepOpen: true, onPress: () => copy(receiptText(title, all), "Receipt copied") }],
  });
}
