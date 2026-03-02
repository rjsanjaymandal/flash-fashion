'use server'

import { medusaClient } from "@/lib/medusa"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function loginMedusa(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/auth/customer/emailpass`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })

        if (!response.ok) {
            const error = await response.json()
            return { error: error.message || 'Login failed' }
        }

        const data = await response.json()
        const token = data.token

        const cookieStore = await cookies()
        cookieStore.set('medusa_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 1 week
        })

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error('Login error:', error)
        return { error: 'System error during login' }
    }
}

export async function registerMedusa(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const first_name = formData.get('first_name') as string
    const last_name = formData.get('last_name') as string

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/auth/customer/emailpass/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, first_name, last_name })
        })

        if (!response.ok) {
            const error = await response.json()
            return { error: error.message || 'Registration failed' }
        }

        // Login immediately after registration
        return await loginMedusa(formData)
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

export async function getMedusaSession() {
    const cookieStore = await cookies()
    const token = cookieStore.get('medusa_token')?.value
    if (!token) return null

    try {
        // Fetch current customer session from Medusa
        const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/customers/me`, {
            headers: {
                Authorization: `Bearer ${token}`
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
