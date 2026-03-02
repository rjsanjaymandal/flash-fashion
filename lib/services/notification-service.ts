
export class NotificationService {
  /**
   * Broadcasts a notification to administrators.
   */
  static async notifyAdmins(
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
    actionUrl?: string
  ) {
    console.log(`[NotificationService][Admin][${type}] ${title}: ${message}`, actionUrl ? `(Action: ${actionUrl})` : '');
  }

  /**
   * Notify a specific user.
   */
  static async notifyUser(
    userId: string,
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
    actionUrl?: string
  ) {
    console.log(`[NotificationService][User][${userId}][${type}] ${title}: ${message}`, actionUrl ? `(Action: ${actionUrl})` : '');
  }
}
