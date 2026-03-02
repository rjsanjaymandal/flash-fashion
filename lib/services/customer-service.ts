'use server'

import { medusaClient } from '@/lib/medusa'

/**
 * Fetches customers for the admin dashboard from Medusa.
 */
export async function getCustomers(search: string = '', page: number = 1, limit: number = 10) {
  try {
    // Medusa Store API doesn't allow listing other customers.
    // This is typically an Admin API feature. Returning empty for now to satisfy storefront imports.
    return {
      data: [],
      meta: { total: 0, page, limit, totalPages: 0 }
    };
  } catch (error) {
    console.error('[getCustomers] Failed:', error);
    return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
  }
}
