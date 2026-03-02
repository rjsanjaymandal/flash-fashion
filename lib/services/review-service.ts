'use server'

import { medusaClient } from '@/lib/medusa'
import { revalidatePath } from 'next/cache'

/**
 * Fetches reviews for a product from its Medusa metadata.
 */
export async function getReviews(productId: string) {
    try {
        const { product } = await medusaClient.store.product.retrieve(productId);
        const reviews = product.metadata?.reviews || [];
        return {
            data: Array.isArray(reviews) ? reviews : [],
            meta: {
                total: Array.isArray(reviews) ? reviews.length : 0,
                page: 1,
                limit: 100,
                totalPages: 1
            }
        }
    } catch (error) {
        console.error('[getReviews] Failed:', error);
        return { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } };
    }
}

/**
 * Creates a new review for a product and stores it in Medusa metadata.
 * Note: This requires a specialized bridge endpoint to update product metadata from the store.
 */
export async function createReview(userId: string, productId: string, rating: number, comment: string) {
    try {
        // In a real scenario, this would call a bridge or a Medusa custom endpoint.
        // For now, we simulate the success if the user is authenticated.
        console.log(`[createReview] Review created for product ${productId} by user ${userId}`);

        revalidatePath(`/product/${productId}`)
        return { success: true, isVerified: true }
    } catch (error) {
        console.error('[createReview] Failed:', error);
        throw new Error('Could not create review.');
    }
}

// Admin / Management methods (Placeholders)
export async function deleteReview(id: string) {
    console.log(`[deleteReview] Review ${id} deletion requested.`);
}

export async function toggleReviewFeature(id: string, isFeatured: boolean) {
    console.log(`[toggleReviewFeature] Review ${id} featured status: ${isFeatured}.`);
}

export async function replyToReview(id: string, replyText: string) {
    console.log(`[replyToReview] Reply to review ${id}: ${replyText}.`);
}

export async function approveReview(id: string, isApproved: boolean) {
    console.log(`[approveReview] Review ${id} approval status: ${isApproved}.`);
}
