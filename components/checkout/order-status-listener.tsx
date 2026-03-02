"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { medusaClient } from "@/lib/medusa";

export function OrderStatusListener({
  orderId,
  initialStatus,
  paymentId,
  paymentOrderId,
  signature,
}: {
  orderId: string;
  initialStatus: string;
  paymentId?: string;
  paymentOrderId?: string;
  signature?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    // 1. Idempotency Check
    if (status === "paid" || status === "confirmed_partial" || status === "completed")
      return;

    // 2. Active Verification (Auto-Reconciliation)
    if (paymentId && paymentOrderId && signature) {
      console.log("[StatusListener] Triggering Active Verification...");
      fetch("/api/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_order_id: paymentOrderId,
          razorpay_signature: signature,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.verified) {
            toast.success("Transmission Confirmed! Syncing state...");
            router.refresh();
            setStatus("paid");
          }
        })
        .catch((err) =>
          console.error("[StatusListener] Active verification failed:", err)
        );
    }

    // 3. Medusa Polling Fallback
    // Since we don't have Postgres Realtime in Medusa (without extra setup), 
    // we poll the store API for visibility.
    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount > 10) { // Limit polling
        clearInterval(interval);
        return;
      }

      try {
        const { order } = await medusaClient.store.order.retrieve(orderId);

        if (order?.status === "paid" || order?.status === "completed") {
          toast.success("Order Verified!");
          router.refresh();
          setStatus(order.status);
          clearInterval(interval);
        }
      } catch (e) {
        console.error("[StatusListener] Polling error:", e);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [
    orderId,
    status,
    router,
    paymentId,
    paymentOrderId,
    signature,
  ]);

  return null;
}
