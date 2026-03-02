'use server'

import { medusaClient } from '@/lib/medusa'
import { unstable_cache } from 'next/cache'

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
 * Fetches products from Medusa with filtering and pagination.
 */
export async function getProducts(filter: ProductFilter = {}): Promise<PaginatedResult<any>> {
    const page = filter.page || 1
    const limit = filter.limit || 12
    const offset = (page - 1) * limit

    const params: any = {
        limit,
        offset,
    }

    if (filter.category_id) params.category_id = [filter.category_id]
    if (filter.category_handle) params.handle = [filter.category_handle]
    if (filter.search) params.q = filter.search

    // Medusa sort params usually follow standard conventions
    if (filter.sort === 'price_asc') params.order = 'price'
    if (filter.sort === 'price_desc') params.order = '-price'
    if (filter.sort === 'newest') params.order = '-created_at'

    try {
        const { products, count } = await medusaClient.store.product.list(params)

        return {
            data: products,
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
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
                    limit: 8
                })
                return products
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
                    limit: 1
                })
                return products[0] || null
            } catch (error) {
                console.error('getProductBySlug failed:', error)
                return null
            }
        },
        ['product-handle', slug],
        { tags: [`product-${slug}`, 'products'], revalidate: 3600 }
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
                const categoryId = product.categories?.[0]?.id
                const { products } = await medusaClient.store.product.list({
                    category_id: categoryId ? [categoryId] : undefined,
                    limit: 5
                })
                return products.filter((p: any) => p.id !== product.id).slice(0, 4)
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
            id: ids
        })
        return products
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

