"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useCartStore } from "@/store/use-cart-store";
import { useWishlistStore } from "@/store/use-wishlist-store";
import { toast } from "sonner";
import { logoutMedusa, getMedusaSession } from "@/app/actions/medusa-auth";

interface AuthContextType {
  user: any | null; // Medusa Customer
  profile: any | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: any | null;
}) {
  const [user, setUser] = useState<any | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);

  useEffect(() => {
    console.log("AuthProvider initializing...");
    const initializeAuth = async () => {
      try {
        if (!initialUser) {
          const customer = await getMedusaSession();
          console.log("Medusa session fetched:", customer ? "User found" : "No user");
          setUser(customer);
          if (customer) {
            useCartStore.getState().setItems([]); // Clear local temporary items
            // Ideally we should sync cart here if needed
          }
        }
      } catch (error) {
        console.error("Medusa Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [initialUser]);

  const signOut = async () => {
    try {
      setUser(null);
      useCartStore.getState().setItems([]);
      useWishlistStore.getState().setItems([]);

      localStorage.removeItem("flash-cart-storage");
      localStorage.removeItem("flash-wishlist-storage");

      await logoutMedusa();
      toast.success("Signed out successfully");

      // Reload to clear server-side state
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      window.location.href = "/";
    }
  };

  const value = {
    user,
    isLoading,
    isAdmin: user?.metadata?.role === "admin",
    signOut,
    profile: user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
