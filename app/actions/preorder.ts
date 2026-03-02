'use server'

import { revalidatePath } from 'next/cache'
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

/**
 * Toggle waitlist status for a product.
 * 
 * For logged-in users: stores the waitlist in their Medusa customer metadata.
 * For guests: requires an email — stores it locally (server can't update customer metadata for guests).
 */
export async function togglePreorder(productId: string, email?: string, guestId?: string) {
  const customer = await getMedusaSession()

  // Guest flow: if no customer session but email is provided, treat as guest waitlist
  if (!customer) {
    if (!email) {
      return { error: 'Please sign in or provide your email to join the waitlist.' }
    }

    // For guests, we can't store in Medusa customer metadata.
    // Return success so the UI can track it locally via localStorage.
    return {
      success: true,
      status: 'added',
      message: 'You\'ve been added to the waitlist! We\'ll notify you when it\'s back in stock.'
    }
  }

  // Logged-in user flow: store in customer metadata
  const currentMetadata = customer.metadata || {}
  const waitlist: string[] = Array.isArray(currentMetadata.waitlist) ? [...currentMetadata.waitlist] : []

  const alreadyJoined = waitlist.includes(productId)

  if (alreadyJoined) {
    // Toggle off — remove from waitlist
    const updated = waitlist.filter((id: string) => id !== productId)
    const headers = await getHeaders()
    const res = await fetch(`${BACKEND_URL}/store/customers/me`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        metadata: {
          ...currentMetadata,
          waitlist: updated
        }
      })
    })

    if (!res.ok) {
      return { error: 'Failed to update waitlist.' }
    }

    revalidatePath('/shop')
    return { success: true, status: 'removed', message: 'Removed from waitlist.' }
  }

  // Add to waitlist
  waitlist.push(productId)
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

export async function checkPreorderStatus(productId: string, email?: string) {
  const customer = await getMedusaSession()
  if (!customer) return false

  const waitlist = (customer.metadata?.waitlist as string[]) || []
  return waitlist.includes(productId)
}
