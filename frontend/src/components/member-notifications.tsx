"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface NotificationItem {
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  related_id: number | null;
  is_read: boolean;
  created_at: string | null;
}

interface NotificationResponse {
  count: number;
  unread_count: number;
  notifications: NotificationItem[];
}

export default function MemberNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      const response = await apiFetch("/api/notifications/");

      if (!response.ok) {
        throw new Error("Unable to load notifications.");
      }

      const data: NotificationResponse = await response.json();

      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const interval = window.setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await apiFetch(
        `/api/notifications/${notificationId}/read`,
        { method: "PATCH" }
      );

      if (!response.ok) {
        throw new Error("Unable to update notification.");
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.notification_id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );

      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update notification."
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await apiFetch(
        "/api/notifications/read-all",
        { method: "PATCH" }
      );

      if (!response.ok) {
        throw new Error("Unable to update notifications.");
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      setUnreadCount(0);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update notifications."
      );
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/[0.08] dark:bg-[#111113]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.08]">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Notifications
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                {unreadCount} unread
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500 dark:text-zinc-400">
                <Loader2 size={16} className="animate-spin" />
                Loading notifications...
              </div>
            ) : error ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={loadNotifications}
                  className="mt-3 text-xs font-medium text-teal-700 dark:text-teal-400"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell
                  size={25}
                  className="mx-auto text-slate-300 dark:text-zinc-600"
                />
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-zinc-300">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                  Updates about your loans and repayments will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.notification_id}
                  type="button"
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.notification_id);
                    }
                  }}
                  className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 dark:border-white/[0.06] dark:hover:bg-white/[0.04] ${
                    !notification.is_read
                      ? "bg-teal-50/50 dark:bg-teal-500/[0.05]"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        notification.is_read
                          ? "bg-transparent"
                          : "bg-teal-600"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">
                        {notification.title}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-zinc-400">
                        {notification.message}
                      </p>

                      <p className="mt-2 text-[11px] text-slate-400 dark:text-zinc-500">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-2.5 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                loadNotifications();
              }}
              className="w-full text-center text-xs font-medium text-slate-500 hover:text-teal-700 dark:text-zinc-400 dark:hover:text-teal-400"
            >
              Refresh notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}