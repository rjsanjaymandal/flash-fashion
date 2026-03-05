/**
 * Maps a raw Medusa product to the storefront's expected UI shape.
 * This is the single source of truth for the mapping.
 * 
 * Extracted to a standalone utility so it can be imported from both
 * server actions ('use server' files) and regular server components
 * without violating the "Server Actions must be async" constraint.
 */
export function mapMedusaProduct(p: any) {
    const variants = p.variants || []
    const firstVariant = variants[0]

    // Extract price from calculated_price or variant prices
    const price = firstVariant?.calculated_price?.calculated_amount
        ?? firstVariant?.prices?.[0]?.amount
        ?? firstVariant?.prices?.find((pr: any) => pr.currency_code === 'inr')?.amount
        ?? firstVariant?.prices?.find((pr: any) => pr.amount > 0)?.amount
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
