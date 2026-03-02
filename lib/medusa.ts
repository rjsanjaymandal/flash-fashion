import Medusa from "@medusajs/js-sdk"

// Initialize the Medusa SDK with the backend URL
export const medusaClient = new Medusa({
    baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
})
