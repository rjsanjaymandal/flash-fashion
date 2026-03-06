"use client";

import { useCartStore, selectCartTotal } from "@/store/use-cart-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  Ticket,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import Script from "next/script";
import { createOrder, validateCoupon } from "./actions";
import { getPincodeDetails } from "@/app/actions/get-pincode";
import { AddressSelector } from "@/components/checkout/address-selector";
import { Address } from "@/lib/services/address-service";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutSchema, CheckoutFormData } from "@/lib/validations/checkout";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import type { Route } from "next";
import NextImage from "next/image";
import imageLoader from "@/lib/image-loader";

declare global {
  interface RazorpayInstance {
    open: () => void;
  }
  interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayResponse) => Promise<void>;
    prefill: {
      name: string;
      email: string;
      contact: string;
    };
    theme: {
      color: string;
    };
    modal: {
      ondismiss: () => void;
    };
  }
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface VerifyPayload {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const cartTotal = useCartStore(selectCartTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const cartId = useCartStore((state) => state.cartId);

  // Script Load State
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const removeItem = useCartStore((state) => state.removeItem);
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: "percentage" | "fixed";
    value: number;
  } | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);

  // Partial COD State
  const [paymentMethod, setPaymentMethod] = useState<"PREPAID" | "PARTIAL_COD">(
    "PREPAID",
  );

  useEffect(() => {
    if (window.Razorpay) {
      setIsScriptLoaded(true);
    }
  }, []);

  // Form Setup
  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      email: "",
      phone: "",
    },
  });

  // Pre-fill email if logged in (Client Side Only)
  useEffect(() => {
    if (user?.email) {
      form.setValue("email", user.email);
    }
  }, [user, form]);

  // Calculations
  const discountAmount = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? (cartTotal * appliedCoupon.value) / 100
      : appliedCoupon.value
    : 0;

  // Smart Pincode Lookup
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const zipCode = form.watch("zip");

  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      if (error === "payment_failed")
        toast.error("Payment failed. Please try again.");
      else if (error === "invalid_signature")
        toast.error("Security check failed. Payment flagged.");
      else if (error === "order_not_found")
        toast.error("Order not found during verification.");
      else if (error === "db_error")
        toast.error(
          "Payment successful but failed to update order. Contact support.",
        );
      else if (error === "server_error")
        toast.error("Server error during verification. Contact support.");
      else toast.error("Payment verification failed. Please try again.");

      // Clear the param
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      router.replace(`${url.pathname}${url.search}` as Route);
    }
  }, [searchParams, router]);

  useEffect(() => {
    const fetchPincode = async () => {
      if (zipCode && zipCode.length === 6) {
        setIsPincodeLoading(true);
        try {
          // ensure we use the imported action
          const result = await getPincodeDetails(zipCode);

          if (result.success && result.city) {
            form.setValue("city", result.city, { shouldValidate: true });
            form.setValue("state", result.state || "", {
              shouldValidate: true,
            });
            form.setValue("country", result.country || "India", {
              shouldValidate: true,
            });
            toast.success(`Found ${result.city}, ${result.state}`);
          } else {
            toast.error("Could not find pincode details");
          }
        } catch (error) {
          console.error("Pincode lookup error:", error);
          toast.error("Error checking pincode");
        } finally {
          setIsPincodeLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(fetchPincode, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [zipCode, form]);

  // Shipping Logic
  const shippingFee = cartTotal >= 699 ? 0 : 50;

  const finalTotal = Math.max(0, cartTotal - discountAmount + shippingFee);

  // Address Selection Handler
  const handleAddressSelect = (
    addr: Address,
    options?: { silent?: boolean },
  ) => {
    form.setValue("firstName", addr.name.split(" ")[0]);
    form.setValue("lastName", addr.name.split(" ").slice(1).join(" "));
    form.setValue(
      "address",
      addr.address_line1 +
      (addr.address_line2 ? `, ${addr.address_line2}` : ""),
    );
    form.setValue("city", addr.city);
    form.setValue("state", addr.state);
    form.setValue("zip", addr.pincode);
    form.setValue("country", addr.country);
    form.setValue("phone", addr.phone);

    if (!options?.silent) {
      toast.success("Address applied", { id: "address-applied" });
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsCheckingCoupon(true);
    try {
      const result = await validateCoupon(couponCode, cartTotal);
      if (result.valid) {
        setAppliedCoupon({
          code: couponCode.toUpperCase(),
          type: result.discount_type! as "fixed" | "percentage",
          value: result.value!,
        });
        toast.success(`Coupon applied: ${result.message}`);
      } else {
        setAppliedCoupon({
          code: couponCode.toUpperCase(),
          type: result.discount_type! as "fixed" | "percentage",
          value: result.value!,
        });
        setAppliedCoupon(null);
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.info("Coupon removed");
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (!isScriptLoaded && !window.Razorpay) {
      toast.error("Payment system is still loading. Please wait a moment...");
      return;
    }

    setIsProcessing(true);

    try {
      toast.info("Preparing your order...");

      const sanitizedItems = items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        size: i.size,
        color: i.color,
        fit: i.fit,
        image: i.image,
        maxQuantity: i.maxQuantity,
        slug: i.slug,
        categoryId: i.categoryId,
      }));

      const order = await createOrder({
        cartId: cartId!,
        user_id: user?.id || null,
        subtotal: cartTotal,
        total: finalTotal,
        shipping_name: `${data.firstName} ${data.lastName}`,
        phone: data.phone,
        address_line1: data.address,
        city: data.city,
        state: data.state,
        pincode: data.zip,
        country: data.country,
        payment_provider: "razorpay",
        payment_reference: "",
        items: sanitizedItems,
        coupon_code: appliedCoupon?.code,
        discount_amount: discountAmount,
        email: data.email,
      });

      const response = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          isPartialCod: paymentMethod === "PARTIAL_COD",
        }),
      });
      const rzpOrder = await response.json();

      if (!response.ok)
        throw new Error(rzpOrder.error || "Failed to create Razorpay order");

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!keyId) {
        throw new Error("Razorpay Key ID is missing. Please contact support.");
      }

      const options: RazorpayOptions = {
        key: keyId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "Flash Ecommerce",
        description: "Order Payment",
        order_id: rzpOrder.id,
        handler: async function (paymentResponse: RazorpayResponse) {
          const verifyPaymentWithRetry = async (
            payload: VerifyPayload,
            retries = 3,
            delay = 1000,
          ): Promise<{ verified: boolean; error?: string }> => {
            try {
              const res = await fetch("/api/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });

              if (res.status >= 500)
                throw new Error(`Server Error: ${res.status}`);

              return await res.json();
            } catch (err) {
              if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, delay));
                return verifyPaymentWithRetry(payload, retries - 1, delay * 2);
              }
              throw err;
            }
          };

          try {
            const verifyData = await verifyPaymentWithRetry({
              order_id: order.id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });

            if (verifyData.verified) {
              clearCart();
              toast.success("Payment Successful! Redirecting...");
              router.push(`/order/confirmation/${order.id}`);
            } else {
              toast.error(
                verifyData.error ||
                "Payment verification failed. Security Check.",
              );
            }
          } catch (netErr) {
            console.error("Verification Network Delay/Failure:", netErr);
            clearCart();
            toast.info("Processing your transmission in background...");

            const params = new URLSearchParams({
              pid: paymentResponse.razorpay_payment_id,
              poid: paymentResponse.razorpay_order_id,
              psig: paymentResponse.razorpay_signature,
            });

            router.push(`/order/confirmation/${order.id}?${params.toString()}`);
          }
        },
        prefill: {
          name: `${data.firstName} ${data.lastName}`,
          email: user?.email || data.email || "guest@example.com",
          contact: data.phone,
        },
        theme: {
          color: "#000000",
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay SDK failed to load. Please check your internet connection.",
        );
      }

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } catch (err: unknown) {
      console.error("FATAL Checkout Error:", err);
      const normalizedMessage =
        err instanceof Error ? err.message : String(err);

      const detailedError = {
        message: normalizedMessage,
        digest:
          typeof err === "object" && err !== null && "digest" in err
            ? String((err as { digest?: string }).digest || "")
            : undefined,
      };

      toast.error(`Checkout failure: ${detailedError.message}`, {
        description: detailedError.digest
          ? `Error ID: ${detailedError.digest}`
          : "Please check your network and try again.",
      });

      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-32 text-center relative flex flex-col items-center justify-center">
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-serif tracking-tight">Your shopping bag is empty</h2>
          <Button
            asChild
            variant="default"
            size="lg"
            className="rounded-none px-8 text-xs uppercase tracking-[0.2em] font-medium"
          >
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 container mx-auto px-4 max-w-6xl relative">
      <div className="mb-12 text-center md:text-left border-b border-border/40 pb-6">
        <h1 className="text-3xl md:text-4xl font-serif text-foreground">
          Checkout
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start relative z-10">

        {/* Left Column: Forms */}
        <div className="col-span-1 lg:col-span-7 space-y-10 order-2 lg:order-1">
          {/* Saved Addresses */}
          {user && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-foreground">
                Saved Addresses
              </h2>
              <div className="bg-muted/30 p-4 border border-border/50">
                <AddressSelector onSelect={handleAddressSelect} />
              </div>
            </section>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              {/* Shipping Details */}
              <section className="space-y-6">
                <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-foreground border-b border-border/40 pb-2">
                  1. Shipping Information
                </h2>

                <div className="grid grid-cols-1 gap-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="you@example.com"
                            {...field}
                            className="h-12 rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 transition-colors"
                            disabled={!!user?.email}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          First Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-12 rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Last Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-12 rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-12 rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          City
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-12 rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          State
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-12 rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Postal Code
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              className="h-12 rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 transition-colors pr-10"
                            />
                            {isPincodeLoading && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Country
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-12 rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+91"
                          {...field}
                          className="h-12 rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              {/* Payment Section */}
              <section className="space-y-6">
                <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-foreground border-b border-border/40 pb-2">
                  2. Payment Method
                </h2>

                <div className="grid grid-cols-1 gap-4">
                  {/* Prepaid Option */}
                  <label
                    className={cn(
                      "flex items-center gap-4 p-4 border transition-colors cursor-pointer",
                      paymentMethod === "PREPAID"
                        ? "border-foreground bg-muted/10"
                        : "border-border hover:border-foreground/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      className="hidden"
                      checked={paymentMethod === "PREPAID"}
                      onChange={() => setPaymentMethod("PREPAID")}
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          Pay Full Amount Online
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Secure payment via Razorpay
                        </p>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center",
                        paymentMethod === "PREPAID" ? "border-foreground" : "border-border"
                      )}>
                        {paymentMethod === "PREPAID" && (
                          <div className="w-2 h-2 rounded-full bg-foreground" />
                        )}
                      </div>
                    </div>
                  </label>

                  {/* Partial COD Option */}
                  <label
                    className={cn(
                      "flex items-center gap-4 p-4 border transition-colors cursor-pointer relative",
                      paymentMethod === "PARTIAL_COD"
                        ? "border-foreground bg-muted/10"
                        : "border-border hover:border-foreground/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      className="hidden"
                      checked={paymentMethod === "PARTIAL_COD"}
                      onChange={() => setPaymentMethod("PARTIAL_COD")}
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground">
                            Partial Cash on Delivery
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Pay ₹100 now, remaining {formatCurrency(finalTotal - 100)} on delivery.
                        </p>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center",
                        paymentMethod === "PARTIAL_COD" ? "border-foreground" : "border-border"
                      )}>
                        {paymentMethod === "PARTIAL_COD" && (
                          <div className="w-2 h-2 rounded-full bg-foreground" />
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              </section>

              <div className="pt-8">
                <Button
                  type="submit"
                  disabled={isProcessing}
                  size="lg"
                  className="w-full rounded-none h-14 text-xs font-medium uppercase tracking-[0.2em]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Place Order • {formatCurrency(paymentMethod === "PARTIAL_COD" ? 100 : finalTotal)}
                    </>
                  )}
                </Button>
                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground uppercase tracking-widest">
                  <Lock className="w-3 h-3" /> Secure Encrypted Checkout
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* Right Column: Order Summary */}
        <div className="col-span-1 lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-32 space-y-8">
          <div className="bg-muted/30 p-6 md:p-8 space-y-6 border border-border/50">
            <h2 className="font-serif text-xl text-foreground pb-4 border-b border-border/50">
              Order Summary
            </h2>

            <div className="space-y-6 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.size}`}
                  className="flex gap-4 items-start"
                >
                  <div className="relative h-[80px] w-[64px] bg-muted shrink-0">
                    {item.image && (
                      <NextImage
                        src={item.image}
                        layout="fill"
                        objectFit="cover"
                        loader={imageLoader}
                        alt={item.name}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                    <div>
                      <p className="font-serif text-sm text-foreground leading-tight">
                        {item.name}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {item.size} / {item.color}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      <p className="font-medium text-sm text-foreground">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-px w-full bg-border/50 my-6" />

            {/* Coupon Section */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Promo Code"
                className="rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 uppercase placeholder:normal-case h-10 text-xs"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={!!appliedCoupon}
              />
              {appliedCoupon ? (
                <Button
                  variant="outline"
                  onClick={removeCoupon}
                  className="rounded-none h-10 text-xs px-4"
                >
                  Remove
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={handleApplyCoupon}
                  disabled={isCheckingCoupon || !couponCode}
                  className="rounded-none h-10 text-xs px-6"
                >
                  {isCheckingCoupon ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-3 pt-4 text-sm">
              {appliedCoupon && (
                <div className="flex justify-between text-foreground">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>
                  {shippingFee === 0 ? "Complimentary" : formatCurrency(shippingFee)}
                </span>
              </div>

              <div className="flex justify-between font-medium text-lg pt-4 border-t border-border/50 mt-4 text-foreground">
                <span>Total</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>

              {/* Partial COD Breakdown */}
              <AnimatePresence>
                {paymentMethod === "PARTIAL_COD" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-4 overflow-hidden"
                  >
                    <div className="bg-muted p-4 space-y-2 text-xs">
                      <div className="flex justify-between text-foreground">
                        <span>Pay Online Now</span>
                        <span className="font-medium">{formatCurrency(100)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>To Pay on Delivery</span>
                        <span>{formatCurrency(finalTotal - 100)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <Script
          id="razorpay-checkout-js"
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
          onLoad={() => {
            console.log("Razorpay script loaded via onLoad");
            setIsScriptLoaded(true);
          }}
        />
      </div>
    </div>
  );
}
