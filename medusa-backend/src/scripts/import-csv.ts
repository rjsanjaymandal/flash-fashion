import {
    createProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
    ExecArgs,
} from "@medusajs/framework/types"
import * as fs from "fs"
import * as path from "path"
import csv from "csv-parser"

// The path to your local data export
const CSV_FILE_PATH = path.resolve(process.cwd(), "products.csv")

// Interface representing the expected columns in the CSV file
interface CsvProductRow {
    id: string
    title: string
    description: string
    price: string
    size: string
    color: string
    stock_quantity: string
    cloudinary_image_url: string
}

export default async function importProductsFromCsv({ container }: ExecArgs) {
    const logger = container.resolve("logger")

    logger.info(`Starting CSV import from ${CSV_FILE_PATH}...`)

    if (!fs.existsSync(CSV_FILE_PATH)) {
        logger.error(`CSV file not found at ${CSV_FILE_PATH}`)
        return
    }

    const rows: CsvProductRow[] = []

    // Step 1: Parse the CSV file
    await new Promise((resolve, reject) => {
        fs.createReadStream(CSV_FILE_PATH)
            .pipe(csv())
            .on("data", (data) => rows.push(data))
            .on("end", resolve)
            .on("error", reject)
    })

    logger.info(`Parsed ${rows.length} rows from the CSV file.`)

    // Group rows by 'title' so we can attach multiple variants to the same parent product
    const productsMap = new Map<string, CsvProductRow[]>()
    for (const row of rows) {
        const title = row.title.trim()
        if (!productsMap.has(title)) {
            productsMap.set(title, [])
        }
        productsMap.get(title)!.push(row)
    }

    const productsToCreate: any[] = []

    // Step 2: Transform into Medusa DTOs
    for (const [title, variantRows] of productsMap.entries()) {
        const parentProd = variantRows[0]

        // Determine the valid option values for this specific product based on the CSV
        const sizeValues = [...new Set(variantRows.map((r) => r.size.trim()).filter(Boolean))]
        const colorValues = [...new Set(variantRows.map((r) => r.color.trim()).filter(Boolean))]

        const options: any[] = []
        if (sizeValues.length) {
            options.push({ title: "Size", values: sizeValues })
        }
        if (colorValues.length) {
            options.push({ title: "Color", values: colorValues })
        }

        const variants = variantRows.map((row) => {
            const priceVal = parseFloat(row.price)

            const variantOptions: Record<string, string> = {}
            if (row.size) variantOptions["Size"] = row.size.trim()
            if (row.color) variantOptions["Color"] = row.color.trim()

            return {
                title: `${row.size || ""} ${row.color || ""}`.trim() || "Default",
                prices: [
                    {
                        currency_code: "inr", // Ensure this matches your expected currency!
                        amount: priceVal,
                    },
                ],
                manage_inventory: true,
                options: variantOptions,
            }
        })

        productsToCreate.push({
            title: parentProd.title,
            description: parentProd.description,
            options: options,
            variants: variants,
            // Map your Cloudinary URL directly as the product's primary image
            images: [
                {
                    url: parentProd.cloudinary_image_url,
                },
            ],
            thumbnail: parentProd.cloudinary_image_url,
        })
    }

    logger.info(`Prepared ${productsToCreate.length} top-level products for creation.`)

    // Step 3: Load into Medusa
    try {
        const { result } = await createProductsWorkflow(container).run({
            input: {
                products: productsToCreate,
            },
        })

        logger.info(`Successfully created ${result.length} products with their variants!`)
    } catch (error) {
        logger.error("Failed to create products in Medusa:", error)
    }
}
