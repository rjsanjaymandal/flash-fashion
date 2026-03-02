import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { medusaClient } from '@/lib/medusa'
import { toast } from 'sonner'

export interface CartItem {
  id?: string // UUID for Medusa line items
  variantId: string // Core Medusa requirement
  productId: string
  categoryId: string
  slug: string
  name: string
  price: number
  image: string | null
  size: string
  color: string
  fit: string
  quantity: number
  maxQuantity: number
}

interface CartState {
  cartId: string | null
  items: CartItem[]
  savedItems: CartItem[]
  isCartOpen: boolean
  isLoading: boolean
  isHydrated: boolean
  addItem: (item: CartItem, options?: { openCart?: boolean, showToast?: boolean }) => Promise<void>
  removeItem: (variantId: string) => Promise<void>
  updateQuantity: (variantId: string, quantity: number) => Promise<void>
  toggleSaveForLater: (variantId: string) => Promise<void>
  clearCart: () => Promise<void>
  syncWithUser: (userId: string) => Promise<void>
  setItems: (items: CartItem[]) => void
  setSavedItems: (items: CartItem[]) => void
  setIsCartOpen: (open: boolean) => void
  setIsLoading: (isLoading: boolean) => void
  setHasHydrated: (hydrated: boolean) => void
  loadingStates: Record<string, boolean>
  setLoadingState: (key: string, isLoading: boolean) => void
  initCart: () => Promise<string>
  refreshCart: () => Promise<void>
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: null,
      items: [],
      savedItems: [],
      isCartOpen: false,
      isLoading: false,
      isHydrated: false,
      loadingStates: {},
      setLoadingState: (key, isLoading) => set((state) => ({ loadingStates: { ...state.loadingStates, [key]: isLoading } })),
      setHasHydrated: (hydrated) => set({ isHydrated: hydrated }),

      initCart: async () => {
        let currentCartId = get().cartId
        if (currentCartId) return currentCartId

        try {
          const { cart } = await medusaClient.store.cart.create({
            region_id: undefined, // Let medusa handle defaults or add region logic if needed
          })
          set({ cartId: cart.id })
          return cart.id
        } catch (error) {
          console.error("Failed to create cart:", error)
          throw error
        }
      },

      refreshCart: async () => {
        const cartId = get().cartId
        if (!cartId) return

        try {
          const { cart } = await medusaClient.store.cart.retrieve(cartId, {
            fields: "*items,*items.variant"
          })

          const mappedItems: CartItem[] = cart.items?.map((item: any) => ({
            id: item.id,
            variantId: item.variant_id,
            productId: item.variant?.product_id || '',
            categoryId: '', // Medusa line items don't store category directly
            slug: item.variant?.product?.handle || '',
            name: item.title,
            price: item.unit_price,
            image: item.thumbnail,
            size: item.variant?.title || 'Standard',
            color: 'Standard', // Medusa doesn't have explicit color/fit in flat line items without metadata
            fit: 'Regular',
            quantity: item.quantity,
            maxQuantity: item.variant?.inventory_quantity || 10
          })) || []

          set({ items: mappedItems })
        } catch (error) {
          console.error("Failed to refresh cart:", error)
          // If 404, cart might be expired
          if ((error as any).status === 404) {
            set({ cartId: null, items: [] })
          }
        }
      },

      addItem: async (item, options = { openCart: true, showToast: true }) => {
        set({ isLoading: true })
        try {
          const cartId = await get().initCart()

          // Check if item already exists to update quantity instead
          const existingItem = get().items.find(i => i.variantId === item.variantId)

          if (existingItem && existingItem.id) {
            await medusaClient.store.cart.updateLineItem(cartId, existingItem.id, {
              quantity: existingItem.quantity + item.quantity
            })
          } else {
            await medusaClient.store.cart.createLineItem(cartId, {
              variant_id: item.variantId,
              quantity: item.quantity
            })
          }

          await get().refreshCart()

          if (options.showToast) toast.success("Added to cart")
          if (options.openCart) set({ isCartOpen: true })
        } catch (error) {
          console.error("Error adding to cart:", error)
          toast.error("Failed to add item to cart")
        } finally {
          set({ isLoading: false })
        }
      },

      removeItem: async (variantId) => {
        const item = get().items.find(i => i.variantId === variantId)
        if (!item || !item.id || !get().cartId) return

        set({ isLoading: true })
        try {
          await medusaClient.store.cart.deleteLineItem(get().cartId!, item.id)
          await get().refreshCart()
          toast.success("Removed from cart")
        } catch (error) {
          console.error("Error removing from cart:", error)
          toast.error("Failed to remove item")
        } finally {
          set({ isLoading: false })
        }
      },

      updateQuantity: async (variantId, quantity) => {
        const item = get().items.find(i => i.variantId === variantId)
        if (!item || !item.id || !get().cartId) return

        if (quantity <= 0) {
          return get().removeItem(variantId)
        }

        set({ isLoading: true })
        try {
          await medusaClient.store.cart.updateLineItem(get().cartId!, item.id, {
            quantity
          })
          await get().refreshCart()
        } catch (error) {
          console.error("Error updating quantity:", error)
          toast.error("Failed to update quantity")
        } finally {
          set({ isLoading: false })
        }
      },

      toggleSaveForLater: async (variantId) => {
        // Medusa doesn't have a native wishlist in the Cart API
        // We will keep this as a local state for now
        const { items, savedItems } = get()
        const itemInCart = items.find(i => i.variantId === variantId)
        const itemInSaved = savedItems.find(i => i.variantId === variantId)

        if (itemInCart) {
          await get().removeItem(variantId)
          set({
            savedItems: [...savedItems, itemInCart]
          })
          toast.success("Item saved for later")
        } else if (itemInSaved) {
          await get().addItem(itemInSaved)
          set({
            savedItems: savedItems.filter(i => i.variantId !== variantId)
          })
        }
      },

      clearCart: async () => {
        // Not easily possible via Medusa API to "clear" without deleting each item or the cart itself
        // Simplest is to nullify cartId and items locally
        set({ cartId: null, items: [] })
      },

      syncWithUser: async (userId: string) => {
        // When user logs in, we should ideally complete the cart or transfer it
        // Medusa handles this if we pass the auth cookie/token
        // For now, let's just refresh to see if there's an existing cart for the user
        await get().refreshCart()
      },

      setItems: (items) => set({ items }),
      setSavedItems: (savedItems) => set({ savedItems }),
      setIsCartOpen: (open) => set({ isCartOpen: open }),
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'flash-cart-storage',
      skipHydration: true,
      partialize: (state) => ({
        cartId: state.cartId,
        items: state.items,
        savedItems: state.savedItems
      }),
    }
  )
)

export const selectCartCount = (state: CartState) => state.items.reduce((acc, item) => acc + item.quantity, 0)
export const selectCartSubtotal = (state: CartState) => state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
export const selectShippingFee = (state: CartState) => {
  const subtotal = selectCartSubtotal(state)
  if (subtotal === 0) return 0
  return subtotal >= 699 ? 0 : 50
}
export const selectCartTotal = (state: CartState) => {
  return selectCartSubtotal(state) + selectShippingFee(state)
}
export const selectFreeShippingRemaining = (state: CartState) => {
  const subtotal = selectCartSubtotal(state)
  return Math.max(699 - subtotal, 0)
}
