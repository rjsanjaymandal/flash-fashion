'use server'

import { medusaClient } from '@/lib/medusa'

export type Category = any;

/**
 * Fetches all categories as a tree structure.
 */
export async function getCategoriesTree(): Promise<Category[]> {
    try {
        const { product_categories } = await medusaClient.store.category.list({
            // Medusa usually returns a flat list with parent_category_id
            // We'll trust the caller to handle the flat or tree structure if Medusa doesn't have a direct 'tree' API in this SDK version.
        });

        // Simple tree builder logic (if needed)
        const categoryMap = new Map();
        const roots: any[] = [];

        product_categories.forEach((cat: any) => {
            categoryMap.set(cat.id, { ...cat, children: [] });
        });

        product_categories.forEach((cat: any) => {
            const node: any = categoryMap.get(cat.id);
            if (cat.parent_category_id && categoryMap.has(cat.parent_category_id)) {
                categoryMap.get(cat.parent_category_id).children.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    } catch (error) {
        console.error('[getCategoriesTree] Failed:', error);
        return [];
    }
}

/**
 * Fetches linear categories for simple lists.
 */
export async function getLinearCategories(activeOnly = false): Promise<Category[]> {
    try {
        const { product_categories } = await medusaClient.store.category.list();
        return product_categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.handle || cat.id,
            handle: cat.handle,
            description: cat.description,
        }));
    } catch (error) {
        console.error('[getLinearCategories] Failed:', error);
        return [];
    }
}

export async function getRootCategories(limit?: number): Promise<any[]> {
    try {
        const { product_categories } = await medusaClient.store.category.list({
            // Filter roots (parent_category_id: null)
            fields: "*category_children",
        });

        const roots = product_categories.filter((c: any) => !c.parent_category_id);
        const categoriesToShow = limit ? roots.slice(0, limit) : roots;

        // For each category, fetch products to get a random image
        const categoriesWithImages = await Promise.all(categoriesToShow.map(async (category: any) => {
            try {
                // If category already has an image, use it (optional, but requested "from their product images randomly")
                // Fetch up to 10 products from this category
                const { products } = await medusaClient.store.product.list({
                    category_id: [category.id],
                    limit: 10,
                    fields: "thumbnail",
                });

                if (products && products.length > 0) {
                    // Pick a random product image
                    const randomIndex = Math.floor(Math.random() * products.length);
                    const randomProduct = products[randomIndex];
                    return {
                        ...category,
                        image_url: randomProduct.thumbnail || category.image_url
                    };
                }
            } catch (err) {
                console.error(`[getRootCategories] Failed to fetch products for category ${category.id}:`, err);
            }
            return category;
        }));

        return categoriesWithImages;
    } catch (error) {
        console.error('[getRootCategories] Failed:', error);
        return [];
    }
}

export const getCategories = async () => {
    try {
        const { product_categories } = await medusaClient.store.category.list();

        return product_categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            handle: cat.handle,
            parent_category_id: cat.parent_category_id,
            category_children: cat.category_children?.map((child: any) => ({
                id: child.id,
                name: child.name,
            })),
        }));
    } catch (error) {
        console.error('[getCategories] Failed:', error);
        return [];
    }
}

