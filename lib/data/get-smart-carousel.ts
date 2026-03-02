import { medusaClient } from "@/lib/medusa"

export async function getSmartCarouselData() {
    try {
        const { products } = await medusaClient.store.product.list({
            limit: 15,
            fields: "*variants,*variants.calculated_price"
        });

        if (!products) {
            console.warn('[getSmartCarouselData] No data returned from Medusa. Returning empty list.')
            return []
        }

        // Map to expected UI format
        return products.map((p: any) => ({
            id: p.id,
            name: p.title,
            description: p.description || "",
            price: p.variants?.[0]?.calculated_price?.calculated_amount || 0,
            original_price: p.variants?.[0]?.calculated_price?.original_amount || 0,
            main_image_url: p.thumbnail,
            slug: p.handle,
            created_at: p.created_at,
            color_options: [],
            size_options: p.variants?.map((v: any) => v.title) || [],
            product_stock: p.variants?.map((v: any) => ({ quantity: v.inventory_quantity || 10 })) || []
        }));
    } catch (e) {
        console.error('[getSmartCarouselData] Medusa fetch failed:', e);
        return [];
    }
}
