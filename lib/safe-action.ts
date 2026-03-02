export type ActionResponse<T> = {
    success: boolean
    data?: T
    error?: string
}

export async function createSafeAction<Input, Output>(
    actionName: string,
    input: Input,
    handler: (input: Input) => Promise<Output>
): Promise<ActionResponse<Output>> {
    try {
        const result = await handler(input)
        return { success: true, data: result }
    } catch (e: any) {
        console.error(`[SafeAction][${actionName}] Failed:`, {
            error: e.message || 'Unknown error',
            stack: e.stack,
            input
        })

        return {
            success: false,
            error: e.message || "An unexpected error occurred."
        }
    }
}
