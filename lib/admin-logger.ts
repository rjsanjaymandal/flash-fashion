'use server'

import { headers } from "next/headers"

type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'PURGE_CACHE'

export async function logAdminAction(
  tableName: string,
  recordId: string,
  action: ActionType,
  changes?: Record<string, any>
) {
  try {
    // Logging temporarily disabled or moved to console during Medusa migration
    console.log(`[Admin] ${action} on ${tableName}:${recordId}`);
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}
