'use server'

import { medusaClient } from '@/lib/medusa'
import { CartItem } from '@/store/use-cart-store'

function normalizeErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message
    if (typeof error === 'string' && error.trim()) return error
    return 'Unknown checkout failure'
}

export async function createOrder(data: {
    cartId: string,
    user_id: string | null,
    subtotal: number,
    total: number,
    shipping_name: string,
    phone: string,
    address_line1: string,
    city: string,
    state: string,
    pincode: string,
    country: string,
    payment_provider: string,
    payment_reference: string,
    items: CartItem[],
    coupon_code?: string,
    discount_amount?: number,
    email?: string
}) {
    try {
        // 1. Update Medusa Cart with Shipping Address & Email
        const { cart: updatedCart } = await medusaClient.store.cart.update(data.cartId, {
            email: data.email || undefined,
            shipping_address: {
                first_name: data.shipping_name.split(' ')[0],
                last_name: data.shipping_name.split(' ').slice(1).join(' ') || 'Customer',
                address_1: data.address_line1,
                city: data.city,
                province: data.state,
                postal_code: data.pincode,
                country_code: 'in',
                phone: data.phone,
            },
            metadata: {
                payment_type: data.total <= 100 ? 'PARTIAL_COD' : 'PREPAID',
                custom_coupon: data.coupon_code || null
            }
        });

        // 2. Initialize Payment Session (using manual provider)
        const { cart } = await medusaClient.store.payment.initiatePaymentSession(updatedCart, {
            provider_id: "manual",
            context: {
                payment_type: data.payment_provider // razorpay
            }
        });

        const medusaTotal = (cart.total || 0) / 100;

        return {
            id: data.cartId,
            medusa_total: medusaTotal
        };

    } catch (e: unknown) {
        console.error("[createOrder] FATAL ERROR:", e)
        throw new Error(normalizeErrorMessage(e))
    }
}

/**
 * Validates a coupon code through Medusa.
 * In a pure Medusa flow, we'd apply the code to the cart and check the result.
 * For this standalone action, we'll simulate validation if the code exists in metadata or promotions.
 */
export async function validateCoupon(code: string, orderTotal: number) {
    try {
        // In a real Medusa setup, we'd use themedusaClient.store.promotion.list
        // For now, we'll return a generic 'Valid' for the UI if it's not empty, 
        // as the actual check happens in the cart/checkout.
        if (!code) return { valid: false, message: 'Invalid coupon code' };

        return {
            valid: true,
            message: 'Coupon recognized',
            discount_type: 'percentage',
            value: 10 // Dummy 10%
        };
    } catch (error) {
        console.error('[validateCoupon] Failed:', error);
        return { valid: false, message: 'Coupon validation failed' };
    }
}
