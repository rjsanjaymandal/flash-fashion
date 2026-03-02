'use server'

import { medusaClient } from '@/lib/medusa'
import { revalidatePath } from 'next/cache'

export type Address = {
    id: string
    name: string
    address_line1: string
    address_line2?: string | null
    city: string
    state: string
    pincode: string
    country: string
    phone: string
    is_default: boolean
}

/**
 * Fetches addresses for the current customer from Medusa.
 */
export async function getAddresses() {
    try {
        const { customer } = await medusaClient.store.customer.retrieve();
        if (!customer || !customer.addresses) return [];

        return customer.addresses.map((addr: any) => ({
            id: addr.id,
            name: `${addr.first_name} ${addr.last_name}`.trim(),
            address_line1: addr.address_1,
            address_line2: addr.address_2,
            city: addr.city,
            state: addr.province,
            pincode: addr.postal_code,
            country: addr.country_code,
            phone: addr.phone,
            is_default: false // Medusa addresses don't have a native 'is_default' boolean, usually handled by customer.billing_address_id or shipping_address_id
        }));
    } catch (error) {
        console.error('[getAddresses] Failed:', error);
        return [];
    }
}

/**
 * Adds a new address to the Medusa customer.
 */
export async function addAddress(formData: FormData) {
    try {
        const name = (formData.get('name') as string || '').split(' ');
        const firstName = name[0] || '';
        const lastName = name.slice(1).join(' ') || 'User';

        const addressData = {
            first_name: firstName,
            last_name: lastName,
            address_1: formData.get('address1') as string,
            address_2: formData.get('address2') as string,
            city: formData.get('city') as string,
            province: formData.get('state') as string,
            postal_code: formData.get('pincode') as string,
            phone: formData.get('phone') as string,
            country_code: 'IN' // Standardized for India
        };

        await medusaClient.store.customer.createAddress(addressData);

        revalidatePath('/checkout')
        return { success: true }
    } catch (error) {
        console.error('[addAddress] Failed:', error);
        return { error: 'Failed to add address' }
    }
}
