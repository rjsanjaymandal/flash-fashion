'use server'

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { medusaClient } from "@/lib/medusa"

/**
 * Login an existing customer via Medusa API using the JS SDK.
 */
export async function loginMedusa(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    try {
        // Use the official JS SDK
        const loginResponse = await medusaClient.auth.login("customer", "emailpass", {
            email,
            password
        })

        const token = typeof loginResponse === 'string' ? loginResponse : undefined;

        if (!token) {
            return { error: 'Failed to retrieve access token' }
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
        return { error: error.message || 'Invalid email or password' }
    }
}

/**
 * Register a new customer via Medusa API using the JS SDK.
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
        // Step 1: Register the auth identity to get token
        const registerResponse = await medusaClient.auth.register("customer", "emailpass", {
            email,
            password
        })

        const token = typeof registerResponse === 'string' ? registerResponse : undefined;

        if (!token) {
            return { error: 'Registration failed but no error thrown' }
        }

        // Step 2: Create the customer record. 
        // We must pass the token as Authorization header manually if not already handled by client
        const clientWithToken = medusaClient;
        clientWithToken.client.setToken(token);

        await clientWithToken.store.customer.create({
            email,
            first_name,
            last_name,
        }).catch((err) => {
            console.error('Customer profile creation error:', err)
            throw err // Allow catch block to handle it
        })

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
        return { error: error.message || 'System error during registration' }
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
 */
export async function getMedusaSession() {
    const cookieStore = await cookies()
    const token = cookieStore.get('medusa_token')?.value

    if (!token) return null

    try {
        // Inject the token into the SDK client instance for this specific server-side request
        const clientWithToken = medusaClient;
        clientWithToken.client.setToken(token);

        const { customer } = await clientWithToken.store.customer.retrieve(undefined, {
            Authorization: `Bearer ${token}`
        })
        return customer
    } catch (error) {
        console.error('getMedusaSession error', error)
        return null
    }
}

