/**
 * EventBus Service
 * Simple event emitter for internal storefront orchestration.
 * (Placeholder for Medusa migration)
 */
export class EventBus {
    static async publish(event: string, data: any) {
        console.log(`[EventBus] ${event}:`, data)
        // Future: Add integration with Medusa subscribers or storefront notifications
    }
}
