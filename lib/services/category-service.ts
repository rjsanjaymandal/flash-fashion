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

        product_categories.forEach(cat => {
            categoryMap.set(cat.id, { ...cat, children: [] });
        });

        product_categories.forEach(cat => {
            const node = categoryMap.get(cat.id);
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
        return product_categories;
    } catch (error) {
        console.error('[getLinearCategories] Failed:', error);
        return [];
    }
}

export async function getRootCategories(limit?: number): Promise<any[]> {
    try {
        const { product_categories } = await medusaClient.store.category.list({
            // Filter roots (parent_category_id: null)
        });
        const roots = product_categories.filter(c => !c.parent_category_id);
        return limit ? roots.slice(0, limit) : roots;
    } catch (error) {
        console.error('[getRootCategories] Failed:', error);
        return [];
    }
}

// Admin Placeholders
export async function createCategory(data: any) {
    return { success: false, error: "Handled via Medusa Admin" }
}

export async function updateCategory(id: string, data: any) {
    return { success: false, error: "Handled via Medusa Admin" }
}

export async function deleteCategory(id: string) {
    return { success: false, error: "Handled via Medusa Admin" }
}
