import { supabase, TABLES, isSupabaseConfigured } from './supabase';
import { SEED_DATA } from '../data/seed';

// ============================================
// CONTACTS SERVICE
// ============================================
export const contactsService = {
  async getAll(storeId = null) {
    if (!isSupabaseConfigured()) return SEED_DATA.contacts;
    
    let query = supabase.from(TABLES.contacts).select('*').order('name');
    if (storeId) query = query.eq('store_id', storeId);
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(c => ({
      ...c,
      id: c.id, // Keep UUID
      company: c.company_id,
      tags: c.tags || [],
      lastContact: c.last_contact,
      storeId: c.store_id,
      avatar: c.avatar || c.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??',
    }));
  },

  async create(contact) {
    if (!isSupabaseConfigured()) return { ...contact, id: `c_${Date.now()}` };
    
    const { data, error } = await supabase
      .from(TABLES.contacts)
      .insert({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company_id: contact.company || null,
        role: contact.role,
        status: contact.status || 'lead',
        tags: contact.tags || [],
        last_contact: contact.lastContact || null,
        score: contact.score || 50,
        store_id: contact.storeId || null,
        avatar: contact.avatar || contact.name?.split(' ').map(n => n[0]).join('').toUpperCase(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, company: data.company_id, storeId: data.store_id, lastContact: data.last_contact };
  },

  async update(id, updates) {
    if (!isSupabaseConfigured()) return updates;
    
    const { data, error } = await supabase
      .from(TABLES.contacts)
      .update({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        company_id: updates.company || null,
        role: updates.role,
        status: updates.status,
        tags: updates.tags || [],
        last_contact: updates.lastContact || null,
        score: updates.score,
        store_id: updates.storeId || null,
        avatar: updates.avatar,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, company: data.company_id, storeId: data.store_id, lastContact: data.last_contact };
  },

  async delete(id) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from(TABLES.contacts).delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// COMPANIES SERVICE
// ============================================
export const companiesService = {
  async getAll(storeId = null) {
    if (!isSupabaseConfigured()) return SEED_DATA.companies;
    
    let query = supabase.from(TABLES.companies).select('*').order('name');
    if (storeId) query = query.eq('store_id', storeId);
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(c => ({
      ...c,
      id: c.id,
      storeId: c.store_id,
    }));
  },

  async create(company) {
    if (!isSupabaseConfigured()) return { ...company, id: `comp_${Date.now()}` };
    
    const { data, error } = await supabase
      .from(TABLES.companies)
      .insert({
        name: company.name,
        industry: company.industry,
        size: company.size,
        revenue: company.revenue,
        website: company.website,
        phone: company.phone,
        status: company.status || 'lead',
        employees: company.employees || 0,
        country: company.country,
        store_id: company.storeId || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, storeId: data.store_id };
  },

  async update(id, updates) {
    if (!isSupabaseConfigured()) return updates;
    
    const { data, error } = await supabase
      .from(TABLES.companies)
      .update({
        ...updates,
        store_id: updates.storeId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, storeId: data.store_id };
  },

  async delete(id) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from(TABLES.companies).delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// DEALS SERVICE
// ============================================
export const dealsService = {
  async getAll(storeId = null) {
    if (!isSupabaseConfigured()) return SEED_DATA.deals;
    
    let query = supabase.from(TABLES.deals).select('*').order('created_at', { ascending: false });
    if (storeId) query = query.eq('store_id', storeId);
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(d => ({
      ...d,
      id: d.id,
      contact: d.contact_id,
      company: d.company_id,
      closeDate: d.close_date,
      storeId: d.store_id,
    }));
  },

  async create(deal) {
    if (!isSupabaseConfigured()) return { ...deal, id: `d_${Date.now()}` };
    
    const { data, error } = await supabase
      .from(TABLES.deals)
      .insert({
        title: deal.title,
        value: deal.value || 0,
        stage: deal.stage || 'new',
        contact_id: deal.contact || null,
        company_id: deal.company || null,
        close_date: deal.closeDate || null,
        probability: deal.probability || 20,
        store_id: deal.storeId || null,
        owner: deal.owner,
        priority: deal.priority || 'medium',
        notes: deal.notes,
      })
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, contact: data.contact_id, company: data.company_id, closeDate: data.close_date, storeId: data.store_id };
  },

  async update(id, updates) {
    if (!isSupabaseConfigured()) return updates;
    
    const { data, error } = await supabase
      .from(TABLES.deals)
      .update({
        title: updates.title,
        value: updates.value,
        stage: updates.stage,
        contact_id: updates.contact || null,
        company_id: updates.company || null,
        close_date: updates.closeDate || null,
        probability: updates.probability,
        store_id: updates.storeId || null,
        owner: updates.owner,
        priority: updates.priority,
        notes: updates.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, contact: data.contact_id, company: data.company_id, closeDate: data.close_date, storeId: data.store_id };
  },

  async updateStage(id, stage) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from(TABLES.deals).update({ stage, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  async delete(id) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from(TABLES.deals).delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// STORES SERVICE
// ============================================
export const storesService = {
  async getAll() {
    if (!isSupabaseConfigured()) return SEED_DATA.stores;
    
    const { data, error } = await supabase.from(TABLES.stores).select('*').order('name');
    if (error) throw error;
    
    return (data || []).map(s => ({
      ...s,
      id: s.id,
      storeId: s.id, // For compatibility
    }));
  },

  async create(store) {
    if (!isSupabaseConfigured()) return { ...store, id: `store_${Date.now()}` };
    
    const { data, error } = await supabase
      .from(TABLES.stores)
      .insert({
        name: store.name,
        region: store.region,
        currency: store.currency || 'USD',
        manager: store.manager,
        phone: store.phone,
        email: store.email,
        status: store.status || 'active',
        revenue: store.revenue || 0,
        target: store.target || 0,
        address: store.address,
        color: store.color || '#4f46e5',
      })
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, storeId: data.id };
  },

  async update(id, updates) {
    if (!isSupabaseConfigured()) return updates;
    
    const { data, error } = await supabase
      .from(TABLES.stores)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, storeId: data.id };
  },

  async delete(id) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from(TABLES.stores).delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// ACTIVITIES SERVICE
// ============================================
export const activitiesService = {
  async getAll(storeId = null) {
    if (!isSupabaseConfigured()) return SEED_DATA.activities;
    
    let query = supabase.from(TABLES.activities).select('*').order('date').order('time');
    if (storeId) query = query.eq('store_id', storeId);
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(a => ({
      ...a,
      id: a.id,
      contact: a.contact_id,
      storeId: a.store_id,
    }));
  },

  async create(activity) {
    if (!isSupabaseConfigured()) return { ...activity, id: `a_${Date.now()}` };
    
    const { data, error } = await supabase
      .from(TABLES.activities)
      .insert({
        type: activity.type,
        title: activity.title,
        contact_id: activity.contact || null,
        date: activity.date,
        time: activity.time,
        duration: activity.duration || 0,
        status: activity.status || 'scheduled',
        notes: activity.notes,
        priority: activity.priority || 'medium',
        store_id: activity.storeId || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, contact: data.contact_id, storeId: data.store_id };
  },

  async update(id, updates) {
    if (!isSupabaseConfigured()) return updates;
    
    const { data, error } = await supabase
      .from(TABLES.activities)
      .update({
        ...updates,
        contact_id: updates.contact || null,
        store_id: updates.storeId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, contact: data.contact_id, storeId: data.store_id };
  },

  async complete(id) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from(TABLES.activities).update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  async delete(id) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from(TABLES.activities).delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// SETTINGS SERVICE
// ============================================
export const settingsService = {
  async get() {
    if (!isSupabaseConfigured()) return SEED_DATA.settings;
    
    const { data, error } = await supabase.from(TABLES.settings).select('*').eq('id', 1).single();
    if (error) throw error;
    
    return {
      companyName: data.company_name,
      primaryColor: data.primary_color,
      currency: data.currency,
      timezone: data.timezone,
      dateFormat: data.date_format,
      fiscalYear: data.fiscal_year,
      dealStages: data.deal_stages || ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
      contactStatuses: data.contact_statuses || ['lead', 'prospect', 'customer', 'churned'],
    };
  },

  async update(updates) {
    if (!isSupabaseConfigured()) return updates;
    
    const { error } = await supabase
      .from(TABLES.settings)
      .update({
        company_name: updates.companyName,
        primary_color: updates.primaryColor,
        currency: updates.currency,
        timezone: updates.timezone,
        date_format: updates.dateFormat,
        fiscal_year: updates.fiscalYear,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    
    if (error) throw error;
    return updates;
  },

  async getUsers() {
    if (!isSupabaseConfigured()) return SEED_DATA.settings.users;
    
    const { data, error } = await supabase.from(TABLES.users).select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  async createUser(user) {
    if (!isSupabaseConfigured()) return { ...user, id: `u_${Date.now()}` };
    
    const { data, error } = await supabase
      .from(TABLES.users)
      .insert({
        name: user.name,
        email: user.email,
        role: user.role || 'Sales Rep',
        avatar: user.avatar || user.name?.split(' ').map(n => n[0]).join('').toUpperCase(),
        status: 'active',
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteUser(id) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from(TABLES.users).delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// ANALYTICS SERVICE
// ============================================
export const analyticsService = {
  async getRevenueHistory() {
    if (!isSupabaseConfigured()) return SEED_DATA.revenueHistory;
    
    const { data, error } = await supabase.from(TABLES.revenue_history).select('*').order('created_at');
    if (error) throw error;
    
    // Transform to pivot format by month and store
    const byMonth = {};
    (data || []).forEach(r => {
      if (!byMonth[r.month]) byMonth[r.month] = { month: r.month };
      byMonth[r.month][`store${r.store_name?.charAt(0) || 'S'}`] = r.revenue;
    });
    
    return Object.values(byMonth);
  },

  async getPipelineHistory() {
    if (!isSupabaseConfigured()) return SEED_DATA.pipelineHistory;
    
    const { data, error } = await supabase.from(TABLES.pipeline_history).select('*').order('created_at');
    if (error) throw error;
    
    return (data || []).map(p => ({
      month: p.month,
      new: p.new_deals,
      qualified: p.qualified_deals,
      proposal: p.proposal_deals,
      negotiation: p.negotiation_deals,
      won: p.won_deals,
    }));
  },

  async getStats(storeId = null) {
    if (!isSupabaseConfigured()) {
      const deals = SEED_DATA.deals;
      const wonDeals = deals.filter(d => d.stage === 'won');
      const lostDeals = deals.filter(d => d.stage === 'lost');
      const openDeals = deals.filter(d => !['won', 'lost'].includes(d.stage));
      return {
        totalRevenue: wonDeals.reduce((s, d) => s + d.value, 0),
        pipelineValue: openDeals.reduce((s, d) => s + d.value, 0),
        openDeals: openDeals.length,
        winRate: wonDeals.length + lostDeals.length > 0 
          ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0,
        wonCount: wonDeals.length,
      };
    }
    
    let dealsQuery = supabase.from(TABLES.deals).select('*');
    let contactsQuery = supabase.from(TABLES.contacts).select('id');
    let companiesQuery = supabase.from(TABLES.companies).select('id');
    
    if (storeId) {
      dealsQuery = dealsQuery.eq('store_id', storeId);
      contactsQuery = contactsQuery.eq('store_id', storeId);
      companiesQuery = companiesQuery.eq('store_id', storeId);
    }
    
    const [dealsResult, contactsResult, companiesResult] = await Promise.all([
      dealsQuery,
      contactsQuery,
      companiesQuery,
    ]);
    
    const deals = dealsResult.data || [];
    const wonDeals = deals.filter(d => d.stage === 'won');
    const lostDeals = deals.filter(d => d.stage === 'lost');
    const openDeals = deals.filter(d => !['won', 'lost'].includes(d.stage));
    
    return {
      totalRevenue: wonDeals.reduce((s, d) => s + (d.value || 0), 0),
      pipelineValue: openDeals.reduce((s, d) => s + (d.value || 0), 0),
      openDeals: openDeals.length,
      winRate: wonDeals.length + lostDeals.length > 0 
        ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0,
      wonCount: wonDeals.length,
      contacts: contactsResult.data?.length || 0,
      companies: companiesResult.data?.length || 0,
    };
  },
};

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================
export const subscribeToChanges = (table, callback) => {
  if (!isSupabaseConfigured()) return () => {};
  
  const subscription = supabase
    .channel(`${table}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      callback(payload);
    })
    .subscribe();
  
  return () => supabase.removeChannel(subscription);
};
