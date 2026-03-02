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
 * Maps a raw Medusa product to the storefront's expected UI shape.
 * This is the single source of truth for the mapping.
 */
function mapMedusaProduct(p: any): Product {
    const variants = p.variants || []
    const firstVariant = variants[0]

    // Extract price from calculated_price or variant prices
    const price = firstVariant?.calculated_price?.calculated_amount
        ?? firstVariant?.prices?.[0]?.amount
        ?? 0

    const originalPrice = firstVariant?.calculated_price?.original_amount
        ?? firstVariant?.prices?.[0]?.amount
        ?? price

    // Build stock array from variants
    const productStock = variants.map((v: any) => {
        // Parse options from variant title or options
        const optionValues = v.options?.reduce((acc: any, opt: any) => {
            const label = opt.option?.title?.toLowerCase() || ''
            if (label.includes('size')) acc.size = opt.value
            if (label.includes('color') || label.includes('colour')) acc.color = opt.value
            if (label.includes('fit')) acc.fit = opt.value
            return acc
        }, { size: v.title || 'Standard', color: 'Standard', fit: 'Regular' })

        return {
            id: v.id,
            product_id: p.id,
            size: optionValues?.size || v.title || 'Standard',
            color: optionValues?.color || 'Standard',
            fit: optionValues?.fit || 'Regular',
            quantity: v.inventory_quantity ?? 10,
        }
    })

    // Extract unique options
    const sizeOptions = [...new Set(productStock.map((s: any) => s.size))] as string[]
    const colorOptions = [...new Set(productStock.map((s: any) => s.color))] as string[]
    const fitOptions = [...new Set(productStock.map((s: any) => s.fit))] as string[]

    return {
        id: p.id,
        name: p.title,
        slug: p.handle,
        description: p.description || '',
        price,
        original_price: originalPrice !== price ? originalPrice : null,
        main_image_url: p.thumbnail || '',
        gallery_image_urls: p.images?.map((i: any) => i.url) || [],
        status: p.status,
        is_active: p.status === 'published',
        created_at: p.created_at,
        categories: p.categories?.[0] ? { name: p.categories[0].name } : null,
        category_id: p.categories?.[0]?.id || '',
        product_stock: productStock,
        size_options: sizeOptions,
        color_options: colorOptions,
        fit_options: fitOptions.length > 1 || (fitOptions.length === 1 && fitOptions[0] !== 'Regular') ? fitOptions : [],
        total_stock: productStock.reduce((acc: number, s: any) => acc + (s.quantity || 0), 0),
        seo_title: p.title,
        seo_description: p.description,
        // Keep raw variants for cart integration
        variants: variants,
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
                    fields: '*categories,*variants,*variants.calculated_price,*variants.options,*variants.options.option,*images',
                })
                return products[0] ? mapMedusaProduct(products[0]) : null
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
