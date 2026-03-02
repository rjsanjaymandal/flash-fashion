'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createStaticClient } from '@/lib/supabase/server'
import { CartItem } from '@/store/use-cart-store'
import { checkRateLimit } from '@/lib/rate-limit'
import { medusaClient } from '@/lib/medusa'

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
        // --- SECURITY: Rate Limiting ---
        if (data.user_id) {
            const { success } = await checkRateLimit(`checkout:user:${data.user_id}`, 5, 600)
            if (!success) {
                throw new Error('Too many order attempts. Please wait 10 minutes.')
            }
        }

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
                country_code: 'in', // Assuming India based on context
                phone: data.phone,
            },
            metadata: {
                payment_type: data.total <= 100 ? 'PARTIAL_COD' : 'PREPAID', // Simple heuristic for now
                custom_coupon: data.coupon_code || null
            }
        });

        // 2. Initialize Payment Session (using manual provider)
        // This marks the cart as ready for the Razorpay step
        const { cart } = await medusaClient.store.payment.initiatePaymentSession(updatedCart, {
            provider_id: "manual",
            context: {
                payment_type: data.payment_provider // razorpay
            }
        });

        // 3. Re-verify totals (optional but good practice)
        // Medusa's cart.total is in subunits (paise for INR)
        const medusaTotal = (cart.total || 0) / 100;

        // Return dummy object that matches expectations of the frontend for now
        // The real 'Order' is created during PaymentProcessor.processPayment
        return {
            id: data.cartId, // We use cartId as temp reference
            medusa_total: medusaTotal
        };

    } catch (e: unknown) {
        console.error("[createOrder] FATAL ERROR:", e)
        throw new Error(normalizeErrorMessage(e))
    }
}

export async function validateCoupon(code: string, orderTotal: number) {
    const supabase = createStaticClient()

    const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .single()

    if (error || !coupon) {
        return { valid: false, message: 'Invalid coupon code' }
    }

    if (!coupon.active) {
        return { valid: false, message: 'This coupon is no longer active' }
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { valid: false, message: 'This coupon has expired' }
    }

    if (coupon.max_uses && (coupon.used_count || 0) >= coupon.max_uses) {
        return { valid: false, message: 'This coupon usage limit has been reached' }
    }

    if (coupon.min_order_amount && orderTotal < coupon.min_order_amount) {
        return { valid: false, message: `Minimum order amount of ${coupon.min_order_amount} required` }
    }

    return {
        valid: true,
        message: 'Coupon applied',
        discount_type: coupon.discount_type,
        value: coupon.value
    }
}
