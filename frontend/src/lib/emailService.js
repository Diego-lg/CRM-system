import { supabase, DEMO_MODE, getCurrentUser } from "./supabase";

/**
 * Email Service for CRM
 * Handles email compose, send, and fetch operations
 */

// Demo data for email storage in localStorage
const DEMO_EMAILS_KEY = "crm_emails";

const getDemoEmails = () => {
  try {
    const stored = localStorage.getItem(DEMO_EMAILS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to parse demo emails:", e);
    return [];
  }
};

const saveDemoEmails = (emails) => {
  try {
    localStorage.setItem(DEMO_EMAILS_KEY, JSON.stringify(emails));
  } catch (e) {
    console.error("Failed to save demo emails:", e);
  }
};

// ==================== EMAIL SERVICE ====================

export const emailService = {
  /**
   * Send a new email
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} Created email
   */
  async send({
    contactId,
    companyId,
    fromAddress,
    toAddress,
    subject,
    body,
    attachments = [],
  }) {
    if (DEMO_MODE) {
      const newEmail = {
        id: `email_${Date.now()}`,
        contact_id: contactId || null,
        company_id: companyId || null,
        from_address: fromAddress,
        to_address: toAddress,
        subject,
        body,
        sent_at: new Date().toISOString(),
        read: false,
        archived: false,
        attachments,
        created_at: new Date().toISOString(),
      };
      const emails = getDemoEmails();
      emails.unshift(newEmail);
      saveDemoEmails(emails);
      return { data: newEmail, error: null };
    }

    const { data: user } = await getCurrentUser();
    const { data, error } = await supabase
      .from("emails")
      .insert({
        contact_id: contactId || null,
        company_id: companyId || null,
        from_address: fromAddress,
        to_address: toAddress,
        subject,
        body,
        created_by: user?.id,
      })
      .select()
      .single();

    // Handle attachments if any
    if (!error && attachments.length > 0) {
      for (const attachment of attachments) {
        await supabase.from("email_attachments").insert({
          email_id: data.id,
          filename: attachment.filename,
          url: attachment.url,
          file_size: attachment.file_size || 0,
        });
      }
    }

    return { data, error };
  },

  /**
   * Fetch emails for a contact or company
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of emails
   */
  async fetch({ contactId, companyId, limit = 50 }) {
    if (DEMO_MODE) {
      const emails = getDemoEmails();
      return {
        data: emails
          .filter(
            (e) =>
              (!contactId || e.contact_id === contactId) &&
              (!companyId || e.company_id === companyId),
          )
          .slice(0, limit),
        error: null,
      };
    }

    let query = supabase
      .from("emails")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (contactId) {
      query = query.eq("contact_id", contactId);
    }
    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  },

  /**
   * Get email by ID
   * @param {string} id - Email ID
   * @returns {Promise<Object>} Email data
   */
  async getById(id) {
    if (DEMO_MODE) {
      const emails = getDemoEmails();
      return { data: emails.find((e) => e.id === id) || null, error: null };
    }

    const { data, error } = await supabase
      .from("emails")
      .select("*")
      .eq("id", id)
      .single();
    return { data, error };
  },

  /**
   * Mark email as read
   * @param {string} id - Email ID
   * @returns {Promise<Object>} Updated email
   */
  async markAsRead(id) {
    if (DEMO_MODE) {
      const emails = getDemoEmails();
      const email = emails.find((e) => e.id === id);
      if (email) {
        email.read = true;
        saveDemoEmails(emails);
      }
      return { data: email, error: null };
    }

    const { data, error } = await supabase
      .from("emails")
      .update({ read: true })
      .eq("id", id)
      .select()
      .single();
    return { data, error };
  },

  /**
   * Archive an email
   * @param {string} id - Email ID
   * @returns {Promise<Object>} Updated email
   */
  async archive(id) {
    if (DEMO_MODE) {
      const emails = getDemoEmails();
      const email = emails.find((e) => e.id === id);
      if (email) {
        email.archived = true;
        saveDemoEmails(emails);
      }
      return { data: email, error: null };
    }

    const { data, error } = await supabase
      .from("emails")
      .update({ archived: true })
      .eq("id", id)
      .select()
      .single();
    return { data, error };
  },

  /**
   * Delete an email
   * @param {string} id - Email ID
   * @returns {Promise<Object>} Deletion result
   */
  async delete(id) {
    if (DEMO_MODE) {
      const emails = getDemoEmails();
      saveDemoEmails(emails.filter((e) => e.id !== id));
      return { data: { id }, error: null };
    }

    const { error } = await supabase.from("emails").delete().eq("id", id);
    return { data: { id }, error };
  },

  /**
   * Get attachments for an email
   * @param {string} emailId - Email ID
   * @returns {Promise<Array>} List of attachments
   */
  async getAttachments(emailId) {
    if (DEMO_MODE) {
      const emails = getDemoEmails();
      const email = emails.find((e) => e.id === emailId);
      return { data: email?.attachments || [], error: null };
    }

    const { data, error } = await supabase
      .from("email_attachments")
      .select("*")
      .eq("email_id", emailId);
    return { data: data || [], error };
  },
};

// ==================== EMAIL SYNC SERVICE ====================

export const emailSyncService = {
  /**
   * Get email sync status for current user
   * @returns {Promise<Object>} Sync configuration
   */
  async getStatus() {
    if (DEMO_MODE) {
      const stored = localStorage.getItem("crm_email_sync");
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
   * Connect email provider
   * @param {Object} config - Provider configuration
   * @returns {Promise<Object>} Sync record
   */
  async connect({ provider, accessToken, refreshToken, tokenExpiresAt }) {
    if (DEMO_MODE) {
      const syncConfig = {
        id: `sync_${Date.now()}`,
        provider,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        last_sync: null,
        is_active: true,
      };
      localStorage.setItem("crm_email_sync", JSON.stringify(syncConfig));
      return { data: syncConfig, error: null };
    }

    const { data: user } = await getCurrentUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    // Remove existing sync for this user
    await supabase
      .from("email_sync")
      .update({ is_active: false })
      .eq("user_id", user.id);

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
   * Disconnect email provider
   * @returns {Promise<Object>} Deletion result
   */
  async disconnect() {
    if (DEMO_MODE) {
      localStorage.removeItem("crm_email_sync");
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
   * Update last sync timestamp
   * @returns {Promise<Object>} Updated sync record
   */
  async updateLastSync() {
    if (DEMO_MODE) {
      const stored = localStorage.getItem("crm_email_sync");
      if (stored) {
        const syncConfig = JSON.parse(stored);
        syncConfig.last_sync = new Date().toISOString();
        localStorage.setItem("crm_email_sync", JSON.stringify(syncConfig));
        return { data: syncConfig, error: null };
      }
      return { data: null, error: null };
    }

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

export default { emailService, emailSyncService };
