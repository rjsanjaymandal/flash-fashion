'use server'

import { revalidatePath } from 'next/cache'
import { getMedusaSession } from './medusa-auth'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"

async function getHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies()
  const token = cookieStore.get('medusa_token')?.value
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export async function togglePreorder(variantId: string, email?: string, guestId?: string) {
  const customer = await getMedusaSession()

  const identifier = customer?.email || email?.trim().toLowerCase()
  if (!identifier || !customer) {
    return { error: 'Please sign in to join the waitlist.' }
  }

  const currentMetadata = customer.metadata || {}
  const waitlist = (currentMetadata.waitlist as string[]) || []

  if (!waitlist.includes(variantId)) {
    waitlist.push(variantId)
  }

  const headers = await getHeaders()
  const res = await fetch(`${BACKEND_URL}/store/customers/me`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      metadata: {
        ...currentMetadata,
        waitlist
      }
    })
  })

  if (!res.ok) {
    return { error: 'Failed to join waitlist.' }
  }

  revalidatePath('/shop')
  return { success: true, status: 'added', message: 'Successfully added to the waitlist.' }
}

export async function checkPreorderStatus(variant: any, email?: string) {
  const customer = await getMedusaSession()
  const identifier = customer?.email || email?.trim().toLowerCase()

  if (!identifier || !variant?.metadata?.waitlist) return false

  const waitlist = variant.metadata.waitlist as any[]
  return waitlist.some(entry => entry.email === identifier)
}
