"use client";

import { AuthProvider } from "@/context/auth-context";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import StoreSync from "@/components/store-sync";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";

export function Providers({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: any | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              if (error?.status === 404 || error?.status === 401) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider initialUser={initialUser}>
          <TooltipProvider>
            <StoreSync />
            {children}
            <Toaster position="top-center" richColors />
            <CartDrawer />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
