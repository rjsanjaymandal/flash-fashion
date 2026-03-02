'use server'

import { medusaClient } from '@/lib/medusa'

/**
 * Fetches orders for the current customer.
 */
export async function getOrders(filter: any = {}) {
    try {
        // This assumes the request is made from a customer-authenticated session
        const { orders, count } = await medusaClient.store.order.list({
            limit: filter.limit || 10,
            offset: ((filter.page || 1) - 1) * (filter.limit || 10)
        });

        return {
            data: orders,
            meta: {
                total: count || 0,
                page: filter.page || 1,
                limit: filter.limit || 10,
                totalPages: Math.ceil((count || 0) / (filter.limit || 10))
            }
        };
    } catch (error) {
        console.error('[getOrders] Failed:', error);
        return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }
}

