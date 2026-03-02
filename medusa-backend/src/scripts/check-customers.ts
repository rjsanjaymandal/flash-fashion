import { exec } from "@medusajs/framework/utils"
import { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function checkCustomers({ container }) {
    const customerModuleService: ICustomerModuleService = container.resolve(Modules.CUSTOMER)

    const [customers, count] = await customerModuleService.listAndCount(
        {},
        { select: ["email", "id", "metadata"], take: 10 }
    )

    console.log(`Total Customers: ${count}`)
    console.log(JSON.stringify(customers, null, 2))
}
