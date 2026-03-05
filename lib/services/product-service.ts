'use server'

import { medusaClient } from '@/lib/medusa'
import { unstable_cache } from 'next/cache'
import { mapMedusaProduct } from '@/lib/utils/map-product'

export type Product = any; // We'll use Medusa's native types where possible

export type ProductSortOption = 'price_asc' | 'price_desc' | 'newest' | 'trending' | 'waitlist_desc' | 'random' | 'relevance'

export type ProductFilter = {
    category_id?: string
    category_handle?: string
    is_active?: boolean
    search?: string
    sort?: ProductSortOption
    limit?: number
    page?: number
    min_price?: number
    max_price?: number
    size?: string
    color?: string
    is_carousel_featured?: boolean
    ignoreStockSort?: boolean
    includeDetails?: boolean
}

export type PaginatedResult<T> = {
    data: T[]
    meta: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}


/**
 * Resolves a category handle (slug) to its Medusa category ID.
 */
async function resolveCategoryId(handleOrId: string): Promise<string | null> {
    try {
        // First check if it's already an ID (starts with "pcat_" in Medusa)
        if (handleOrId.startsWith('pcat_')) return handleOrId

        const { product_categories } = await medusaClient.store.category.list({
            handle: [handleOrId],
            limit: 1,
        } as any)

        return product_categories?.[0]?.id || null
    } catch {
        return null
    }
}

/**
 * Fetches products from Medusa with filtering and pagination.
 * Maps results to the storefront's expected UI format.
 */
export async function getProducts(filter: ProductFilter = {}): Promise<PaginatedResult<any>> {
    const page = filter.page || 1
    const limit = filter.limit || 12
    const offset = (page - 1) * limit

    const params: any = {
        limit,
        offset,
        fields: '*categories,*variants,*variants.calculated_price,*variants.options,*variants.options.option,*images',
    }

    // Category filter: resolve handle to ID if needed
    if (filter.category_id) {
        const categoryId = await resolveCategoryId(filter.category_id)
        if (categoryId) {
            params.category_id = [categoryId]
        }
    }

    // Search
    if (filter.search) params.q = filter.search

    // Sorting — Medusa v2 uses `order` field
    if (filter.sort === 'price_asc') params.order = 'variants.prices.amount'
    else if (filter.sort === 'price_desc') params.order = '-variants.prices.amount'
    else if (filter.sort === 'newest') params.order = '-created_at'
    else if (filter.sort === 'relevance' || !filter.sort) params.order = '-created_at'

    try {
        const { products, count } = await medusaClient.store.product.list(params)

        // Map to storefront format
        let mapped = products.map(mapMedusaProduct)

        // Client-side filtering for size/color/price (Medusa v2 Store API
        // does not natively support variant-level filtering in list queries)
        if (filter.size) {
            mapped = mapped.filter((p: any) =>
                p.size_options.some((s: string) => s.toLowerCase() === filter.size!.toLowerCase())
            )
        }

        if (filter.color) {
            mapped = mapped.filter((p: any) =>
                p.color_options.some((c: string) => c.toLowerCase() === filter.color!.toLowerCase())
            )
        }

        if (filter.min_price !== undefined) {
            mapped = mapped.filter((p: any) => p.price >= filter.min_price!)
        }

        if (filter.max_price !== undefined && filter.max_price < 20000) {
            mapped = mapped.filter((p: any) => p.price <= filter.max_price!)
        }

        // Client-side sort for price (since Medusa sort on variant prices can be unreliable)
        if (filter.sort === 'price_asc') {
            mapped.sort((a: any, b: any) => a.price - b.price)
        } else if (filter.sort === 'price_desc') {
            mapped.sort((a: any, b: any) => b.price - a.price)
        } else if (filter.sort === 'random') {
            mapped.sort(() => Math.random() - 0.5)
        }

        return {
            data: mapped,
            meta: {
                total: count || mapped.length,
                page,
                limit,
                totalPages: Math.ceil((count || mapped.length) / limit)
            }
        }
    } catch (error) {
        console.error('getProducts error:', error)
        return {
            data: [],
            meta: { total: 0, page, limit, totalPages: 0 }
        }
    }
}

/**
 * Fetches featured products for the homepage.
 */
export async function getFeaturedProducts(): Promise<any[]> {
    return unstable_cache(
        async () => {
            try {
                const { products } = await medusaClient.store.product.list({
                    limit: 8,
                    fields: '*categories,*variants,*variants.calculated_price,*variants.options,*variants.options.option,*images',
                })
                return products.map(mapMedusaProduct)
            } catch (error) {
                console.error('getFeaturedProducts failed:', error)
                return []
            }
        },
        ['featured-products-medusa'],
        { tags: ['products'], revalidate: 3600 }
    )()
}

/**
 * Fetches a single product by its slug (handle in Medusa).
 */
export async function getProductBySlug(slug: string): Promise<any | null> {
    return unstable_cache(
        async () => {
            try {
                const { products } = await medusaClient.store.product.list({
                    handle: slug,
                    limit: 1,
                    fields: '*categories,*variants,*variants.calculated_price,*variants.options,*variants.options.option,*images,*metadata',
                })
                return products[0] ? mapMedusaProduct(products[0]) : null
            } catch (error) {
                console.error('getProductBySlug failed:', error)
                return null
            }
        },
        ['product-handle', slug],
        { tags: [`product-${slug}`, 'products'], revalidate: 60 }
    )()
}

/**
 * Fetches related products based on a given product.
 */
export async function getRelatedProducts(product: any): Promise<any[]> {
    if (!product) return []

    return unstable_cache(
        async () => {
            try {
                const categoryId = product.categories?.[0]?.id || product.category_id
                const { products } = await medusaClient.store.product.list({
                    category_id: categoryId ? [categoryId] : undefined,
                    limit: 5,
                    fields: '*categories,*variants,*variants.calculated_price,*variants.options,*variants.options.option,*images',
                })
                return products
                    .filter((p: any) => p.id !== product.id)
                    .slice(0, 4)
                    .map(mapMedusaProduct)
            } catch (error) {
                console.error('getRelatedProducts failed:', error)
                return []
            }
        },
        ['related-products-medusa', product.id],
        { tags: ['products'], revalidate: 3600 }
    )()
}

/**
 * Fetches products by a list of IDs.
 */
export async function getProductsByIds(ids: string[]): Promise<any[]> {
    if (!ids || ids.length === 0) return []
    try {
        const { products } = await medusaClient.store.product.list({
            id: ids,
            fields: '*categories,*variants,*variants.calculated_price,*variants.options,*variants.options.option,*images',
        })
        return products.map(mapMedusaProduct)
    } catch (error) {
        console.error('getProductsByIds error:', error)
        return []
    }
}

/**
 * Validates a list of product IDs and returns the active ones.
 */
export async function getValidProducts(ids: string[]): Promise<any[]> {
    return getProductsByIds(ids)
}
