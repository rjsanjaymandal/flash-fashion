"use client"

import { useEffect } from "react"
import { useCartStore } from "@/store/use-cart-store"

/**
 * StoreSync Component
 * Handles cross-application state synchronization and initialization
 */
export default function StoreSync() {
  const { initializeCart } = useCartStore()

  useEffect(() => {
    // Initialize Medusa Cart
    initializeCart()
  }, [initializeCart])

  return null
}
