import { supabase, DEMO_MODE, getCurrentUser } from "./supabase";

/**
 * Calendar Service for CRM
 * Handles calendar event CRUD operations and sync
 */

// Demo data for calendar events in localStorage
const DEMO_EVENTS_KEY = "crm_calendar_events";
const DEMO_SYNC_KEY = "crm_calendar_sync";

const getDemoEvents = () => {
  try {
    const stored = localStorage.getItem(DEMO_EVENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to parse demo events:", e);
    return [];
  }
};

const saveDemoEvents = (events) => {
  try {
    localStorage.setItem(DEMO_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.error("Failed to save demo events:", e);
  }
};

// ==================== CALENDAR SERVICE ====================

export const calendarService = {
  /**
   * Create a new calendar event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  async create({
    title,
    description,
    startTime,
    endTime,
    location,
    color,
    linkedEntityType,
    linkedEntityId,
  }) {
    if (DEMO_MODE) {
      const newEvent = {
        id: `event_${Date.now()}`,
        title,
        description: description || "",
        start_time: startTime,
        end_time: endTime,
        location: location || "",
        color: color || "#4f46e5",
        linked_entity_type: linkedEntityType || null,
        linked_entity_id: linkedEntityId || null,
        created_at: new Date().toISOString(),
      };
      const events = getDemoEvents();
      events.unshift(newEvent);
      saveDemoEvents(events);
      return { data: newEvent, error: null };
    }

    const { data: user } = await getCurrentUser();
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        location,
        color,
        linked_entity_type: linkedEntityType,
        linked_entity_id: linkedEntityId,
        created_by: user?.id,
      })
      .select()
      .single();
    return { data, error };
  },

  /**
   * Get events with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of events
   */
  async getEvents({
    startDate,
    endDate,
    linkedEntityType,
    linkedEntityId,
    limit = 100,
  }) {
    if (DEMO_MODE) {
      let events = getDemoEvents();

      if (startDate) {
        events = events.filter(
          (e) => new Date(e.start_time) >= new Date(startDate),
        );
      }
      if (endDate) {
        events = events.filter(
          (e) => new Date(e.start_time) <= new Date(endDate),
        );
      }
      if (linkedEntityType) {
        events = events.filter(
          (e) => e.linked_entity_type === linkedEntityType,
        );
      }
      if (linkedEntityId) {
        events = events.filter((e) => e.linked_entity_id === linkedEntityId);
      }

      return { data: events.slice(0, limit), error: null };
    }

    let query = supabase
      .from("calendar_events")
      .select("*")
      .order("start_time", { ascending: true })
      .limit(limit);

    if (startDate) {
      query = query.gte("start_time", startDate);
    }
    if (endDate) {
      query = query.lte("start_time", endDate);
    }
    if (linkedEntityType) {
      query = query.eq("linked_entity_type", linkedEntityType);
    }
    if (linkedEntityId) {
      query = query.eq("linked_entity_id", linkedEntityId);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  },

  /**
   * Get event by ID
   * @param {string} id - Event ID
   * @returns {Promise<Object>} Event data
   */
  async getById(id) {
    if (DEMO_MODE) {
      const events = getDemoEvents();
      return { data: events.find((e) => e.id === id) || null, error: null };
    }

    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", id)
      .single();
    return { data, error };
  },

  /**
   * Update a calendar event
   * @param {string} id - Event ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated event
   */
  async update(id, updates) {
    if (DEMO_MODE) {
      const events = getDemoEvents();
      const eventIndex = events.findIndex((e) => e.id === id);
      if (eventIndex !== -1) {
        events[eventIndex] = { ...events[eventIndex], ...updates };
        saveDemoEvents(events);
        return { data: events[eventIndex], error: null };
      }
      return { data: null, error: new Error("Event not found") };
    }

    const { data, error } = await supabase
      .from("calendar_events")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    return { data, error };
  },

  /**
   * Delete a calendar event
   * @param {string} id - Event ID
   * @returns {Promise<Object>} Deletion result
   */
  async delete(id) {
    if (DEMO_MODE) {
      const events = getDemoEvents();
      saveDemoEvents(events.filter((e) => e.id !== id));
      return { data: { id }, error: null };
    }

    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", id);
    return { data: { id }, error };
  },

  /**
   * Get events for today
   * @returns {Promise<Array>} Today's events
   */
  async getTodayEvents() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    return this.getEvents({ startDate: startOfDay, endDate: endOfDay });
  },

  /**
   * Get upcoming events
   * @param {number} days - Number of days to look ahead
   * @returns {Promise<Array>} Upcoming events
   */
  async getUpcomingEvents(days = 7) {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.getEvents({
      startDate: now.toISOString(),
      endDate: future.toISOString(),
    });
  },
};

// ==================== CALENDAR SYNC SERVICE ====================

export const calendarSyncService = {
  /**
   * Get calendar sync status
   * @returns {Promise<Object>} Sync status
   */
  async getStatus() {
    if (DEMO_MODE) {
      const stored = localStorage.getItem(DEMO_SYNC_KEY);
      return { data: stored ? JSON.parse(stored) : null, error: null };
    }

    const { data: user } = await getCurrentUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("email_sync")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();
    return { data, error };
  },

  /**
   * Connect calendar provider (Google, Outlook, etc.)
   * @param {Object} config - Provider configuration
   * @returns {Promise<Object>} Sync record
   */
  async connect({ provider, accessToken, refreshToken, tokenExpiresAt }) {
    if (DEMO_MODE) {
      const syncConfig = {
        id: `cal_sync_${Date.now()}`,
        provider,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        last_sync: null,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(DEMO_SYNC_KEY, JSON.stringify(syncConfig));
      return { data: syncConfig, error: null };
    }

    const { data: user } = await getCurrentUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("email_sync")
      .insert({
        user_id: user.id,
        provider,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        is_active: true,
      })
      .select()
      .single();
    return { data, error };
  },

  /**
   * Disconnect calendar provider
   * @returns {Promise<Object>} Deletion result
   */
  async disconnect() {
    if (DEMO_MODE) {
      localStorage.removeItem(DEMO_SYNC_KEY);
      return { data: { success: true }, error: null };
    }

    const { data: user } = await getCurrentUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("email_sync")
      .delete()
      .eq("user_id", user.id);
    return { data: { success: !error }, error };
  },

  /**
   * Sync events with external calendar
   * @returns {Promise<Object>} Sync result
   */
  async sync() {
    if (DEMO_MODE) {
      const stored = localStorage.getItem(DEMO_SYNC_KEY);
      if (stored) {
        const syncConfig = JSON.parse(stored);
        syncConfig.last_sync = new Date().toISOString();
        localStorage.setItem(DEMO_SYNC_KEY, JSON.stringify(syncConfig));
        return { data: syncConfig, error: null };
      }
      return { data: null, error: new Error("No sync configuration") };
    }

    // In production, this would sync with Google Calendar, Outlook, etc.
    const { data: user } = await getCurrentUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("email_sync")
      .update({ last_sync: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_active", true)
      .select()
      .single();
    return { data, error };
  },
};

export default { calendarService, calendarSyncService };
