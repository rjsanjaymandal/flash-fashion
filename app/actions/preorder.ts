'use server'

import { updateMedusaCustomerData } from '@/lib/medusa-bridge'
import { revalidatePath } from 'next/cache'
import { getMedusaSession } from './medusa-auth'

export async function togglePreorder(variantId: string, email?: string) {
  const customer = await getMedusaSession()

  const identifier = customer?.email || email?.trim().toLowerCase()
  if (!identifier) {
    return { error: 'Please sign in or provide an email to join the waitlist.' }
  }

  // Medusa Waitlist is stored in Variant Metadata
  // We use the bridge to append the user
  const result = await updateMedusaCustomerData(customer?.id || 'guest', 'add_to_waitlist', {
    variant_id: variantId,
    email: identifier,
    user_name: customer ? `${customer.first_name} ${customer.last_name || ''}`.trim() : 'Guest'
  }, identifier)

  if (result?.error) {
    return { error: 'Failed to join waitlist.' }
  }

  revalidatePath('/shop')
  return { success: true, status: 'added' }
}

export async function checkPreorderStatus(variant: any, email?: string) {
  const customer = await getMedusaSession()
  const identifier = customer?.email || email?.trim().toLowerCase()

  if (!identifier || !variant?.metadata?.waitlist) return false

  const waitlist = variant.metadata.waitlist as any[]
  return waitlist.some(entry => entry.email === identifier)
}
