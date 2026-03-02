'use server'

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/**
 * Login an existing customer via Medusa v2 Auth API.
 * Flow: POST /auth/customer/emailpass → get JWT → set cookie
 */
export async function loginMedusa(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    try {
        const response = await fetch(`${BACKEND_URL}/auth/customer/emailpass`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            return { error: error.message || 'Invalid email or password' }
        }

        const data = await response.json()
        const token = data.token

        if (!token) {
            return { error: 'No token received from server' }
        }

        const cookieStore = await cookies()
        cookieStore.set('medusa_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        })

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error('Login error:', error)
        return { error: 'System error during login' }
    }
}

/**
 * Register a new customer via Medusa v2 Auth API.
 * This is a 2-step process in Medusa v2:
 *   Step 1: POST /auth/customer/emailpass/register → creates auth identity, returns JWT
 *   Step 2: POST /store/customers → creates the actual customer record using the JWT
 * Then we set the token as a cookie for the session.
 */
export async function registerMedusa(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const first_name = formData.get('first_name') as string
    const last_name = formData.get('last_name') as string

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    try {
        // Step 1: Register the auth identity
        const authResponse = await fetch(`${BACKEND_URL}/auth/customer/emailpass/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        })

        if (!authResponse.ok) {
            const error = await authResponse.json().catch(() => ({}))
            // Common case: email already registered
            if (authResponse.status === 400 || authResponse.status === 422) {
                return { error: error.message || 'An account with this email already exists' }
            }
            return { error: error.message || 'Registration failed' }
        }

        const authData = await authResponse.json()
        const token = authData.token

        if (!token) {
            return { error: 'Registration failed: no token received' }
        }

        // Step 2: Create the customer record using the registration token
        const customerResponse = await fetch(`${BACKEND_URL}/store/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-publishable-api-key': PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
                email,
                first_name: first_name || '',
                last_name: last_name || '',
            })
        })

        if (!customerResponse.ok) {
            const error = await customerResponse.json().catch(() => ({}))
            console.error('Customer creation failed:', error)
            return { error: error.message || 'Failed to create customer profile' }
        }

        // Set the token as a session cookie
        const cookieStore = await cookies()
        cookieStore.set('medusa_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        })

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error('Registration error:', error)
        return { error: 'System error during registration' }
    }
}

export async function logoutMedusa() {
    const cookieStore = await cookies()
    cookieStore.delete('medusa_token')
    revalidatePath('/')
    return { success: true }
}

/**
 * Get the current customer session from Medusa.
 * Requires both the Bearer token AND the publishable API key.
 */
export async function getMedusaSession() {
    const cookieStore = await cookies()
    const token = cookieStore.get('medusa_token')?.value
    if (!token) return null

    try {
        const response = await fetch(`${BACKEND_URL}/store/customers/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-publishable-api-key': PUBLISHABLE_KEY,
            },
            next: { revalidate: 0 }
        })

        if (!response.ok) return null

        const data = await response.json()
        return data.customer
    } catch (error) {
        return null
    }
}
