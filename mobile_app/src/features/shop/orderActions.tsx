import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { success, toast } from "@/components/overlay";
import { Button, IconTile, Row, Select, Sheet, Text, RichText } from "@/components/ui";
import { naira } from "@/lib/format";
import { sleep } from "@/lib/random";
import { app, type Order } from "@/store";
import { canCancel } from "./logic";

const REASONS = ["Changed my mind", "Ordered by mistake", "Found a better price", "Delivery takes too long", "Other"];

export function CancelOrderSheet({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Order | null>(order);
  useEffect(() => { if (order) { setLast(order); setReason(""); setErr(null); setBusy(false); } }, [order]);
  const o = order || last;

  const confirm = async () => {
    if (!o) return;
    if (!reason) return setErr("Please select a reason.");
    setBusy(true);
    await sleep(900);
    const s = app();
    const cur = s.orders.find((x) => x.id === o.id);
    if (!cur || !canCancel(cur)) { setBusy(false); onClose(); return toast("This order can no longer be cancelled", "warning"); }
    let refundTx = null;
    if (cur.payment === "wallet" && cur.paid)
      refundTx = s.credit(cur.total, { type: "refund", title: "Order Refund", subtitle: `${cur.id} · cancelled`, icon: "bi-arrow-counterclockwise", tone: "success" });
    s.update("orders", (list) =>
      list.map((x) =>
        x.id !== cur.id ? x : {
          ...x, status: "cancelled", cancelReason: reason, refunded: !!refundTx, paid: false, refundTxId: refundTx?.id,
          timeline: [...x.timeline.filter((t) => t.done), { key: "cancelled", label: "Order cancelled", note: reason + (refundTx ? " · refunded to wallet" : ""), done: true, date: Date.now() }],
        }
      )
    );
    s.notify({ icon: "bi-x-circle", tone: "danger", title: `Order ${cur.id} cancelled`, body: refundTx ? `${naira(cur.total)} refunded to your wallet.` : "Your order has been cancelled." });
    setBusy(false);
    onClose();
    const rows: [string, string][] = [["Order", cur.id], ["Reason", reason]];
    if (refundTx) rows.push(["New balance", naira(app().wallet.balance, 2)]);
    setTimeout(() => success({ title: "Order cancelled", message: refundTx ? `${naira(cur.total, 2)} has been refunded to your wallet.` : "Your order was cancelled. No charge was made.", rows }), 300);
  };

  return (
    <Sheet
      visible={!!order}
      onClose={onClose}
      locked={busy}
      footer={
        <Row gap={10}>
          <Button title="Keep order" variant="outline" style={{ flex: 1 }} disabled={busy} onPress={onClose} />
          <Button title="Cancel order" variant="danger" style={{ flex: 1 }} loading={busy} loadingText="Cancelling…" onPress={confirm} />
        </Row>
      }
    >
      {o ? (
        <View style={{ alignItems: "center" }}>
          <IconTile icon="bi-x-circle" tone="danger" size={64} rounded />
          <Text variant="h2" center style={{ marginTop: 12 }}>Cancel order {o.id}?</Text>
          <RichText
            variant="sm" muted center style={{ marginTop: 6 }}
            text={o.payment === "wallet" && o.paid ? `**${naira(o.total)}** will be refunded to your AutoBiz wallet instantly.` : "You haven't been charged for this pay-on-delivery order."}
          />
          <Select
            containerStyle={{ alignSelf: "stretch", marginTop: 16 }}
            label="Reason for cancelling"
            value={reason}
            onChange={(v) => { setReason(v); setErr(null); }}
            error={err}
            placeholder="Select a reason"
            options={REASONS.map((r) => ({ value: r, label: r }))}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

export function markReceived(o: Order) {
  const s = app();
  s.update("orders", (list) =>
    list.map((x) => (x.id !== o.id ? x : { ...x, status: "delivered", paid: true, timeline: x.timeline.map((t) => (t.done ? t : { ...t, done: true, date: Date.now() })) }))
  );
  s.notify({ icon: "bi-check2-circle", tone: "success", title: `Order ${o.id} delivered`, body: "Thanks for shopping on AutoBiz!" });
  toast("Marked as delivered. Enjoy your purchase!", "success");
}
