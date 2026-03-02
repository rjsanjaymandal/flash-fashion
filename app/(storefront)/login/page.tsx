"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import FlashImage from "@/components/ui/flash-image";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { loginMedusa } from "@/app/actions/medusa-auth";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Get redirect URL
  const next = searchParams.get("next") || "/";

  // Check auth state
  useEffect(() => {
    if (user) {
      router.replace(next as any);
    }
  }, [user, router, next]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginMedusa(formData);

    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      setIsRedirecting(true);
      toast.success("Identity verified. Accessing node...");
      // Re-initialize auth state via refresh or router
      window.location.href = next;
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background overflow-hidden">
      {/* Left Side - Image (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 relative bg-black items-center justify-center overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent z-10" />
        <FlashImage
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2000"
          alt="Fashion Editorial"
          fill
          priority
          resizeMode="cover"
          className="object-cover object-center translate-x-10 scale-110 opacity-60"
        />
        <div className="absolute bottom-20 left-12 z-20 max-w-lg space-y-6">
          <div className="space-y-2">
            <span className="text-primary font-mono text-sm tracking-[0.3em] uppercase">
              Est. 2026
            </span>
            <h1 className="text-7xl font-black text-white leading-none tracking-tighter">
              ACCESS
              <br />
              GRANTED.
            </h1>
          </div>
          <p className="text-white/60 text-lg font-light leading-relaxed max-w-md">
            Identify as you. Shop as you. Be you. <br />
            Experience industrial-grade fashion authentication.
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
                System Authentication
              </h2>
              <p className="text-muted-foreground text-sm tracking-wide">
                Please enter your credentials to access the network
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  Access Key (Password)
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
                    <span>Execute Access</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-all" />
                  </>
                )}
              </div>
            </Button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-xs text-muted-foreground">
              New node?{" "}
              <Link href="/signup" className="text-primary font-bold hover:underline">
                Initialize Identity
              </Link>
            </p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-loose max-w-xs mx-auto opacity-60">
              You are entering the FLASH proprietary network. By continuing,
              you agree to our centralized protocol terms.
            </p>
          </div>

          {/* Redirect Overlay */}
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
                <div className="space-y-2">
                  <h3 className="text-xl font-bold uppercase font-mono tracking-tighter">
                    Accessing
                  </h3>
                  <p className="text-muted-foreground text-sm font-mono animate-pulse">
                    Syncing neural session with Medusa core...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
