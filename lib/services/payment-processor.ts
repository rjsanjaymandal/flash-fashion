
import Razorpay from 'razorpay'
import { Result, ok, err } from '@/lib/utils/result'
import { EventBus } from '@/lib/services/event-bus'
import { medusaClient } from '@/lib/medusa'

export class PaymentProcessor {
    /**
     * Verifies the Razorpay signature to prevent tampering
     */
    static verifySignature(body: string, signature: string, secret: string): boolean {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex')

        return expectedSignature === signature
    }

    /**
     * Fetches the internal Order UUID using the Razorpay Order ID.
     * Useful when the client only sends back the Razorpay ID.
     */
    static async getInternalOrderId(razorpayOrderId: string): Promise<string | null> {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('[PaymentProcessor] Missing Razorpay keys')
            return null
        }

        try {
            const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            })

            const rzpOrder = await razorpay.orders.fetch(razorpayOrderId)
            // Priority: Notes > Receipt
            const notes = rzpOrder.notes as Record<string, string> | undefined

            if (notes?.order_id) {
                return notes.order_id
            }

            if (rzpOrder.receipt) {
                return rzpOrder.receipt
            }

            return null
        } catch (error: unknown) {
            console.error('[PaymentProcessor] Failed to fetch Razorpay order:', error)
            return null
        }
    }

    /**
     * Search Razorpay for an order with the given Receipt (Safety Net)
     */
    static async findRazorpayOrderByReceipt(receipt: string): Promise<any | null> {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        })

        try {
            const orders = await razorpay.orders.all({
                receipt: receipt,
                count: 1
            })

            if (orders.items && orders.items.length > 0) {
                return orders.items[0]
            }
            return null
        } catch (e: unknown) {
            console.warn('[PaymentProcessor] Failed to search Razorpay orders:', e)
            return null
        }
    }

    /**
     * Fetch successful payments for a Razorpay Order
     */
    static async getPaymentsForOrder(razorpayOrderId: string): Promise<any[]> {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return []

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        })

        try {
            const payments = await razorpay.orders.fetchPayments(razorpayOrderId)
            return payments.items || [] // collection
        } catch (e: unknown) {
            console.warn('[PaymentProcessor] Failed to fetch payments:', e)
            return []
        }
    }

    /**
     * Core atomic function to finalize a Medusa Cart into an Order
     * after successful Razorpay verification.
     */
    static async processPayment(cartId: string, paymentId: string): Promise<Result<{ message: string, order?: any }, string>> {
        // 0. Deep Verification: Fetch Razorpay Payment Details First
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return err('Server Configuration Error: Missing Keys')
        }

        let razorpayAmount = 0
        let razorpayStatus = ''
        let paymentType: 'PREPAID' | 'PARTIAL_COD' | 'COD' = 'PREPAID'

        try {
            const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            })

            const payment = await razorpay.payments.fetch(paymentId)
            razorpayAmount = Number(payment.amount)
            razorpayStatus = payment.status

            // Fetch order notes to determine payment type
            if (payment.order_id) {
                const rzpOrder = await razorpay.orders.fetch(payment.order_id)
                if ((rzpOrder.notes as any)?.payment_type === 'PARTIAL_COD') {
                    paymentType = 'PARTIAL_COD'
                }
            }

            if (razorpayStatus !== 'captured' && razorpayStatus !== 'authorized') {
                const statusError = `Invalid Payment Status: ${razorpayStatus} for ${paymentId}`
                console.warn(`[PaymentProcessor] ${statusError}`)
                await this.logPaymentAttempt('PAYMENT_STATUS', statusError, 'WARN', { cartId, paymentId, status: razorpayStatus })
                return err(`Payment not captured: ${razorpayStatus}`)
            }
        } catch (e: unknown) {
            console.error('[PaymentProcessor] Razorpay Fetch Failed:', e)
            return err(`Invalid Payment ID: ${(e as Error).message}`)
        }

        // 1. Fetch current Cart from Medusa
        const { cart } = await medusaClient.store.cart.retrieve(cartId);
        if (!cart) {
            return err('Cart not found in Medusa')
        }

        if (cart.completed_at) {
            await this.logPaymentAttempt('PAYMENT', `Idempotent success for Cart ${cartId}`, 'INFO', { paymentId })
            return ok({ message: 'Payment verified (previously processed)' })
        }

        // 2. Strict Amount Check (Security)
        // Medusa cart total is already in subunits (paise for INR)
        const expectedAmountPaise = paymentType === 'PARTIAL_COD' ? 10000 : cart.total;

        if (Math.abs(razorpayAmount - expectedAmountPaise) > 1) { // 1 paise tolerance
            const mismatchError = `Amount Mismatch: Expected ${expectedAmountPaise}, Received ${razorpayAmount}`
            console.error(`[PaymentProcessor] SECURITY ALERT: ${mismatchError}`)

            await this.logPaymentAttempt('PAYMENT_SECURITY', mismatchError, 'ERROR', {
                cartId, paymentId, expected: expectedAmountPaise, received: razorpayAmount
            })

            return err('Payment verification failed: Amount Mismatch')
        }

        // 3. Complete Cart in Medusa
        // This creates the Order and handles stock decrement/cleanup
        try {
            const completion = await medusaClient.store.cart.complete(cartId);

            if (completion.type !== "order") {
                console.error('[PaymentProcessor] Medusa completion failed to return an order:', completion);
                return err('Failed to finalize order in Medusa');
            }

            const order = completion.order;

            // 5. Publish Event (Async Architecture)
            await EventBus.publish('ORDER_PAID', {
                orderId: order.id,
                paymentId,
                amount: razorpayAmount,
                method: paymentType,
                status: 'paid'
            });

            await this.logPaymentAttempt('PAYMENT', `Order Created: ${order.id} for Cart ${cartId}`, 'INFO', { paymentId, amount: razorpayAmount });

            return ok({
                message: 'Payment successfully verified and processed',
                order: order
            });

        } catch (e: unknown) {
            console.error('[PaymentProcessor] Medusa Complete Cart Error:', e);
            await this.logPaymentAttempt('PAYMENT_DB_ERROR', `Medusa Completion Failed for ${cartId}`, 'ERROR', { error: (e as Error).message });
            return err('Transaction failed: ' + (e as Error).message);
        }
    }

    /**
     * Internal helper to log payment attempts
     */
    private static async logPaymentAttempt(component: string, message: string, severity: 'INFO' | 'WARN' | 'ERROR', metadata: Record<string, unknown>) {
        console.log(`[PaymentProcessor][${severity}][${component}] ${message}`, metadata)
    }
}
