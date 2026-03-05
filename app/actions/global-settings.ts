'use server'

import { revalidatePath } from 'next/cache'
import { medusaClient } from '@/lib/medusa'
import { getMedusaSession } from './medusa-auth'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

async function getHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies()
  const token = cookieStore.get('medusa_token')?.value
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': PUBLISHABLE_KEY,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

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

  // Flash global settings were previously tracked in customer metadata for admin convenience or store metadata. 
  // Refactoring to update customer metadata directly to drop bridge dependency and save state.
  const currentMetadata = customer.metadata || {}
  const settings = (currentMetadata.settings as any) || {}
  settings[key] = value

  const headers = await getHeaders()
  const res = await fetch(`${BACKEND_URL}/store/customers/me`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      metadata: {
        ...currentMetadata,
        settings
      }
    })
  })

  if (!res.ok) {
    return { error: 'Failed to update settings' }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
