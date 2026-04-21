# Phase 3: Communication & Collaboration

## Overview
This phase adds email integration, calendar sync, real-time notifications, and comments/notes on records to improve team collaboration and communication.

---

## 1. Email Integration

### 1.1 Database Schema

#### Add to `supabase/schema.sql`
```sql
-- ============================================
-- EMAIL INTEGRATION
-- ============================================

CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    body_html TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'delivered', 'opened', 'replied', 'failed'
    related_to_type TEXT, -- 'contact', 'company', 'deal'
    related_to_id UUID,
    template_id UUID REFERENCES email_templates(id),
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    filename TEXT,
    file_path TEXT,
    file_size INTEGER,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    provider TEXT NOT NULL, -- 'gmail', 'outlook'
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own emails" ON emails FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Users can view own email attachments" ON email_attachments FOR SELECT USING (
    EXISTS (SELECT 1 FROM emails WHERE emails.id = email_attachments.email_id AND emails.created_by = auth.uid())
);
CREATE POLICY "Users can manage own email sync" ON email_sync FOR ALL USING (auth.uid() = user_id);
```

### 1.2 Email Service

#### Create `frontend/src/lib/emailService.js`
```javascript
import { supabase } from './supabase';

/**
 * Email Service - handles email sending and templates
 */
export const emailService = {
  /**
   * Send email via Supabase Edge Function or backend
   */
  async send({ to, subject, body, bodyHtml, templateId, relatedTo }) {
    const { data: { user } } = await supabase.auth.getUser();

    // Insert email record
    const { data, error } = await supabase
      .from('emails')
      .insert({
        from_address: user.email,
        to_address: to,
        subject,
        body,
        body_html: bodyHtml,
        status: 'draft',
        template_id: templateId,
        related_to_type: relatedTo?.type,
        related_to_id: relatedTo?.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Call edge function to actually send
    const { error: sendError } = await supabase.functions.invoke('send-email', {
      body: { emailId: data.id, to, subject, body, bodyHtml },
    });

    if (sendError) {
      await supabase.from('emails').update({ status: 'failed', error_message: sendError.message }).eq('id', data.id);
      throw sendError;
    }

    // Update status to sent
    await supabase.from('emails').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', data.id);

    return data;
  },

  /**
   * Get email templates
   */
  async getTemplates() {
    const { data, error } = await supabase.from('email_templates').select('*');
    if (error) throw error;
    return data;
  },

  /**
   * Create email template
   */
  async createTemplate({ name, subject, body, isDefault }) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        name,
        subject,
        body,
        is_default: isDefault,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get emails for a contact/company/deal
   */
  async getEmailsForRecord(recordType, recordId) {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('related_to_type', recordType)
      .eq('related_to_id', recordId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Interpolate template variables
   */
  interpolateTemplate(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  },

  /**
   * Compose from template
   */
  async composeFromTemplate(templateId, variables) {
    const { data: templates } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (!templates) throw new Error('Template not found');

    return {
      subject: this.interpolateTemplate(templates.subject, variables),
      body: this.interpolateTemplate(templates.body, variables),
    };
  },
};
```

### 1.3 Email Composer Component

#### Create `frontend/src/components/EmailComposer.jsx`
```jsx
import React, { useState } from 'react';
import { X, Send, Mail, FileText } from 'lucide-react';
import { emailService } from '../lib/emailService';

export default function EmailComposer({ 
  open, 
  onClose, 
  to = '', 
  subject = '', 
  relatedTo = null,
  onSent 
}) {
  const [toAddress, setToAddress] = useState(to);
  const [emailSubject, setEmailSubject] = useState(subject);
  const [body, setBody] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sending, setSending] = useState(false);

  useState(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      const data = await emailService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleTemplateSelect = async (templateId) => {
    setSelectedTemplate(templateId);
    try {
      // Get contact/company variables for interpolation
      const variables = relatedTo ? { name: relatedTo.name || '' } : {};
      const { subject, body: templateBody } = await emailService.composeFromTemplate(templateId, variables);
      setEmailSubject(subject);
      setBody(templateBody);
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const handleSend = async () => {
    if (!toAddress || !emailSubject || !body) return;

    setSending(true);
    try {
      await emailService.send({
        to: toAddress,
        subject: emailSubject,
        body,
        relatedTo,
      });
      onSent?.();
      onClose();
    } catch (error) {
      alert('Failed to send email: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Mail size={20} />
            <h3 className="font-semibold">New Email</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Template selector */}
          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-gray-400" />
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="input flex-1"
              >
                <option value="">Select template (optional)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* To */}
          <div>
            <label className="label">To</label>
            <input
              type="email"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="input w-full"
              placeholder="recipient@example.com"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="label">Subject</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="input w-full"
              placeholder="Email subject"
            />
          </div>

          {/* Body */}
          <div>
            <label className="label">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input w-full min-h-[200px]"
              placeholder="Write your message..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!toAddress || !emailSubject || !body || sending}
            className="btn-primary disabled:opacity-50"
          >
            <Send size={16} />
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 2. Calendar Integration

### 2.1 Database Schema

#### Add to `supabase/schema.sql`
```sql
-- ============================================
-- CALENDAR SYNC
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT, -- Google/Outlook event ID
    provider TEXT NOT NULL, -- 'google', 'outlook'
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    location TEXT,
    attendees JSONB, -- [{email, name}]
    activity_id UUID REFERENCES activities(id),
    crm_record_type TEXT, -- 'contact', 'deal'
    crm_record_id UUID,
    created_by UUID REFERENCES auth.users(id),
    sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending', 'failed'
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calendar events" ON calendar_events FOR ALL USING (auth.uid() = created_by);

-- Connect activities to calendar events
ALTER TABLE activities ADD COLUMN IF NOT EXISTS calendar_event_id UUID REFERENCES calendar_events(id);
```

### 2.2 Calendar Service

#### Create `frontend/src/lib/calendarService.js`
```javascript
import { supabase } from './supabase';

/**
 * Calendar Service - handles Google/Outlook calendar sync
 */
export const calendarService = {
  /**
   * Connect Google Calendar
   */
  async connectGoogle() {
    // OAuth flow would be handled by Supabase Edge Function
    const { error } = await supabase.functions.invoke('calendar-auth', {
      body: { provider: 'google' },
    });
    if (error) throw error;
  },

  /**
   * Connect Outlook Calendar
   */
  async connectOutlook() {
    const { error } = await supabase.functions.invoke('calendar-auth', {
      body: { provider: 'outlook' },
    });
    if (error) throw error;
  },

  /**
   * Sync activity to calendar
   */
  async syncActivityToCalendar(activity, userId) {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        title: activity.title,
        description: activity.notes,
        start_time: `${activity.date}T${activity.time || '09:00'}:00`,
        end_time: activity.duration 
          ? `${activity.date}T${activity.time || '09:00'}:00` // Simplified
          : null,
        activity_id: activity.id,
        crm_record_type: 'contact',
        crm_record_id: activity.contact,
        created_by: userId,
        provider: 'google', // Default, would check user's connected calendars
      })
      .select()
      .single();

    if (error) throw error;

    // Call edge function to create calendar event
    await supabase.functions.invoke('sync-calendar', {
      body: { eventId: data.id, action: 'create' },
    });

    return data;
  },

  /**
   * Get calendar events for date range
   */
  async getEvents(startDate, endDate) {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Disconnect calendar
   */
  async disconnect(provider) {
    await supabase
      .from('email_sync')
      .update({ is_active: false })
      .eq('provider', provider);

    await supabase
      .from('calendar_events')
      .delete()
      .eq('provider', provider);
  },
};
```

### 2.3 Calendar Sync Component

#### Create `frontend/src/components/CalendarSync.jsx`
```jsx
import React, { useState } from 'react';
import { Calendar, Link, Unlink, RefreshCw, Check, X } from 'lucide-react';
import { calendarService } from '../lib/calendarService';
import useCRM from '../store/useCRM';

export default function CalendarSync() {
  const [connecting, setConnecting] = useState(null);
  const user = useCRM((s) => s.user);

  const handleConnect = async (provider) => {
    setConnecting(provider);
    try {
      if (provider === 'google') {
        await calendarService.connectGoogle();
      } else if (provider === 'outlook') {
        await calendarService.connectOutlook();
      }
    } catch (error) {
      alert('Failed to connect: ' + error.message);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider) => {
    if (!confirm(`Disconnect ${provider} calendar?`)) return;

    try {
      await calendarService.disconnect(provider);
    } catch (error) {
      alert('Failed to disconnect: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Calendar Integration</h4>

      <div className="space-y-3">
        {/* Google Calendar */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium">Google Calendar</p>
              <p className="text-xs text-gray-500">Sync activities with Google Calendar</p>
            </div>
          </div>
          <button
            onClick={() => handleConnect('google')}
            disabled={connecting}
            className="btn-secondary text-sm"
          >
            {connecting === 'google' ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Link size={14} />
            )}
            Connect
          </button>
        </div>

        {/* Outlook Calendar */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#0078D4" d="M1 4.5A1.5 1.5 0 0 1 2.5 3h19A1.5 1.5 0 0 1 23 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-19A1.5 1.5 0 0 1 1 19.5v-15zM2.5 5v14h19V5h-19z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium">Outlook Calendar</p>
              <p className="text-xs text-gray-500">Sync activities with Outlook</p>
            </div>
          </div>
          <button
            onClick={() => handleConnect('outlook')}
            disabled={connecting}
            className="btn-secondary text-sm"
          >
            {connecting === 'outlook' ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Link size={14} />
            )}
            Connect
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Calendar sync allows you to view CRM activities in your external calendar and get meeting reminders.
      </p>
    </div>
  );
}
```

---

## 3. Real-time Notifications

### 3.1 Database Schema

#### Add to `supabase/schema.sql`
```sql
-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL, -- 'deal_assigned', 'deal_won', 'activity_reminder', 'mention', 'comment'
    title TEXT NOT NULL,
    message TEXT,
    link TEXT, -- URL to navigate to
    is_read BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
```

### 3.2 Notification System

#### Create `frontend/src/context/NotificationContext.jsx`
```jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${supabase.auth.getUser()?.user?.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev]);
        setUnreadCount((prev) => prev + 1);
        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification(payload.new.title, {
            body: payload.new.message,
            icon: '/crm-icon.svg',
          });
        }
      })
      .subscribe();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
```

### 3.3 Notification Bell Component

#### Create `frontend/src/components/NotificationBell.jsx`
```jsx
import React, { useState } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const [showDropdown, setShowDropdown] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border rounded-xl shadow-lg z-50">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t">
            <button
              onClick={() => setShowDropdown(false)}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 4. Comments & Notes

### 4.1 Database Schema

#### Add to `supabase/schema.sql`
```sql
-- ============================================
-- COMMENTS & NOTES
-- ============================================

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    record_type TEXT NOT NULL, -- 'contact', 'company', 'deal', 'activity'
    record_id UUID NOT NULL,
    parent_id UUID REFERENCES comments(id), -- For threaded replies
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = created_by);

-- Index for faster queries
CREATE INDEX idx_comments_record ON comments(record_type, record_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
```

### 4.2 Comments Component

#### Create `frontend/src/components/Comments.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, MoreVertical, Edit2, Trash2, Reply } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useCRM from '../store/useCRM';

export default function Comments({ recordType, recordId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = useCRM((s) => s.user);

  useEffect(() => {
    loadComments();
  }, [recordType, recordId]);

  const loadComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*, profile:created_by(full_name, avatar)')
      .eq('record_type', recordType)
      .eq('record_id', recordId)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Load replies for each comment
      const commentsWithReplies = await Promise.all(
        data.map(async (comment) => {
          const { data: replies } = await supabase
            .from('comments')
            .select('*, profile:created_by(full_name, avatar)')
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });
          return { ...comment, replies: replies || [] };
        })
      );
      setComments(commentsWithReplies);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment = {
      content: newComment,
      record_type: recordType,
      record_id: recordId,
      parent_id: replyingTo,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from('comments')
      .insert(comment)
      .select('*, profile:created_by(full_name, avatar)')
      .single();

    if (!error && data) {
      if (replyingTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyingTo
              ? { ...c, replies: [...(c.replies || []), data] }
              : c
          )
        );
      } else {
        setComments((prev) => [{ ...data, replies: [] }, ...prev]);
      }
      setNewComment('');
      setReplyingTo(null);
    }
  };

  const handleEdit = async (commentId, newContent) => {
    const { data, error } = await supabase
      .from('comments')
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select('*, profile:created_by(full_name, avatar)')
      .single();

    if (!error && data) {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: data.content } : c))
      );
      setEditing(null);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm('Delete this comment?')) return;

    await supabase.from('comments').delete().eq('id', commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle size={18} />
        <h4 className="font-medium">Comments</h4>
        <span className="text-xs text-gray-500">({comments.length})</span>
      </div>

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {user?.profile?.avatar || user?.email?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
            className="input w-full min-h-[80px] resize-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            {replyingTo && (
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel reply
              </button>
            )}
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="btn-primary text-sm disabled:opacity-50"
            >
              <Send size={14} />
              {replyingTo ? 'Reply' : 'Comment'}
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No comments yet. Be the first to comment.
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={() => setReplyingTo(comment.id)}
              onEdit={(newContent) => handleEdit(comment.id, newContent)}
              onDelete={() => handleDelete(comment.id)}
              onCancelEdit={() => setEditing(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, onReply, onEdit, onDelete, onCancelEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const handleSaveEdit = () => {
    onEdit(editContent);
    setIsEditing(false);
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
          {comment.profile?.avatar || comment.profile?.full_name?.[0] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">
              {comment.profile?.full_name || 'Unknown User'}
            </p>
            <span className="text-xs text-gray-400">
              {new Date(comment.created_at).toLocaleString()}
            </span>
          </div>

          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="input w-full min-h-[60px]"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={onCancelEdit} className="text-xs text-gray-500">
                  Cancel
                </button>
                <button onClick={handleSaveEdit} className="text-xs text-blue-600 font-medium">
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
              {comment.content}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={onReply}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <Reply size={12} /> Reply
            </button>
            {comment.created_by === useCRM.getState().user?.id && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={onDelete}
                  className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </>
            )}
          </div>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 ml-4 space-y-3 border-l-2 border-gray-100 pl-4">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-700 flex-shrink-0">
                    {reply.profile?.avatar || '?'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      {reply.profile?.full_name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-700">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Implementation Checklist

- [ ] Update `supabase/schema.sql` with emails tables
- [ ] Update `supabase/schema.sql` with calendar_events tables
- [ ] Update `supabase/schema.sql` with notifications tables
- [ ] Update `supabase/schema.sql` with comments tables
- [ ] Create `frontend/src/lib/emailService.js`
- [ ] Create `frontend/src/components/EmailComposer.jsx`
- [ ] Create `frontend/src/lib/calendarService.js`
- [ ] Create `frontend/src/components/CalendarSync.jsx`
- [ ] Create `frontend/src/context/NotificationContext.jsx`
- [ ] Create `frontend/src/components/NotificationBell.jsx`
- [ ] Create `frontend/src/components/Comments.jsx`
- [ ] Add Email button to contact/company views
- [ ] Add Comments section to detail views
- [ ] Add NotificationBell to Header
- [ ] Add CalendarSync to Settings page

---

## Next Phase
See [Phase 4: Advanced Analytics & Mobile](./Phase-4-Advanced-Analytics-Mobile.md)