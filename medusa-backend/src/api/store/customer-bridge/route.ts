import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const secret = req.headers["x-bridge-secret"]
    const email = req.query.email as string

    if (secret !== process.env.MEDUSA_BRIDGE_SECRET) {
        return res.status(401).json({ message: "Unauthorized Bridge Access" })
    }

    if (!email) {
        return res.status(400).json({ message: "Email is required" })
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // 1. Fetch Customer
    const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["*", "addresses.*", "metadata"],
        filters: {
            email: email,
        },
    })

    if (!customers || customers.length === 0) {
        return res.status(404).json({ message: "Customer not found" })
    }

    const customer = customers[0]

    // 2. Fetch Orders for this Customer
    // Use the query graph to get orders as well
    const { data: orders } = await query.graph({
        entity: "order",
        fields: ["*", "items.*", "shipping_address.*"],
        filters: {
            customer_id: customer.id
        },
        pagination: {
            order: {
                created_at: "DESC"
            }
        }
    })

    return res.json({
        customer,
        orders
    })
}

export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const secret = req.headers["x-bridge-secret"]
    if (secret !== process.env.MEDUSA_BRIDGE_SECRET) {
        return res.status(401).json({ message: "Unauthorized Bridge Access" })
    }

    const { email, action, data } = req.body as any

    if (!email || !action) {
        return res.status(400).json({ message: "Email and action are required" })
    }

    const customerService = req.scope.resolve(Modules.CUSTOMER)
    const productModuleService = req.scope.resolve(Modules.PRODUCT)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Verify Customer
    const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "email", "metadata"],
        filters: { email }
    })

    if (!customers || customers.length === 0) {
        return res.status(404).json({ message: "Customer not found" })
    }
    const customer = customers[0]

    try {
        switch (action) {
            case "update_profile": {
                const { first_name, last_name, metadata } = data
                await customerService.updateCustomers(customer.id, {
                    first_name,
                    last_name,
                    metadata: {
                        ...(customer.metadata || {}),
                        ...(metadata || {})
                    }
                })
                return res.json({ success: true, message: "Profile updated" })
            }

            case "add_address": {
                const address = await customerService.createAddresses({
                    ...data,
                    customer_id: customer.id
                })
                return res.json({ success: true, address })
            }

            case "delete_address": {
                const { address_id } = data
                await customerService.deleteAddresses(address_id)
                return res.json({ success: true, message: "Address deleted" })
            }

            case "update_waitlist_entry": {
                const { variant_id, waitlist } = data
                await productModuleService.updateVariants([{
                    id: variant_id,
                    metadata: { ...((await productModuleService.retrieveVariant(variant_id)).metadata || {}), waitlist }
                }])
                return res.json({ success: true })
            }

            case "vote_concept": {
                const { concept_id, customer_id } = data
                // Retrieve "Global" product or specific concept product
                // For simplicity, we'll store all concepts in a "Global" product metadata
                const [globalProduct] = await productModuleService.listProducts({ handle: "flash-global" }, { select: ["metadata"] })
                if (!globalProduct) return res.status(404).json({ message: "Global product not found" })

                const concepts = (globalProduct.metadata?.concepts as any[]) || []
                const concept = concepts.find(c => c.id === concept_id)
                if (concept) {
                    concept.vote_count = (concept.vote_count || 0) + 1
                    await productModuleService.updateProducts(globalProduct.id, { metadata: { ...globalProduct.metadata, concepts } })

                    // Also record vote on customer metadata to prevent double voting
                    const customer = await customerService.retrieveCustomer(customer_id)
                    const voted_concepts = (customer.metadata?.voted_concepts as string[]) || []
                    if (!voted_concepts.includes(concept_id)) {
                        voted_concepts.push(concept_id)
                        await customerService.updateCustomers(customer_id, { metadata: { ...customer.metadata, voted_concepts } })
                    }
                }
                return res.json({ success: true })
            }

            case "get_settings": {
                const [globalProduct] = await productModuleService.listProducts({ handle: "flash-global" }, { select: ["metadata"] })
                if (!globalProduct) return res.status(404).json({ message: "Global product not found" })

                const settings = (globalProduct.metadata?.settings as any) || {}
                return res.json({ success: true, settings })
            }

            case "update_settings": {
                const { key, value } = data
                const [globalProduct] = await productModuleService.listProducts({ handle: "flash-global" }, { select: ["metadata"] })
                if (!globalProduct) return res.status(404).json({ message: "Global product not found" })

                const settings = (globalProduct.metadata?.settings as any) || {}
                settings[key] = value
                await productModuleService.updateProducts(globalProduct.id, { metadata: { ...globalProduct.metadata, settings } })
                return res.json({ success: true })
            }

            case "set_default_address": {
                const { address_id } = data
                await customerService.updateCustomers(customer.id, {
                    metadata: {
                        ...(customer.metadata || {}),
                        default_address_id: address_id
                    }
                })
                return res.json({ success: true, message: "Default address set" })
            }

            case "add_review": {
                const { product_id, review } = data
                const product = await productModuleService.retrieveProduct(product_id)
                const reviews = (product.metadata?.reviews as any[]) || []
                reviews.push({ ...review, id: Date.now().toString(), created_at: new Date().toISOString() })
                await productModuleService.updateProducts(product_id, { metadata: { ...product.metadata, reviews } })
                return res.json({ success: true, message: "Review added" })
            }

            case "add_to_waitlist": {
                const { variant_id, email, user_name } = data
                // Retrieve variant with metadata using query graph
                const { data: variants } = await query.graph({
                    entity: "variant",
                    fields: ["id", "metadata"],
                    filters: { id: variant_id }
                })

                if (!variants || variants.length === 0) return res.status(404).json({ message: "Variant not found" })
                const variant = variants[0]

                const waitlist = (variant.metadata?.waitlist as any[]) || []
                waitlist.push({ email, user_name, created_at: new Date().toISOString() })

                await productModuleService.updateVariants([{
                    id: variant_id,
                    metadata: { ...variant.metadata, waitlist }
                }])
                return res.json({ success: true, message: "Added to waitlist" })
            }

            default:
                return res.status(400).json({ message: "Invalid action" })
        }
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Action failed" })
    }
}
