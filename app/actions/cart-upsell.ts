'use server'

import { getFeaturedProducts } from "@/lib/services/product-service"
import { medusaClient } from "@/lib/medusa"

export async function getUpsellProducts(
  categoryHandles: string[] = [],
  inCartIds: string[] = [],
): Promise<any[]> {
  try {
    // 1. Fetch products from the same categories (Affinity) in Medusa
    let products: any[] = [];

    if (categoryHandles.length > 0) {
      const { products: categoryProducts } = await medusaClient.store.product.list({
        category_handle: categoryHandles,
        limit: 10
      });
      products = categoryProducts.filter(p => !inCartIds.includes(p.id));
    }

    // 2. Fallback to featured
    if (products.length < 4) {
      const featured = await getFeaturedProducts();
      const additional = featured.filter((p) => {
        return !inCartIds.includes(p.id) && !products.some(prev => prev.id === p.id);
      });
      products = [...products, ...additional];
    }

    return products.slice(0, 10);
  } catch (error) {
    console.error("Upsell Fetch Error:", error);
    return await getFeaturedProducts();
  }
}
