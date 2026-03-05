import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

/**
 * Google OAuth Callback Handler
 * 
 * Medusa v2 flow:
 * 1. User clicks "Sign in with Google" → redirected to /auth/customer/google
 * 2. Medusa redirects to Google's OAuth consent screen
 * 3. Google redirects back to Medusa's callback endpoint
 * 4. Medusa redirects to THIS route with code + state params
 * 5. We call Medusa's /auth/customer/google/callback to exchange for a JWT
 * 6. If the customer doesn't exist yet, we create them via /store/customers
 * 7. Set the JWT as an httpOnly cookie and redirect to homepage
 */
export async function GET(req: Request) {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code) {
        return NextResponse.redirect(new URL('/login?error=google_auth_failed', SITE_URL))
    }

    try {
        // Step 1: Exchange code+state with Medusa for a JWT token
        const callbackResponse = await fetch(`${BACKEND_URL}/auth/customer/google/callback?code=${code}${state ? `&state=${state}` : ''}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!callbackResponse.ok) {
            console.error('[Google Auth] Callback validation failed:', await callbackResponse.text())
            return NextResponse.redirect(new URL('/login?error=google_auth_failed', SITE_URL))
        }

        const data = await callbackResponse.json()
        const token = data.token

        if (!token) {
            console.error('[Google Auth] No token received from Medusa')
            return NextResponse.redirect(new URL('/login?error=no_token', SITE_URL))
        }

        // Step 2: Check if customer already exists by trying to fetch /store/customers/me
        const customerResponse = await fetch(`${BACKEND_URL}/store/customers/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-publishable-api-key': PUBLISHABLE_KEY,
            },
        })

        if (!customerResponse.ok) {
            // Customer doesn't exist yet — create them
            // The token from Google auth contains the user info
            const tokenPayload = JSON.parse(atob(token.split('.')[1]))

            const createResponse = await fetch(`${BACKEND_URL}/store/customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-publishable-api-key': PUBLISHABLE_KEY,
                },
                body: JSON.stringify({
                    email: tokenPayload.user_metadata?.email || tokenPayload.email || '',
                    first_name: tokenPayload.user_metadata?.given_name || tokenPayload.given_name || '',
                    last_name: tokenPayload.user_metadata?.family_name || tokenPayload.family_name || '',
                })
            })

            if (!createResponse.ok) {
                const errorText = await createResponse.text()
                console.error('[Google Auth] Customer creation failed:', errorText)
                // If it fails because customer already exists, continue anyway
                if (!errorText.includes('already') && !errorText.includes('exists')) {
                    return NextResponse.redirect(new URL('/login?error=customer_creation_failed', SITE_URL))
                }
            }
        }

        // Step 3: Set the token as an httpOnly cookie
        const cookieStore = await cookies()
        cookieStore.set('medusa_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        })

        // Step 4: Redirect to homepage or account
        return NextResponse.redirect(new URL('/', SITE_URL))

    } catch (error) {
        console.error('[Google Auth] Error:', error)
        return NextResponse.redirect(new URL('/login?error=google_auth_error', SITE_URL))
    }
}
