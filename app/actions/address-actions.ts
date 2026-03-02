'use server'

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createSafeAction } from "@/lib/safe-action"
import { getMedusaSession } from "./medusa-auth"
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

const addressSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    address_line1: z.string().min(1, "Address Line 1 is required"),
    address_line2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    pincode: z.string().min(6, "Pincode is required"),
    country: z.string().default("India"),
    is_default: z.boolean().default(false)
})

export async function addAddress(formData: FormData) {
    return createSafeAction("addAddress", {
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        address_line1: formData.get('address_line1') as string,
        address_line2: formData.get('address_line2') as string,
        city: formData.get('city') as string,
        state: formData.get('state') as string,
        pincode: formData.get('pincode') as string,
        is_default: formData.get('is_default') === 'on'
    }, async (rawData) => {
        const customer = await getMedusaSession()
        if (!customer) throw new Error("Unauthorized")

        const validated = addressSchema.safeParse(rawData)
        if (!validated.success) throw new Error(validated.error.issues[0].message)

        const headers = await getHeaders()

        // 1. Add Address to Medusa via POST
        const createRes = await fetch(`${BACKEND_URL}/store/customers/me/addresses`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                address: {
                    first_name: validated.data.name,
                    phone: validated.data.phone,
                    address_1: validated.data.address_line1,
                    address_2: validated.data.address_line2,
                    city: validated.data.city,
                    province: validated.data.state,
                    postal_code: validated.data.pincode,
                    country_code: "in",
                    metadata: {
                        is_default: validated.data.is_default
                    }
                }
            })
        })

        if (!createRes.ok) {
            const err = await createRes.json()
            throw new Error(err.message || "Failed to add address")
        }

        const data = await createRes.json()
        const newAddressId = data.customer?.addresses?.[data.customer.addresses.length - 1]?.id

        // 2. Set Default (if requested)
        if (validated.data.is_default && newAddressId) {
            // Fetch existing customer data to preserve previous metadata
            const currentMetadata = customer.metadata || {}
            await fetch(`${BACKEND_URL}/store/customers/me`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    metadata: {
                        ...currentMetadata,
                        default_address_id: newAddressId
                    }
                })
            })
        }

        revalidatePath('/account')
        return { success: true }
    })
}

export async function deleteAddress(id: string) {
    return createSafeAction("deleteAddress", { id }, async ({ id }) => {
        const customer = await getMedusaSession()
        if (!customer) throw new Error("Unauthorized")

        const headers = await getHeaders()

        const res = await fetch(`${BACKEND_URL}/store/customers/me/addresses/${id}`, {
            method: 'DELETE',
            headers
        })

        if (!res.ok) {
            throw new Error("Failed to delete address")
        }

        revalidatePath('/account')
        return { success: true }
    })
}

export async function setDefaultAddress(id: string) {
    return createSafeAction("setDefaultAddress", { id }, async ({ id }) => {
        const customer = await getMedusaSession()
        if (!customer) throw new Error("Unauthorized")

        const headers = await getHeaders()
        const currentMetadata = customer.metadata || {}

        const res = await fetch(`${BACKEND_URL}/store/customers/me`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                metadata: {
                    ...currentMetadata,
                    default_address_id: id
                }
            })
        })

        if (!res.ok) {
            throw new Error("Failed to set default address")
        }

        revalidatePath('/account')
        return { success: true }
    })
}
