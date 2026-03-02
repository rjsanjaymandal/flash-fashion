'use server'

import { updateMedusaCustomerData } from '@/lib/medusa-bridge'
import { revalidatePath } from 'next/cache'
import { medusaClient } from '@/lib/medusa'
import { getMedusaSession } from './medusa-auth'

export async function getGlobalSettings(key: string) {
  try {
    const { products } = await medusaClient.store.product.list({
      handle: "flash-global"
    })
    const globalProduct = products?.[0]
    if (!globalProduct) return null

    const settings = (globalProduct.metadata?.settings as any) || {}
    return settings[key]
  } catch (error) {
    console.error(`[getGlobalSettings] Failed to fetch ${key}:`, error)
    return null
  }
}

export async function updateGlobalSettings(key: string, value: any) {
  const customer = await getMedusaSession()
  if (!customer) return { error: 'Unauthorized' }

  // Check if admin (Medusa metadata)
  if (customer.metadata?.role !== 'admin') {
    return { error: 'Unauthorized: Admin only' }
  }

  const result = await updateMedusaCustomerData(customer.id, 'update_settings', {
    key,
    value
  })

  if (result?.error) {
    return { error: 'Failed to update settings' }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
