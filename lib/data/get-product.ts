import { medusaClient } from "@/lib/medusa"
import { unstable_cache } from 'next/cache'
import type { Product } from '@/lib/services/product-service'

async function fetchProductBySlug(slug: string): Promise<Product | null> {
    try {
        const { products } = await medusaClient.store.product.list({
            handle: slug,
            fields: "*categories,*variants,*variants.calculated_price,*images,*metadata"
        });

        const p = products[0];
        if (!p) return null;

        // Map to expected UI format
        return {
            id: p.id,
            name: p.title,
            slug: p.handle,
            description: p.description || "",
            price: p.variants?.[0]?.calculated_price?.calculated_amount || 0,
            original_price: p.variants?.[0]?.calculated_price?.original_amount || 0,
            main_image_url: p.thumbnail,
            gallery_image_urls: p.images?.map((i: any) => i.url) || [],
            status: p.status,
            is_active: p.status === "published",
            created_at: p.created_at,
            categories: { name: p.categories?.[0]?.name || "Uncategorized" },
            category_id: p.categories?.[0]?.id || "",
            product_stock: p.variants?.map((v: any) => ({
                id: v.id,
                product_id: p.id,
                size: v.title,
                quantity: v.inventory_quantity || 10,
            })) || [],
            size_options: Array.from(new Set(p.variants?.map((v: any) => v.title) || [])),
            color_options: [],
            seo_title: p.title,
            seo_description: p.description,
            average_rating: 0, // Metadata handled elsewhere
            review_count: 0
        } as Product;
    } catch (error) {
        console.error('fetchProductBySlug failed:', error);
        return null;
    }
}

export const getCachedProduct = unstable_cache(
    async (slug: string) => fetchProductBySlug(slug),
    ['product-details-cached'],
    {
        revalidate: 900, // 15 Minutes
        tags: ['products']
    }
)
