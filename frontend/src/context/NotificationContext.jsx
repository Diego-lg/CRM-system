import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase, DEMO_MODE, getCurrentUser } from "../lib/supabase";

// Demo data key
const DEMO_NOTIFICATIONS_KEY = "crm_notifications";

const NotificationContext = createContext(null);

// Helper to get demo notifications
const getDemoNotifications = () => {
  try {
    const stored = localStorage.getItem(DEMO_NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

const saveDemoNotifications = (notifications) => {
  try {
    localStorage.setItem(DEMO_NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error("Failed to save notifications:", e);
  }
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();

    // Subscribe to real-time notifications in production
    if (!DEMO_MODE) {
      const subscription = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          (payload) => {
            const newNotification = payload.new;
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          },
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Update unread count when notifications change
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  // Load notifications from storage/Supabase
  const loadNotifications = async () => {
    setLoading(true);
    try {
      if (DEMO_MODE) {
        const demoNotifs = getDemoNotifications();
        setNotifications(demoNotifs);
      } else {
        const { data: user } = await getCurrentUser();
        if (user) {
          const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50);

          if (!error) {
            setNotifications(data || []);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  // Add a new notification
  const addNotification = useCallback(
    async ({ type, title, message, linkTo }) => {
      try {
        if (DEMO_MODE) {
          const newNotif = {
            id: `notif_${Date.now()}`,
            user_id: "demo-user",
            type,
            title,
            message,
            read: false,
            link_to: linkTo || null,
            created_at: new Date().toISOString(),
          };
          const current = getDemoNotifications();
          saveDemoNotifications([newNotif, ...current]);
          setNotifications((prev) => [newNotif, ...prev]);
          return { data: newNotif, error: null };
        }

        const { data: user } = await getCurrentUser();
        if (!user) return { data: null, error: new Error("Not authenticated") };

        const { data, error } = await supabase
          .from("notifications")
          .insert({
            user_id: user.id,
            type,
            title,
            message,
            link_to: linkTo,
          })
          .select()
          .single();

        if (!error) {
          setNotifications((prev) => [data, ...prev]);
        }

        return { data, error };
      } catch (err) {
        console.error("Failed to add notification:", err);
        return { data: null, error: err };
      }
    },
    [],
  );

  // Mark notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      if (DEMO_MODE) {
        const current = getDemoNotifications();
        const updated = current.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        );
        saveDemoNotifications(updated);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        return { error: null };
      }

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
      }

      return { error };
    } catch (err) {
      console.error("Failed to mark as read:", err);
      return { error: err };
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      if (DEMO_MODE) {
        const current = getDemoNotifications();
        const updated = current.map((n) => ({ ...n, read: true }));
        saveDemoNotifications(updated);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        return { error: null };
      }

      const { data: user } = await getCurrentUser();
      if (!user) return { error: new Error("Not authenticated") };

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }

      return { error };
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      return { error: err };
    }
  }, []);

  // Delete a notification
  const deleteNotification = useCallback(async (id) => {
    try {
      if (DEMO_MODE) {
        const current = getDemoNotifications();
        saveDemoNotifications(current.filter((n) => n.id !== id));
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        return { error: null };
      }

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (!error) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }

      return { error };
    } catch (err) {
      console.error("Failed to delete notification:", err);
      return { error: err };
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      if (DEMO_MODE) {
        saveDemoNotifications([]);
        setNotifications([]);
        return { error: null };
      }

      const { data: user } = await getCurrentUser();
      if (!user) return { error: new Error("Not authenticated") };

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (!error) {
        setNotifications([]);
      }

      return { error };
    } catch (err) {
      console.error("Failed to clear notifications:", err);
      return { error: err };
    }
  }, []);

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    const icons = {
      email_sent: "✉️",
      deal_won: "🎉",
      deal_lost: "😢",
      task_due: "⏰",
      mention: "📣",
      assignment: "👤",
      system: "⚙️",
    };
    return icons[type] || "🔔";
  };

  const value = {
    notifications,
    loading,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    loadNotifications,
    getNotificationIcon,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return context;
}

export default NotificationContext;
