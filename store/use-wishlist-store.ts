import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'

export interface WishlistItem {
  id?: string
  productId: string
  name: string
  price: number
  image: string | null
  slug: string
}

interface WishlistState {
  items: WishlistItem[]
  addItem: (item: WishlistItem) => void
  removeItem: (productId: string) => void
  setItems: (items: WishlistItem[]) => void
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const { items } = get()
        if (items.some((i) => i.productId === item.productId)) {
          toast.info("Already in wishlist")
          return
        }

        set({ items: [...items, item] })
        toast.success("Added to Wishlist")
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }))
        toast.info("Removed from Wishlist")
      },
      setItems: (items) => set({ items }),
    }),
    {
      name: 'flash-wishlist-storage',
      skipHydration: true,
    }
  )
)

export const selectIsInWishlist = (state: WishlistState, productId: string) =>
  state.items.some((i) => i.productId === productId)
