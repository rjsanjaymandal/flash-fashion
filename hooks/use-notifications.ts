
import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"

export interface Notification {
    id: string
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    is_read: boolean
    action_url?: string | null
    created_at: string
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const { user } = useAuth()

    useEffect(() => {
        if (!user) {
            setNotifications([])
            setUnreadCount(0)
            return
        }

        const fetchNotifications = async () => {
            setIsLoading(true)
            // Stub 
            setNotifications([])
            setUnreadCount(0)
            setIsLoading(false)
        }

        fetchNotifications()

    }, [user])

    const markAsRead = async (id: string) => {
        // Optimistic
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const markAllAsRead = async () => {
        if (unreadCount === 0) return

        // Optimistic
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    const clearAll = async () => {
        // Optimistic
        setNotifications([])
        setUnreadCount(0)


        toast.success("Notifications cleared")
    }

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        clearAll
    }
}
