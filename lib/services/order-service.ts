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

/**
 * Admin stats / activity (Placeholders for Medusa Admin)
 */
export async function getStats() {
    return {
        totalOrders: 0,
        totalRevenue: 0,
        totalProducts: 0,
        totalCustomers: 0,
        revenueGrowth: 0,
        orderGrowth: 0,
        averageOrderValue: 0,
        recentOrders: []
    }
}

export async function getTopProducts(limit = 5) {
    return []
}

export async function getRecentActivity(limit = 10) {
    return []
}

export async function getMonthlyRevenue() {
    return []
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
    return { success: false, error: "Handled via Medusa Admin" }
}

export async function getSalesByCategory() {
    return []
}

export async function getOrderStatusDistribution(rangeDays = 30) {
    return []
}
