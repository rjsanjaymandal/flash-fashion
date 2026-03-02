import {
    AbstractPaymentProvider,
    PaymentProviderContext,
    PaymentProviderSessionResponse,
    PaymentResponse,
} from "@medusajs/framework/utils"

class ManualPaymentProvider extends AbstractPaymentProvider {
    static identifier = "manual"

    async capturePayment(paymentSessionData: any): Promise<PaymentResponse> {
        return { status: "captured" }
    }

    async authorizePayment(paymentSessionContext: PaymentProviderContext): Promise<PaymentProviderSessionResponse> {
        return { status: "authorized", data: {} }
    }

    async cancelPayment(paymentSessionData: any): Promise<any> {
        return {}
    }

    async deletePayment(paymentSessionData: any): Promise<any> {
        return {}
    }

    async getPaymentStatus(paymentSessionData: any): Promise<any> {
        return "captured"
    }

    async refundPayment(paymentSessionData: any, refundAmount: number): Promise<any> {
        return { status: "refunded" }
    }

    async updatePayment(paymentSessionContext: PaymentProviderContext): Promise<PaymentProviderSessionResponse> {
        return { status: "authorized", data: {} }
    }
}

export default ManualPaymentProvider
