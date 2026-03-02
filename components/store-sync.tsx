"use client"

import { useEffect } from "react"
import { useCartStore } from "@/store/use-cart-store"

/**
 * StoreSync Component
 * Handles cross-application state synchronization and initialization
 */
export default function StoreSync() {
  const { initCart } = useCartStore()

  useEffect(() => {
    // Initialize Medusa Cart
    initCart()
  }, [initCart])

  return null
}
