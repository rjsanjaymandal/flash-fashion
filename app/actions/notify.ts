'use server'

import { medusaClient } from '@/lib/medusa'
import { resend } from '@/lib/email/client'
import { WaitlistNotification } from '@/components/emails/waitlist-notification'
import { render } from '@react-email/components'
import { getMedusaSession } from './medusa-auth'
import { updateMedusaCustomerData } from '@/lib/medusa-bridge'

export async function notifyWaitlistUser(variantId: string, email: string) {
    const customer = await getMedusaSession()
    if (!customer || customer.metadata?.role !== 'admin') return { error: 'Unauthorized' }

    // 1. Fetch Variant and Product Details
    const { variants } = await (medusaClient.store.product as any).listVariants({
        id: variantId,
        fields: ["*", "product.*"]
    });

    if (!variants || variants.length === 0) return { error: 'Variant not found' }
    const variant = variants[0];

    // 2. Extract Waitlist
    const waitlist = (variant.metadata?.waitlist as any[]) || []
    const entry = waitlist.find(e => e.email === email)
    if (!entry) return { error: 'User not on waitlist' }
    if (entry.notified_at) return { error: 'User already notified' }

    // 3. Stock Check
    const inventory = variant.inventory_quantity || 0
    if (inventory <= 0) return { error: 'Variant still out of stock' }

    const productName = (variant as any).product?.title || 'Product'
    const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${(variant as any).product?.handle}`
    const imageUrl = (variant as any).product?.thumbnail
    const userName = entry.user_name || 'Customer'
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

    // 4. Send Email
    let success = false
    if (process.env.RESEND_API_KEY) {
        try {
            const emailHtml = await render(
                WaitlistNotification({
                    productName,
                    productUrl,
                    imageUrl,
                    userName,
                    baseUrl
                })
            )

            await resend.emails.send({
                from: 'Flash Store <onboarding@resend.dev>',
                to: email,
                subject: `Good News! ${productName} is back in stock`,
                html: emailHtml
            })
            success = true
        } catch (err) {
            console.error(err)
            return { error: 'Failed to send email' }
        }
    } else {
        await new Promise(resolve => setTimeout(resolve, 300))
        success = true
    }

    // 5. Update Status in Medusa Metadata via Bridge
    if (success) {
        entry.notified_at = new Date().toISOString()
        await updateMedusaCustomerData(customer.id, 'update_waitlist_entry', {
            variant_id: variantId,
            waitlist
        })
    }

    return { success: true, simulated: !process.env.RESEND_API_KEY }
}

export async function notifyAllWaitlist(productId: string) {
    const customer = await getMedusaSession()
    if (!customer || customer.metadata?.role !== 'admin') return { error: 'Unauthorized' }

    // Fetch product with variants and metadata
    const { product } = await medusaClient.store.product.retrieve(productId, {
        fields: ["*", "variants.*"]
    })

    if (!product) return { error: 'Product not found' }

    let total_candidates = 0
    let processed = 0
    let skipped = 0
    let failed = 0

    for (const variant of product.variants || []) {
        const waitlist = (variant.metadata?.waitlist as any[]) || []
        const pending = waitlist.filter(e => !e.notified_at)
        total_candidates += pending.length

        for (const entry of pending) {
            const result = await notifyWaitlistUser(variant.id, entry.email)
            if (result.success) processed++
            else if (result.error === 'User already notified') skipped++
            else failed++
        }
    }

    return {
        success: true,
        stats: { processed, skipped, failed, total_candidates }
    }
}
