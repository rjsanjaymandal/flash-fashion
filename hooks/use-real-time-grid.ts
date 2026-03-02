import { useEffect } from 'react'
import { useStockStore, StockItem } from '@/store/use-stock-store'

/**
 * Unified Real-Time Grid Hook
 * Manages a single WebSocket channel for multiple products in a grid.
 * Prevents connection explosion when viewing many products at once.
 */
export function useRealTimeGrid(productIds: string[], initialStocks: Record<string, StockItem[]>) {
    const { stocks, setProductStock } = useStockStore()

    // 1. Bulk Initialize store
    useEffect(() => {
        productIds.forEach(id => {
            if (initialStocks[id] && !stocks[id]) {
                setProductStock(id, initialStocks[id])
            }
        })
    }, [productIds, initialStocks, setProductStock, stocks])

    // 2. Subscription removed for Medusa migration

    return { stocks }
}
