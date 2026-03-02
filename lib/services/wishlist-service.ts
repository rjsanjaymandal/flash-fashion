'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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

export async function getWishlist() {
    try {
        const headers = await getHeaders()
        if (!headers.Authorization) return { items: [] }

        const response = await fetch(`${BACKEND_URL}/store/customers/me/wishlist`, {
            headers,
            next: { tags: ['wishlist'], revalidate: 0 }
        })

        if (!response.ok) return { items: [] }

        const data = await response.json()
        return data.wishlist || { items: [] }
    } catch (error) {
        console.error('[getWishlist] Failed:', error)
        return { items: [] }
    }
}

export async function addToWishlist(productId: string) {
    try {
        const headers = await getHeaders()
        if (!headers.Authorization) return { error: "You must be logged in to add to wishlist." }

        const response = await fetch(`${BACKEND_URL}/store/customers/me/wishlist/items`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                productId,
                quantity: 1
            })
        })

        if (!response.ok) {
            const error = await response.json()
            return { error: error.message || "Failed to add to wishlist" }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error) {
        console.error('[addToWishlist] Error:', error)
        return { error: "System error" }
    }
}

export async function removeFromWishlist(productId: string) {
    try {
        const headers = await getHeaders()
        if (!headers.Authorization) return { error: "You must be logged in" }

        // The plugin notes ?productId={productId}&productVariantId={productVariantId}
        const response = await fetch(`${BACKEND_URL}/store/customers/me/wishlist/items?productId=${productId}`, {
            method: 'DELETE',
            headers
        })

        if (!response.ok) {
            return { error: "Failed to remove from wishlist" }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error) {
        console.error('[removeFromWishlist] Error:', error)
        return { error: "System error" }
    }
}
