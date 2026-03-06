"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/components/account/profile-tab";
import { OrdersTab } from "@/components/account/orders-tab";
import { AddressTab } from "@/components/account/address-tab";
import { LoyaltyCard } from "@/components/account/loyalty-card";
import { SignOutButton } from "@/components/account/sign-out-button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { WaitlistTab } from "@/components/account/waitlist-tab";
import { Product } from "@/lib/services/product-service";
import { PushOptIn } from "@/components/storefront/push-opt-in";

interface AccountClientProps {
  user: { email: string; id: string };
  profile: {
    name: string;
    role: string;
    loyalty_points: number;
    pronouns: string | null;
    fit_preference: any;
    created_at: string;
  };
  orders: {
    id: string;
    total: number;
    status: string;
    created_at: string;
  }[];
  addresses: {
    id: string;
    name: string;
    phone: string;
    city: string;
    state: string;
    address_line1: string;
    address_line2?: string | null;
    pincode: string;
    country: string;
    is_default: boolean;
  }[];
  waitlist: Product[];
}

export function AccountClient({
  user,
  profile,
  orders,
  addresses,
  waitlist,
}: AccountClientProps) {
  const [mounted, setMounted] = useState(false);
  const defaultAddress = addresses.find((a) => a.is_default);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-20 min-h-screen max-w-6xl">

      {/* Clean Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 border-b border-border/40 pb-10">
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-medium">
            Account Dashboard
          </p>
          <h1 className="text-3xl md:text-5xl font-serif text-foreground">
            Welcome, {profile?.name?.split(" ")[0] || user.email?.split("@")[0]}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="rounded-none border-border text-foreground hover:bg-muted text-xs uppercase tracking-widest h-12 px-8"
            asChild
          >
            <Link href="/shop">Shop</Link>
          </Button>
          <SignOutButton />
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs
        defaultValue="overview"
        className="space-y-8 animate-in fade-in duration-700"
      >
        <div className="flex justify-start overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide border-b border-border/30">
          <TabsList className="bg-transparent p-0 inline-flex h-auto gap-8">
            <TabsTrigger
              value="overview"
              className="rounded-none px-0 py-2 bg-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground transition-all text-[11px] font-medium uppercase tracking-[0.2em] data-[state=active]:shadow-none"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="rounded-none px-0 py-2 bg-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground transition-all text-[11px] font-medium uppercase tracking-[0.2em] data-[state=active]:shadow-none"
            >
              Order History
            </TabsTrigger>
            <TabsTrigger
              value="addresses"
              className="rounded-none px-0 py-2 bg-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground transition-all text-[11px] font-medium uppercase tracking-[0.2em] data-[state=active]:shadow-none"
            >
              Addresses
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="rounded-none px-0 py-2 bg-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground transition-all text-[11px] font-medium uppercase tracking-[0.2em] data-[state=active]:shadow-none"
            >
              Profile Settings
            </TabsTrigger>
            <TabsTrigger
              value="waitlist"
              className="rounded-none px-0 py-2 bg-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground transition-all text-[11px] font-medium uppercase tracking-[0.2em] data-[state=active]:shadow-none"
            >
              Waitlist
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="overview"
          className="space-y-12 animate-in fade-in duration-500 focus-visible:outline-none pt-4"
        >
          {/* Minimal Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/40 border border-border/40">
            <div className="bg-background p-6 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Orders</p>
              <p className="text-3xl font-serif text-foreground">{orders.length}</p>
            </div>
            <div className="bg-background p-6 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Flash Points</p>
              <p className="text-3xl font-serif text-foreground">{profile?.loyalty_points || 0}</p>
            </div>
            <div className="bg-background p-6 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Waitlisted Items</p>
              <p className="text-3xl font-serif text-foreground">{waitlist.length}</p>
            </div>
            <div className="bg-background p-6 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tier Status</p>
              <p className="text-2xl font-serif text-foreground mt-1">Silver</p>
            </div>
          </div>

          <div className="grid gap-12 lg:grid-cols-12 items-start opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-forwards">
            <div className="lg:col-span-4 space-y-8">
              <PushOptIn />

              {/* Default Address */}
              <div className="bg-muted/20 p-6 border border-border/50">
                <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
                  <h3 className="font-serif text-lg text-foreground">
                    Primary Address
                  </h3>
                </div>
                {defaultAddress ? (
                  <div className="text-sm text-foreground/80 space-y-1.5 font-light">
                    <p className="font-medium text-foreground">{defaultAddress.name}</p>
                    <p>{defaultAddress.address_line1}</p>
                    {defaultAddress.address_line2 && <p>{defaultAddress.address_line2}</p>}
                    <p>
                      {defaultAddress.city}, {defaultAddress.state} {defaultAddress.pincode}
                    </p>
                    <p>{defaultAddress.country}</p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground mb-4">
                      No default address saved.
                    </p>
                    <Button
                      variant="outline"
                      className="rounded-none text-xs uppercase tracking-widest"
                      onClick={() =>
                        (document.querySelector('[value="addresses"]') as HTMLElement)?.click()
                      }
                    >
                      Add Address
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Orders History */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <h2 className="text-xl font-serif text-foreground">
                  Recent Orders
                </h2>
                <Button
                  variant="link"
                  asChild
                  className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground p-0 h-auto"
                >
                  <Link href="/account/orders">View All</Link>
                </Button>
              </div>
              <div className="bg-background border border-border/50">
                <OrdersTab orders={orders.slice(0, 3)} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="focus-visible:outline-none pt-4">
          <div className="space-y-6">
            <h2 className="text-xl font-serif text-foreground border-b border-border/40 pb-4">
              All Orders
            </h2>
            <div className="bg-background border border-border/50">
              <OrdersTab orders={orders} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="addresses" className="focus-visible:outline-none pt-4">
          <div className="space-y-6">
            <h2 className="text-xl font-serif text-foreground border-b border-border/40 pb-4">
              Saved Addresses
            </h2>
            <AddressTab addresses={addresses} />
          </div>
        </TabsContent>

        <TabsContent value="profile" className="focus-visible:outline-none pt-4">
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-xl font-serif text-foreground border-b border-border/40 pb-4">
              Profile Details
            </h2>
            <ProfileTab user={user} profile={profile} />
          </div>
        </TabsContent>

        <TabsContent value="waitlist" className="focus-visible:outline-none pt-4">
          <div className="space-y-6">
            <h2 className="text-xl font-serif text-foreground border-b border-border/40 pb-4">
              Waitlisted Items
            </h2>
            <WaitlistTab products={waitlist} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
