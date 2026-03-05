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

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em]">
              <span className="bg-background px-4 text-muted-foreground font-mono">Or</span>
            </div>
          </div>

          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full h-14 font-mono text-sm uppercase tracking-wide rounded-none border-border/60 hover:bg-secondary/80 hover:border-primary/30 transition-all group"
            onClick={() => {
              const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000";
              window.location.href = `${backendUrl}/auth/customer/google`;
            }}
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

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
