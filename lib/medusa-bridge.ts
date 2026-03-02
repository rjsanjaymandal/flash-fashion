
export async function getMedusaCustomerData(email: string) {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    const secret = process.env.MEDUSA_BRIDGE_SECRET

    if (!secret) {
        console.error("MEDUSA_BRIDGE_SECRET is not defined")
        return null
    }

    try {
        const response = await fetch(`${backendUrl}/store/customer-bridge?email=${encodeURIComponent(email)}`, {
            headers: {
                "x-bridge-secret": secret
            },
            next: { revalidate: 0 }
        })

        if (!response.ok) {
            const error = await response.json()
            console.error("Medusa Bridge Error:", error)
            return null
        }

        const data = await response.json()
        return data as {
            customer: any,
            orders: any[]
        }
    } catch (error) {
        console.error("Failed to fetch from Medusa Bridge:", error)
        return null
    }
}

export async function updateMedusaCustomerData(
    customerId: string,
    action: string,
    data: any,
    emailOverride?: string
) {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    const secret = process.env.MEDUSA_BRIDGE_SECRET

    // If we don't have a customerId (guest), we use the emailOverride
    const email = emailOverride || 'system-bridge@flash.fashion'

    if (!secret) return { error: "Configuration Error" }

    try {
        const response = await fetch(`${backendUrl}/store/customer-bridge`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-bridge-secret": secret
            },
            body: JSON.stringify({ email, action, data })
        })

        const result = await response.json()
        if (!response.ok) return { error: result.message || "Bridge Update Failed" }

        return result
    } catch (error: any) {
        return { error: error.message || "Network Error" }
    }
}
export async function updateMedusaCustomerMetadata(
    customerId: string,
    metadata: Record<string, any>
) {
    return updateMedusaCustomerData(customerId, 'update_metadata', metadata)
}
