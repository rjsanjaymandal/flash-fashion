'use server'

import { medusaClient } from '@/lib/medusa'

export async function getSearchIndex() {
    // For universal search index, we fetch a large batch of active products
    // Note: In a real production app, consider using Algolia or Meilisearch with Medusa
    try {
        const { products } = await medusaClient.store.product.list({
            limit: 100, // Reasonable limit for client-side search indexing
            fields: "*components,*categories,*variants,*variants.calculated_price"
        })

        return products.map((p: any) => {
            return {
                id: p.id,
                name: p.title || '',
                price: p.variants?.[0]?.calculated_price?.calculated_amount || 0,
                slug: p.handle || p.id,
                display_image: p.thumbnail,
                category_name: p.categories?.[0]?.name || '',
            }
        })
    } catch (e) {
        console.error("Failed to fetch Medusa products for search index:", e)
        return []
    }
}

export async function searchProducts(query: string) {
    const normalizedQuery = query.trim()
    if (normalizedQuery.length < 2) return []

    try {
        // Medusa's standard list endpoint supports text search via the `q` parameter
        const { products } = await medusaClient.store.product.list({
            q: normalizedQuery,
            limit: 5,
            fields: "*variants,*variants.calculated_price"
        })

        return products.map((p: any) => ({
            id: p.id,
            name: p.title,
            slug: p.handle,
            display_image: p.thumbnail,
            price: p.variants?.[0]?.calculated_price?.calculated_amount || 0,
        }))
    } catch (e) {
        console.error('Medusa Search failed:', e)
        return []
    }
}
