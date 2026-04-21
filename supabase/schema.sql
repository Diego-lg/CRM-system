-- ============================================
-- CRM-system Supabase Database Schema
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard -> SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    region TEXT,
    currency TEXT DEFAULT 'USD',
    manager TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'active',
    revenue INTEGER DEFAULT 0,
    target INTEGER DEFAULT 0,
    address TEXT,
    color TEXT DEFAULT '#4f46e5',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMPANIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    industry TEXT,
    size TEXT,
    revenue TEXT,
    website TEXT,
    phone TEXT,
    status TEXT DEFAULT 'lead',
    employees INTEGER DEFAULT 0,
    country TEXT,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    role TEXT,
    status TEXT DEFAULT 'lead',
    tags TEXT[],
    last_contact DATE,
    score INTEGER DEFAULT 50,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DEALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    value INTEGER DEFAULT 0,
    stage TEXT DEFAULT 'new',
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    close_date DATE,
    probability INTEGER DEFAULT 20,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    owner TEXT,
    priority TEXT DEFAULT 'medium',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT,
    title TEXT,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    date DATE,
    time TIME,
    duration INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    priority TEXT DEFAULT 'medium',
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USERS TABLE (Team Members)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'Sales Rep',
    avatar TEXT,
    status TEXT DEFAULT 'active',
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    company_name TEXT DEFAULT 'CRM-system',
    primary_color TEXT DEFAULT '#4f46e5',
    currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'America/New_York',
    date_format TEXT DEFAULT 'MM/DD/YYYY',
    fiscal_year TEXT DEFAULT 'January',
    deal_stages TEXT[] DEFAULT ARRAY['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
    contact_statuses TEXT[] DEFAULT ARRAY['lead', 'prospect', 'customer', 'churned'],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REVENUE HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS revenue_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month TEXT NOT NULL,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    store_name TEXT,
    revenue INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PIPELINE HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month TEXT NOT NULL,
    new_deals INTEGER DEFAULT 0,
    qualified_deals INTEGER DEFAULT 0,
    proposal_deals INTEGER DEFAULT 0,
    negotiation_deals INTEGER DEFAULT 0,
    won_deals INTEGER DEFAULT 0,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INSERT DEFAULT SETTINGS
-- ============================================
INSERT INTO settings (id, company_name) VALUES (1, 'CRM-system')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSERT SEED DATA: STORES
-- ============================================
INSERT INTO stores (id, name, region, currency, manager, phone, email, status, revenue, target, address, color) VALUES
    ('11111111-1111-1111-1111-111111111111', 'North America HQ', 'North America', 'USD', 'Alex Rivera', '+1-555-9000', 'na@nexuscrm.com', 'active', 420000, 500000, '123 Business Ave, New York, NY', '#4f46e5'),
    ('22222222-2222-2222-2222-222222222222', 'EMEA Division', 'Europe', 'EUR', 'Marie Dupont', '+44-20-0001', 'emea@nexuscrm.com', 'active', 285000, 350000, '45 Commerce St, London, UK', '#0891b2'),
    ('33333333-3333-3333-3333-333333333333', 'Asia Pacific', 'Asia Pacific', 'USD', 'Kenji Tanaka', '+81-3-0001', 'apac@nexuscrm.com', 'active', 195000, 250000, '7 Tech Park, Singapore', '#059669')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSERT SEED DATA: COMPANIES
-- ============================================
INSERT INTO companies (id, name, industry, size, revenue, website, phone, status, store_id, employees, country) VALUES
    ('aaaa1111-1111-1111-1111-111111111111', 'TechCorp Inc.', 'Technology', 'Enterprise', '$50M', 'techcorp.com', '+1-555-1000', 'customer', '11111111-1111-1111-1111-111111111111', 500, 'USA'),
    ('aaaa2222-2222-2222-2222-222222222222', 'Innovate.io', 'SaaS', 'Mid-Market', '$10M', 'innovate.io', '+1-555-1001', 'prospect', '11111111-1111-1111-1111-111111111111', 120, 'USA'),
    ('aaaa3333-3333-3333-3333-333333333333', 'Global Firm Ltd', 'Finance', 'Enterprise', '$200M', 'globalfirm.com', '+1-555-1002', 'lead', '22222222-2222-2222-2222-222222222222', 2000, 'UK'),
    ('aaaa4444-4444-4444-4444-444444444444', 'StartupXYZ', 'Technology', 'Startup', '$2M', 'startupxyz.com', '+1-555-1003', 'lead', '22222222-2222-2222-2222-222222222222', 25, 'USA'),
    ('aaaa5555-5555-5555-5555-555555555555', 'RetailCo', 'Retail', 'Enterprise', '$80M', 'retailco.com', '+1-555-1004', 'customer', '33333333-3333-3333-3333-333333333333', 800, 'Canada')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSERT SEED DATA: CONTACTS
-- ============================================
INSERT INTO contacts (id, name, email, phone, company_id, role, status, tags, last_contact, score, store_id, avatar) VALUES
    ('bbbb1111-1111-1111-1111-111111111111', 'Sarah Johnson', 'sarah.j@techcorp.com', '+1-555-0101', 'aaaa1111-1111-1111-1111-111111111111', 'CEO', 'customer', ARRAY['VIP', 'Enterprise'], '2026-04-10', 95, '11111111-1111-1111-1111-111111111111', 'SJ'),
    ('bbbb2222-2222-2222-2222-222222222222', 'Marcus Chen', 'm.chen@innovate.io', '+1-555-0102', 'aaaa2222-2222-2222-2222-222222222222', 'CTO', 'lead', ARRAY['Tech', 'SMB'], '2026-04-15', 72, '11111111-1111-1111-1111-111111111111', 'MC'),
    ('bbbb3333-3333-3333-3333-333333333333', 'Emily Rodriguez', 'emily@globalfirm.com', '+1-555-0103', 'aaaa3333-3333-3333-3333-333333333333', 'VP Sales', 'prospect', ARRAY['Finance'], '2026-04-18', 60, '22222222-2222-2222-2222-222222222222', 'ER'),
    ('bbbb4444-4444-4444-4444-444444444444', 'David Kim', 'd.kim@startupxyz.com', '+1-555-0104', 'aaaa4444-4444-4444-4444-444444444444', 'Founder', 'lead', ARRAY['Startup', 'Tech'], '2026-04-12', 80, '22222222-2222-2222-2222-222222222222', 'DK'),
    ('bbbb5555-5555-5555-5555-555555555555', 'Lisa Patel', 'lisa.p@retailco.com', '+1-555-0105', 'aaaa5555-5555-5555-5555-555555555555', 'Director', 'customer', ARRAY['Retail', 'Enterprise'], '2026-04-05', 88, '33333333-3333-3333-3333-333333333333', 'LP'),
    ('bbbb6666-6666-6666-6666-666666666666', 'James Wilson', 'jwilson@medtech.com', '+1-555-0106', 'aaaa1111-1111-1111-1111-111111111111', 'COO', 'prospect', ARRAY['Healthcare'], '2026-04-17', 55, '11111111-1111-1111-1111-111111111111', 'JW'),
    ('bbbb7777-7777-7777-7777-777777777777', 'Aria Thompson', 'aria@cloudbase.net', '+1-555-0107', 'aaaa2222-2222-2222-2222-222222222222', 'Product Manager', 'lead', ARRAY['SaaS'], '2026-04-20', 78, '33333333-3333-3333-3333-333333333333', 'AT'),
    ('bbbb8888-8888-8888-8888-888888888888', 'Noah Martinez', 'n.martinez@fintech.io', '+1-555-0108', 'aaaa3333-3333-3333-3333-333333333333', 'CFO', 'customer', ARRAY['Finance', 'VIP'], '2026-04-08', 91, '22222222-2222-2222-2222-222222222222', 'NM')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSERT SEED DATA: DEALS
-- ============================================
INSERT INTO deals (id, title, value, stage, contact_id, company_id, close_date, probability, store_id, owner, priority, notes) VALUES
    ('cccc1111-1111-1111-1111-111111111111', 'TechCorp Enterprise License', 85000, 'proposal', 'bbbb1111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', '2026-05-30', 70, '11111111-1111-1111-1111-111111111111', 'Alex Rivera', 'high', 'Annual renewal + upgrade'),
    ('cccc2222-2222-2222-2222-222222222222', 'Innovate.io SaaS Bundle', 24000, 'negotiation', 'bbbb2222-2222-2222-2222-222222222222', 'aaaa2222-2222-2222-2222-222222222222', '2026-05-15', 85, '11111111-1111-1111-1111-111111111111', 'Maria Lopez', 'medium', 'Quarterly billing preferred'),
    ('cccc3333-3333-3333-3333-333333333333', 'Global Firm Consulting', 150000, 'qualified', 'bbbb3333-3333-3333-3333-333333333333', 'aaaa3333-3333-3333-3333-333333333333', '2026-06-30', 40, '22222222-2222-2222-2222-222222222222', 'Tom Baker', 'high', 'Long-term consulting contract'),
    ('cccc4444-4444-4444-4444-444444444444', 'StartupXYZ Seed Package', 8500, 'new', 'bbbb4444-4444-4444-4444-444444444444', 'aaaa4444-4444-4444-4444-444444444444', '2026-06-15', 25, '22222222-2222-2222-2222-222222222222', 'Sara Kim', 'low', 'Startup discount applicable'),
    ('cccc5555-5555-5555-5555-555555555555', 'RetailCo Platform Integration', 45000, 'won', 'bbbb5555-5555-5555-5555-555555555555', 'aaaa5555-5555-5555-5555-555555555555', '2026-04-01', 100, '33333333-3333-3333-3333-333333333333', 'Alex Rivera', 'medium', 'Integration complete'),
    ('cccc6666-6666-6666-6666-666666666666', 'MedTech API Access', 32000, 'new', 'bbbb6666-6666-6666-6666-666666666666', 'aaaa1111-1111-1111-1111-111111111111', '2026-07-01', 20, '11111111-1111-1111-1111-111111111111', 'Maria Lopez', 'medium', 'Initial discovery phase'),
    ('cccc7777-7777-7777-7777-777777777777', 'CloudBase Premium Tier', 18000, 'proposal', 'bbbb7777-7777-7777-7777-777777777777', 'aaaa2222-2222-2222-2222-222222222222', '2026-05-20', 60, '33333333-3333-3333-3333-333333333333', 'Tom Baker', 'medium', 'Upsell from standard'),
    ('cccc8888-8888-8888-8888-888888888888', 'FinTech Analytics Suite', 62000, 'negotiation', 'bbbb8888-8888-8888-8888-888888888888', 'aaaa3333-3333-3333-3333-333333333333', '2026-05-01', 80, '22222222-2222-2222-2222-222222222222', 'Sara Kim', 'high', 'Data compliance required'),
    ('cccc9999-9999-9999-9999-999999999999', 'TechCorp Support Bundle', 15000, 'won', 'bbbb1111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', '2026-03-15', 100, '11111111-1111-1111-1111-111111111111', 'Alex Rivera', 'low', 'Support renewal'),
    ('ccccaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RetailCo Marketing Tools', 9000, 'lost', 'bbbb5555-5555-5555-5555-555555555555', 'aaaa5555-5555-5555-5555-555555555555', '2026-03-30', 0, '33333333-3333-3333-3333-333333333333', 'Maria Lopez', 'low', 'Went with competitor')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSERT SEED DATA: ACTIVITIES
-- ============================================
INSERT INTO activities (id, type, title, contact_id, date, time, duration, status, notes, priority, store_id) VALUES
    ('dddd1111-1111-1111-1111-111111111111', 'call', 'Discovery call with Sarah', 'bbbb1111-1111-1111-1111-111111111111', '2026-04-21', '10:00', 30, 'scheduled', 'Discuss enterprise needs', 'high', '11111111-1111-1111-1111-111111111111'),
    ('dddd2222-2222-2222-2222-222222222222', 'email', 'Proposal follow-up to Marcus', 'bbbb2222-2222-2222-2222-222222222222', '2026-04-21', '14:00', 0, 'completed', 'Sent revised proposal', 'medium', '11111111-1111-1111-1111-111111111111'),
    ('dddd3333-3333-3333-3333-333333333333', 'meeting', 'Demo for Emily', 'bbbb3333-3333-3333-3333-333333333333', '2026-04-22', '11:00', 60, 'scheduled', 'Product demo - analytics module', 'high', '22222222-2222-2222-2222-222222222222'),
    ('dddd4444-4444-4444-4444-444444444444', 'task', 'Prepare contract for Lisa', 'bbbb5555-5555-5555-5555-555555555555', '2026-04-21', '16:00', 0, 'pending', 'Legal review needed', 'medium', '33333333-3333-3333-3333-333333333333'),
    ('dddd5555-5555-5555-5555-555555555555', 'call', 'Check-in with David', 'bbbb4444-4444-4444-4444-444444444444', '2026-04-23', '09:00', 20, 'scheduled', 'Monthly check-in', 'low', '22222222-2222-2222-2222-222222222222'),
    ('dddd6666-6666-6666-6666-666666666666', 'email', 'Newsletter to Aria', 'bbbb7777-7777-7777-7777-777777777777', '2026-04-20', '10:00', 0, 'completed', 'Product update newsletter', 'low', '33333333-3333-3333-3333-333333333333'),
    ('dddd7777-7777-7777-7777-777777777777', 'meeting', 'QBR with Noah', 'bbbb8888-8888-8888-8888-888888888888', '2026-04-25', '13:00', 90, 'scheduled', 'Q2 business review', 'high', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSERT SEED DATA: USERS
-- ============================================
INSERT INTO users (id, name, email, role, avatar, status) VALUES
    ('eeee1111-1111-1111-1111-111111111111', 'Alex Rivera', 'alex@nexuscrm.com', 'Admin', 'AR', 'active'),
    ('eeee2222-2222-2222-2222-222222222222', 'Maria Lopez', 'maria@nexuscrm.com', 'Sales Rep', 'ML', 'active'),
    ('eeee3333-3333-3333-3333-333333333333', 'Tom Baker', 'tom@nexuscrm.com', 'Sales Rep', 'TB', 'active'),
    ('eeee4444-4444-4444-4444-444444444444', 'Sara Kim', 'sara@nexuscrm.com', 'Manager', 'SK', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSERT SEED DATA: REVENUE HISTORY
-- ============================================
INSERT INTO revenue_history (month, store_id, store_name, revenue) VALUES
    ('Oct', '11111111-1111-1111-1111-111111111111', 'North America HQ', 38000),
    ('Oct', '22222222-2222-2222-2222-222222222222', 'EMEA Division', 22000),
    ('Oct', '33333333-3333-3333-3333-333333333333', 'Asia Pacific', 14000),
    ('Nov', '11111111-1111-1111-1111-111111111111', 'North America HQ', 41000),
    ('Nov', '22222222-2222-2222-2222-222222222222', 'EMEA Division', 25000),
    ('Nov', '33333333-3333-3333-3333-333333333333', 'Asia Pacific', 16000),
    ('Dec', '11111111-1111-1111-1111-111111111111', 'North America HQ', 55000),
    ('Dec', '22222222-2222-2222-2222-222222222222', 'EMEA Division', 30000),
    ('Dec', '33333333-3333-3333-3333-333333333333', 'Asia Pacific', 22000),
    ('Jan', '11111111-1111-1111-1111-111111111111', 'North America HQ', 44000),
    ('Jan', '22222222-2222-2222-2222-222222222222', 'EMEA Division', 28000),
    ('Jan', '33333333-3333-3333-3333-333333333333', 'Asia Pacific', 17000),
    ('Feb', '11111111-1111-1111-1111-111111111111', 'North America HQ', 48000),
    ('Feb', '22222222-2222-2222-2222-222222222222', 'EMEA Division', 31000),
    ('Feb', '33333333-3333-3333-3333-333333333333', 'Asia Pacific', 19000),
    ('Mar', '11111111-1111-1111-1111-111111111111', 'North America HQ', 62000),
    ('Mar', '22222222-2222-2222-2222-222222222222', 'EMEA Division', 38000),
    ('Mar', '33333333-3333-3333-3333-333333333333', 'Asia Pacific', 24000),
    ('Apr', '11111111-1111-1111-1111-111111111111', 'North America HQ', 72000),
    ('Apr', '22222222-2222-2222-2222-222222222222', 'EMEA Division', 48000),
    ('Apr', '33333333-3333-3333-3333-333333333333', 'Asia Pacific', 31000);

-- ============================================
-- INSERT SEED DATA: PIPELINE HISTORY
-- ============================================
INSERT INTO pipeline_history (month, new_deals, qualified_deals, proposal_deals, negotiation_deals, won_deals) VALUES
    ('Jan', 5, 8, 6, 4, 3),
    ('Feb', 7, 9, 7, 5, 4),
    ('Mar', 10, 11, 8, 6, 6),
    ('Apr', 8, 12, 9, 5, 5);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for development)
-- In production, you'd want more restrictive policies
CREATE POLICY "Enable read access for all users" ON stores FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON stores FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON stores FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON stores FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON contacts FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON contacts FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON contacts FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON companies FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON companies FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON companies FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON deals FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON deals FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON deals FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON activities FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON activities FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON activities FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON users FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON users FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON settings FOR SELECT USING (true);
CREATE POLICY "Enable update for all users" ON settings FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON revenue_history FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON revenue_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON pipeline_history FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON pipeline_history FOR INSERT WITH CHECK (true);

-- ============================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contacts_store_id ON contacts(store_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_store_id ON companies(store_id);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_deals_store_id ON deals(store_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_store_id ON activities(store_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_revenue_history_store_id ON revenue_history(store_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_month ON pipeline_history(month);

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE companies;

-- ============================================
-- FINISH
-- ============================================
SELECT 'CRM-system Database Schema Created Successfully!' as status;

-- ============================================
-- PHASE 1: AUTHENTICATION & USER MANAGEMENT
-- ============================================
-- These tables extend Supabase auth.users for the CRM system

-- ============================================
-- PROFILES TABLE
-- Extends auth.users with CRM-specific profile data
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'sales_rep' CHECK (role IN ('admin', 'manager', 'sales_rep')),
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- API KEYS TABLE
-- Personal API key management for users
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EMAIL TEMPLATES TABLE
-- User-defined email templates for CRM communications
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO email_templates (name, subject, body, is_default) VALUES
    ('Welcome Email', 'Welcome to CRM-system', 'Hello {{name}}, welcome to our CRM!', TRUE),
    ('Deal Won', 'Congratulations! Deal Won', 'Dear {{name}}, your deal {{deal_title}} has been won!', FALSE)
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS) FOR AUTH TABLES
-- ============================================

-- Enable RLS on auth tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES RLS POLICIES
-- Users can view and update their own profile
-- ============================================
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- API KEYS RLS POLICIES
-- Users can only manage their own API keys
-- ============================================
CREATE POLICY "Users can view own API keys" ON api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own API keys" ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own API keys" ON api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own API keys" ON api_keys FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- EMAIL TEMPLATES RLS POLICIES
-- Anyone can view templates, only admins can manage them
-- ============================================
CREATE POLICY "Anyone can view email templates" ON email_templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage email templates" ON email_templates FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update email templates" ON email_templates FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete email templates" ON email_templates FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- INDEXES FOR AUTH TABLES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_default ON email_templates(is_default);

-- ============================================
-- FUNCTION TO AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
        COALESCE(new.raw_user_meta_data->>'avatar', '')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
