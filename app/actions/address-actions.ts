'use server'

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createSafeAction } from "@/lib/safe-action"
import { updateMedusaCustomerData } from "@/lib/medusa-bridge"
import { getMedusaSession } from "./medusa-auth"

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

        // Add to Medusa
        const res = await updateMedusaCustomerData(customer.email!, "add_address", {
            first_name: validated.data.name,
            phone: validated.data.phone,
            address_1: validated.data.address_line1,
            address_2: validated.data.address_line2,
            city: validated.data.city,
            province: validated.data.state,
            postal_code: validated.data.pincode,
            country_code: "IN"
        })

        if (res.error) throw new Error(res.error)

        // If default, set it in metadata
        if (validated.data.is_default && res.address?.id) {
            await updateMedusaCustomerData(customer.email!, "set_default_address", {
                address_id: res.address.id
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

        const res = await updateMedusaCustomerData(customer.email!, "delete_address", {
            address_id: id
        })

        if (res.error) throw new Error(res.error)

        revalidatePath('/account')
        return { success: true }
    })
}

export async function setDefaultAddress(id: string) {
    return createSafeAction("setDefaultAddress", { id }, async ({ id }) => {
        const customer = await getMedusaSession()
        if (!customer) throw new Error("Unauthorized")

        const res = await updateMedusaCustomerData(customer.email!, "set_default_address", {
            address_id: id
        })

        if (res.error) throw new Error(res.error)

        revalidatePath('/account')
        return { success: true }
    })
}
