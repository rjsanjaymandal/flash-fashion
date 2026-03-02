import { useEffect, useState } from 'react'
import { useStockStore, StockItem } from '@/store/use-stock-store'

export type { StockItem }

export function useRealTimeHype(productId: string, initialStock: StockItem[] = []) {
    const { stocks, setProductStock } = useStockStore()
    const [viewerCount, setViewerCount] = useState(1) // Always at least 1 (me)

    // 1. Initialize store with initial data on mount
    useEffect(() => {
        if (initialStock.length > 0 && !stocks[productId]) {
            setProductStock(productId, initialStock)
        }
    }, [productId, initialStock, setProductStock, stocks])

    // 2. Real-Time Subscription (Presence + Stock) disabled for Medusa

    // 3. Select from store
    const stock = stocks[productId] || initialStock
    const loading = false

    return { stock, loading, viewerCount }
}
