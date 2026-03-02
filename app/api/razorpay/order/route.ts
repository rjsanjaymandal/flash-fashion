import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { medusaClient } from '@/lib/medusa'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error('Razorpay keys missing')
        return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 })
    }

    try {
        const { order_id: cartId, isPartialCod } = await req.json()

        if (!cartId) {
            return NextResponse.json({ error: 'Cart ID is required' }, { status: 400 })
        }

        // Rate Limit: 10 attempts per minute per cart
        const rateLimit = await checkRateLimit(`rzp_order:${cartId}`, 10, 60)
        if (!rateLimit.success) {
            return NextResponse.json({ error: 'Too many payment attempts. Please wait.' }, { status: 429 })
        }

        // 1. Fetch Cart from Medusa
        const { cart } = await medusaClient.store.cart.retrieve(cartId);

        if (!cart) {
            return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
        }

        // 2. Security Check: Ensure cart is not already completed (no order attached)
        // In Medusa v2, a cart that has an order_id shouldn't be paid for again
        if (cart.completed_at) {
            return NextResponse.json({ error: 'Order is already processed' }, { status: 400 })
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        })

        // 4. Dynamic Amount Logic: Partial COD (₹100) vs Full PREPAID
        // Medusa cart total is already in subunits (paise for INR)
        const finalAmount = isPartialCod ? 10000 : cart.total;

        // 5. Create Razorpay Order with Medusa Amount
        const options = {
            amount: finalAmount,
            currency: 'INR',
            receipt: cartId,
            notes: {
                cart_id: cartId,
                payment_type: isPartialCod ? 'PARTIAL_COD' : 'PREPAID'
            }
        }

        const rzpOrder = await razorpay.orders.create(options)

        return NextResponse.json(rzpOrder)
    } catch (error) {
        console.error('Error creating Razorpay order:', error)
        return NextResponse.json(
            { error: 'Error creating payment order' },
            { status: 500 }
        )
    }
}
