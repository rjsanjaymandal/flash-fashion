"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FlashImage from "@/components/ui/flash-image";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { registerMedusa } from "@/app/actions/medusa-auth";

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await registerMedusa(formData);

    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      setIsRedirecting(true);
      toast.success("Identity initialized. Welcome to the network.");
      window.location.href = "/account";
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background overflow-hidden">
      {/* Left Side - Image (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 relative bg-black items-center justify-center overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent z-10" />
        <FlashImage
          src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=2000"
          alt="Fashion Registration"
          fill
          priority
          resizeMode="cover"
          className="object-cover object-center translate-x-10 scale-110 opacity-60"
        />
        <div className="absolute bottom-20 left-12 z-20 max-w-lg space-y-6">
          <div className="space-y-2">
            <span className="text-primary font-mono text-sm tracking-[0.3em] uppercase">
              Initialization
            </span>
            <h1 className="text-7xl font-black text-white leading-none tracking-tighter">
              NEW
              <br />
              IDENTITY.
            </h1>
          </div>
          <p className="text-white/60 text-lg font-light leading-relaxed max-w-md">
            Enter the protocol. Define your presence. <br />
            Secure your slot in the proprietary fashion node.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-md space-y-12 relative z-10">
          <div className="text-center space-y-4">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
              <span className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-primary via-purple-500 to-pink-500">
                FLASH
              </span>
            </Link>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight uppercase font-mono">
                Initialize Identity
              </h2>
              <p className="text-muted-foreground text-sm tracking-wide">
                Register your credentials on the Medusa protocol
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest pl-1">
                  First Assignment
                </label>
                <input
                  name="first_name"
                  type="text"
                  required
                  placeholder="First"
                  className="w-full bg-secondary/50 border-none h-14 px-4 font-mono text-sm focus:ring-1 ring-primary/50 outline-hidden transition-all placeholder:text-muted-foreground/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest pl-1">
                  Last Assignment
                </label>
                <input
                  name="last_name"
                  type="text"
                  placeholder="Last"
                  className="w-full bg-secondary/50 border-none h-14 px-4 font-mono text-sm focus:ring-1 ring-primary/50 outline-hidden transition-all placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest pl-1">
                  Node Identifier (Email)
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="u-node@flash.fashion"
                  className="w-full bg-secondary/50 border-none h-14 px-4 font-mono text-sm focus:ring-1 ring-primary/50 outline-hidden transition-all placeholder:text-muted-foreground/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest pl-1">
                  Secure Access Key
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-secondary/50 border-none h-14 px-4 font-mono text-sm focus:ring-1 ring-primary/50 outline-hidden transition-all placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-16 text-lg font-black uppercase tracking-tight bg-white text-black hover:bg-white/90 group relative overflow-hidden rounded-none shadow-2xl shadow-primary/10"
              disabled={isLoading}
            >
              <div className="flex items-center justify-center gap-4 relative z-10 font-mono">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <span>Initialize Node</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-all" />
                  </>
                )}
              </div>
            </Button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-xs text-muted-foreground">
              Existing node?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline">
                Execute Access
              </Link>
            </p>
          </div>

          <AnimatePresence>
            {isRedirecting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-background/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-6 text-center"
              >
                <div className="relative">
                  <div className="h-24 w-24 border-2 border-primary/20 rounded-full" />
                  <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
                </div>
                <h3 className="text-xl font-bold uppercase font-mono">Initializing</h3>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
