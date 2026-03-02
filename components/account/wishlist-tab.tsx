'use client'

import { useWishlistStore } from "@/store/use-wishlist-store"
import { ProductCard } from "@/components/storefront/product-card"
import { Heart, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useEffect, useState } from "react"
import { getWishlist } from "@/lib/services/wishlist-service"

export function WishlistTab() {
    const { items, setItems } = useWishlistStore()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchWishlist() {
            try {
                const data = await getWishlist()
                if (data && data.items) {
                    const mappedItems = data.items.map((i: any) => {
                        const product = i.product || {}
                        return {
                            productId: i.product_id,
                            name: product.title || "Unknown Product",
                            price: product.variants?.[0]?.calculated_price?.calculated_amount || 0,
                            image: product.thumbnail || "",
                            slug: product.handle || ""
                        }
                    })
                    // Merge or replace items locally
                    // For simplicity, replacing with server truth
                    if (mappedItems.length > 0) {
                        setItems(mappedItems)
                    }
                }
            } catch (error) {
                console.error("Failed to sync wishlist", error)
            } finally {
                setLoading(false)
            }
        }
        fetchWishlist()
    }, [setItems])

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20 min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center rounded-4xl border-2 border-dashed bg-zinc-50/50"
            >
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="h-20 w-20 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl border-2 border-zinc-100"
                >
                    <Heart className="h-10 w-10 text-rose-500 fill-rose-50" />
                </motion.div>
                <h3 className="font-black text-3xl mb-2 uppercase italic tracking-tighter">Your Vault is Empty</h3>
                <p className="text-muted-foreground max-w-xs mb-8 text-sm font-medium uppercase tracking-widest leading-relaxed">
                    Capture the items you love to build your unique style profile.
                </p>
                <Button size="lg" className="rounded-full px-10 font-black uppercase tracking-widest text-xs gradient-primary shadow-2xl hover:scale-105 transition-all" asChild>
                    <Link href="/shop" className="flex items-center gap-2">
                        Explore Collections
                    </Link>
                </Button>
            </motion.div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-2 duration-500">
            {items.map((item, index) => (
                // Reconstruct a minimal product object for ProductCard
                <ProductCard key={item.productId} product={{
                    id: item.productId,
                    name: item.name,
                    price: item.price,
                    main_image_url: item.image,
                    slug: item.slug
                } as any} priority={index < 4} />
            ))}
        </div>
    )
}
