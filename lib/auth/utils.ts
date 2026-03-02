import { getMedusaSession } from "@/app/actions/medusa-auth"

/**
 * Checks if the current user is an admin.
 * Throws an error if not authorized.
 * Returns the customer object if authorized.
 */
export async function requireAdmin() {
    const customer = await getMedusaSession()

    if (!customer) {
        throw new Error('Unauthorized: No session found')
    }

    // Medusa stores roles in metadata during our migration
    if (customer.metadata?.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required')
    }

    return customer
}
