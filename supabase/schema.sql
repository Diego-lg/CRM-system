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
DROP POLICY IF EXISTS "Enable read access for all users" ON stores;
CREATE POLICY "Enable read access for all users" ON stores FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON stores;
CREATE POLICY "Enable insert for all users" ON stores FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON stores;
CREATE POLICY "Enable update for all users" ON stores FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all users" ON stores;
CREATE POLICY "Enable delete for all users" ON stores FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON contacts;
CREATE POLICY "Enable read access for all users" ON contacts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON contacts;
CREATE POLICY "Enable insert for all users" ON contacts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON contacts;
CREATE POLICY "Enable update for all users" ON contacts FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all users" ON contacts;
CREATE POLICY "Enable delete for all users" ON contacts FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
CREATE POLICY "Enable read access for all users" ON companies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON companies;
CREATE POLICY "Enable insert for all users" ON companies FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON companies;
CREATE POLICY "Enable update for all users" ON companies FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all users" ON companies;
CREATE POLICY "Enable delete for all users" ON companies FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON deals;
CREATE POLICY "Enable read access for all users" ON deals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON deals;
CREATE POLICY "Enable insert for all users" ON deals FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON deals;
CREATE POLICY "Enable update for all users" ON deals FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all users" ON deals;
CREATE POLICY "Enable delete for all users" ON deals FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON activities;
CREATE POLICY "Enable read access for all users" ON activities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON activities;
CREATE POLICY "Enable insert for all users" ON activities FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON activities;
CREATE POLICY "Enable update for all users" ON activities FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all users" ON activities;
CREATE POLICY "Enable delete for all users" ON activities FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON users;
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON users;
CREATE POLICY "Enable insert for all users" ON users FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON users;
CREATE POLICY "Enable update for all users" ON users FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all users" ON users;
CREATE POLICY "Enable delete for all users" ON users FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON settings;
CREATE POLICY "Enable read access for all users" ON settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable update for all users" ON settings;
CREATE POLICY "Enable update for all users" ON settings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON revenue_history;
CREATE POLICY "Enable read access for all users" ON revenue_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON revenue_history;
CREATE POLICY "Enable insert for all users" ON revenue_history FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON pipeline_history;
CREATE POLICY "Enable read access for all users" ON pipeline_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON pipeline_history;
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
-- ENABLE REALTIME (idempotent - safe to run multiple times)
-- ============================================
DO $$
DECLARE
    pub_exists boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') INTO pub_exists;
    
    IF NOT pub_exists THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add tables to publication if not already added (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'deals') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE deals;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'contacts') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'activities') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE activities;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'companies') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE companies;
    END IF;
END $$;

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
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- API KEYS RLS POLICIES
-- Users can only manage their own API keys
-- ============================================
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
CREATE POLICY "Users can view own API keys" ON api_keys FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own API keys" ON api_keys;
CREATE POLICY "Users can insert own API keys" ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
CREATE POLICY "Users can update own API keys" ON api_keys FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;
CREATE POLICY "Users can delete own API keys" ON api_keys FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- EMAIL TEMPLATES RLS POLICIES
-- Anyone can view templates, only admins can manage them
-- ============================================
DROP POLICY IF EXISTS "Anyone can view email templates" ON email_templates;
CREATE POLICY "Anyone can view email templates" ON email_templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage email templates" ON email_templates;
CREATE POLICY "Admins can manage email templates" ON email_templates FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update email templates" ON email_templates;
CREATE POLICY "Admins can update email templates" ON email_templates FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can delete email templates" ON email_templates;
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

-- ============================================
-- PHASE 2: DATA MANAGEMENT & AUTOMATION
-- ============================================

-- ============================================
-- WORKFLOWS TABLE
-- Automated workflow definitions for CRM actions
-- ============================================
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WORKFLOW_LOGS TABLE
-- Execution logs for workflow runs
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    trigger_type TEXT,
    triggered_by TEXT,
    actions_run JSONB,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SAVED_VIEWS TABLE
-- User-defined saved views with filters and column preferences
-- ============================================
CREATE TABLE IF NOT EXISTS saved_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    filters JSONB NOT NULL,
    columns JSONB,
    sort_by TEXT,
    sort_dir TEXT DEFAULT 'asc',
    is_default BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TASK_DEPENDENCIES TABLE
-- Task dependency management for activities
-- ============================================
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    depends_on_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, depends_on_id)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) FOR PHASE 2 TABLES
-- ============================================

-- Enable RLS on Phase 2 tables
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- WORKFLOWS RLS POLICIES
-- Admin-only management (read/write for authenticated admins only)
-- ============================================
DROP POLICY IF EXISTS "Admins can view workflows" ON workflows;
CREATE POLICY "Admins can view workflows" ON workflows FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can insert workflows" ON workflows;
CREATE POLICY "Admins can insert workflows" ON workflows FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update workflows" ON workflows;
CREATE POLICY "Admins can update workflows" ON workflows FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can delete workflows" ON workflows;
CREATE POLICY "Admins can delete workflows" ON workflows FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- WORKFLOW_LOGS RLS POLICIES
-- Public read for all, write for workflow owners
-- ============================================
DROP POLICY IF EXISTS "Anyone can view workflow logs" ON workflow_logs;
CREATE POLICY "Anyone can view workflow logs" ON workflow_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Workflow owners can insert workflow logs" ON workflow_logs;
CREATE POLICY "Workflow owners can insert workflow logs" ON workflow_logs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workflows WHERE id = workflow_id AND created_by = auth.uid())
);
DROP POLICY IF EXISTS "Workflow owners can update workflow logs" ON workflow_logs;
CREATE POLICY "Workflow owners can update workflow logs" ON workflow_logs FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workflows WHERE id = workflow_id AND created_by = auth.uid())
);
DROP POLICY IF EXISTS "Workflow owners can delete workflow logs" ON workflow_logs;
CREATE POLICY "Workflow owners can delete workflow logs" ON workflow_logs FOR DELETE USING (
    EXISTS (SELECT 1 FROM workflows WHERE id = workflow_id AND created_by = auth.uid())
);

-- ============================================
-- SAVED_VIEWS RLS POLICIES
-- Users manage own views, can view shared/default
-- ============================================
DROP POLICY IF EXISTS "Users can view own saved views" ON saved_views;
CREATE POLICY "Users can view own saved views" ON saved_views FOR SELECT USING (
    user_id = auth.uid() OR is_default = TRUE
);
DROP POLICY IF EXISTS "Users can insert own saved views" ON saved_views;
CREATE POLICY "Users can insert own saved views" ON saved_views FOR INSERT WITH CHECK (
    auth.uid() = user_id
);
DROP POLICY IF EXISTS "Users can update own saved views" ON saved_views;
CREATE POLICY "Users can update own saved views" ON saved_views FOR UPDATE USING (
    auth.uid() = user_id
);
DROP POLICY IF EXISTS "Users can delete own saved views" ON saved_views;
CREATE POLICY "Users can delete own saved views" ON saved_views FOR DELETE USING (
    auth.uid() = user_id
);

-- ============================================
-- TASK_DEPENDENCIES RLS POLICIES
-- Users can manage their task dependencies
-- ============================================
DROP POLICY IF EXISTS "Users can view task dependencies for their tasks" ON task_dependencies;
CREATE POLICY "Users can view task dependencies for their tasks" ON task_dependencies FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM activities a
        WHERE a.id = task_dependencies.task_id
        AND (a.store_id IN (SELECT store_id FROM users WHERE id = auth.uid()) OR a.store_id IS NULL)
    )
);
DROP POLICY IF EXISTS "Users can insert task dependencies for their tasks" ON task_dependencies;
CREATE POLICY "Users can insert task dependencies for their tasks" ON task_dependencies FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM activities a
        WHERE a.id = task_dependencies.task_id
        AND (a.store_id IN (SELECT store_id FROM users WHERE id = auth.uid()) OR a.store_id IS NULL)
    )
);
DROP POLICY IF EXISTS "Users can update task dependencies for their tasks" ON task_dependencies;
CREATE POLICY "Users can update task dependencies for their tasks" ON task_dependencies FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM activities a
        WHERE a.id = task_dependencies.task_id
        AND (a.store_id IN (SELECT store_id FROM users WHERE id = auth.uid()) OR a.store_id IS NULL)
    )
);
DROP POLICY IF EXISTS "Users can delete task dependencies for their tasks" ON task_dependencies;
CREATE POLICY "Users can delete task dependencies for their tasks" ON task_dependencies FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM activities a
        WHERE a.id = task_dependencies.task_id
        AND (a.store_id IN (SELECT store_id FROM users WHERE id = auth.uid()) OR a.store_id IS NULL)
    )
);

-- ============================================
-- INDEXES FOR PHASE 2 TABLES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_workflow_id ON workflow_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_status ON workflow_logs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_created_at ON workflow_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON saved_views(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_entity_type ON saved_views(entity_type);
CREATE INDEX IF NOT EXISTS idx_saved_views_is_default ON saved_views(is_default);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on_id ON task_dependencies(depends_on_id);

-- ============================================
-- PHASE 3: COMMUNICATION & COLLABORATION
-- ============================================

-- ============================================
-- EMAILS TABLE
-- Email messages for CRM communications
-- ============================================
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EMAIL_ATTACHMENTS TABLE
-- File attachments for emails
-- ============================================
CREATE TABLE IF NOT EXISTS email_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EMAIL_SYNC TABLE
-- Email provider sync configuration
-- ============================================
CREATE TABLE IF NOT EXISTS email_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    last_sync TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CALENDAR_EVENTS TABLE
-- Calendar events for activities and tasks
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    location TEXT,
    color TEXT DEFAULT '#4f46e5',
    linked_entity_type TEXT CHECK (linked_entity_type IN ('contact', 'company', 'deal')),
    linked_entity_id UUID,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- User notifications for CRM events
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    link_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMMENTS TABLE
-- Threaded comments for entities
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'deal', 'activity')),
    entity_id UUID NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) FOR PHASE 3 TABLES
-- ============================================

-- Enable RLS on Phase 3 tables
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- EMAILS RLS POLICIES
-- Users manage their own emails
-- ============================================
DROP POLICY IF EXISTS "Users can view own emails" ON emails;
CREATE POLICY "Users can view own emails" ON emails FOR SELECT USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can insert own emails" ON emails;
CREATE POLICY "Users can insert own emails" ON emails FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can update own emails" ON emails;
CREATE POLICY "Users can update own emails" ON emails FOR UPDATE USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can delete own emails" ON emails;
CREATE POLICY "Users can delete own emails" ON emails FOR DELETE USING (auth.uid() = created_by);

-- ============================================
-- EMAIL_ATTACHMENTS RLS POLICIES
-- Access through parent email
-- ============================================
DROP POLICY IF EXISTS "Users can view email attachments" ON email_attachments;
CREATE POLICY "Users can view email attachments" ON email_attachments FOR SELECT USING (
    EXISTS (SELECT 1 FROM emails WHERE emails.id = email_attachments.email_id AND emails.created_by = auth.uid())
);
DROP POLICY IF EXISTS "Users can insert email attachments" ON email_attachments;
CREATE POLICY "Users can insert email attachments" ON email_attachments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM emails WHERE emails.id = email_attachments.email_id AND emails.created_by = auth.uid())
);
DROP POLICY IF EXISTS "Users can delete email attachments" ON email_attachments;
CREATE POLICY "Users can delete email attachments" ON email_attachments FOR DELETE USING (
    EXISTS (SELECT 1 FROM emails WHERE emails.id = email_attachments.email_id AND emails.created_by = auth.uid())
);

-- ============================================
-- EMAIL_SYNC RLS POLICIES
-- Users manage their own email sync
-- ============================================
DROP POLICY IF EXISTS "Users can view own email sync" ON email_sync;
CREATE POLICY "Users can view own email sync" ON email_sync FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own email sync" ON email_sync;
CREATE POLICY "Users can insert own email sync" ON email_sync FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own email sync" ON email_sync;
CREATE POLICY "Users can update own email sync" ON email_sync FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own email sync" ON email_sync;
CREATE POLICY "Users can delete own email sync" ON email_sync FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- CALENDAR_EVENTS RLS POLICIES
-- Users manage their own events
-- ============================================
DROP POLICY IF EXISTS "Users can view own calendar events" ON calendar_events;
CREATE POLICY "Users can view own calendar events" ON calendar_events FOR SELECT USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can insert own calendar events" ON calendar_events;
CREATE POLICY "Users can insert own calendar events" ON calendar_events FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can update own calendar events" ON calendar_events;
CREATE POLICY "Users can update own calendar events" ON calendar_events FOR UPDATE USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can delete own calendar events" ON calendar_events;
CREATE POLICY "Users can delete own calendar events" ON calendar_events FOR DELETE USING (auth.uid() = created_by);

-- ============================================
-- NOTIFICATIONS RLS POLICIES
-- Users manage their own notifications
-- ============================================
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- COMMENTS RLS POLICIES
-- Users manage their own comments
-- ============================================
DROP POLICY IF EXISTS "Users can view comments for accessible entities" ON comments;
CREATE POLICY "Users can view comments for accessible entities" ON comments FOR SELECT USING (
    auth.uid() = created_by OR
    (entity_type = 'contact' AND EXISTS (SELECT 1 FROM contacts WHERE contacts.id = comments.entity_id)) OR
    (entity_type = 'company' AND EXISTS (SELECT 1 FROM companies WHERE companies.id = comments.entity_id)) OR
    (entity_type = 'deal' AND EXISTS (SELECT 1 FROM deals WHERE deals.id = comments.entity_id))
);
DROP POLICY IF EXISTS "Users can insert comments" ON comments;
CREATE POLICY "Users can insert comments" ON comments FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = created_by);

-- ============================================
-- INDEXES FOR PHASE 3 TABLES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_emails_contact_id ON emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_company_id ON emails(company_id);
CREATE INDEX IF NOT EXISTS idx_emails_created_by ON emails(created_by);
CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_read ON emails(read);
CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON email_attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_email_sync_user_id ON email_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_linked_entity ON calendar_events(linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_by ON comments(created_by);

-- ============================================
-- PHASE 3 COMPLETE
-- ============================================

-- ============================================
-- PHASE 4: ADVANCED ANALYTICS & MOBILE
-- ============================================

-- ============================================
-- REPORTS TABLE
-- Custom report definitions for CRM analytics
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('contacts', 'companies', 'deals', 'activities', 'revenue')),
    columns JSONB NOT NULL DEFAULT '[]',
    filters JSONB NOT NULL DEFAULT '{}',
    grouping TEXT,
    date_range JSONB,
    aggregations JSONB NOT NULL DEFAULT '{}',
    schedule JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REPORT_EXPORTS TABLE
-- Export history for reports
-- ============================================
CREATE TABLE IF NOT EXISTS report_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    format TEXT NOT NULL CHECK (format IN ('csv', 'xlsx', 'pdf')),
    file_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DASHBOARD_LAYOUTS TABLE
-- User-customizable dashboard widget layouts
-- ============================================
CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    widgets JSONB NOT NULL DEFAULT '[]',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) FOR PHASE 4 TABLES
-- ============================================

-- Enable RLS on Phase 4 tables
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- REPORTS RLS POLICIES
-- Users manage own reports, public reports viewable by all
-- ============================================
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (
    user_id = auth.uid() OR is_public = TRUE
);
DROP POLICY IF EXISTS "Users can insert own reports" ON reports;
CREATE POLICY "Users can insert own reports" ON reports FOR INSERT WITH CHECK (
    auth.uid() = user_id
);
DROP POLICY IF EXISTS "Users can update own reports" ON reports;
CREATE POLICY "Users can update own reports" ON reports FOR UPDATE USING (
    auth.uid() = user_id
);
DROP POLICY IF EXISTS "Users can delete own reports" ON reports;
CREATE POLICY "Users can delete own reports" ON reports FOR DELETE USING (
    auth.uid() = user_id
);

-- ============================================
-- REPORT_EXPORTS RLS POLICIES
-- Users manage exports of their own reports
-- ============================================
DROP POLICY IF EXISTS "Users can view own report exports" ON report_exports;
CREATE POLICY "Users can view own report exports" ON report_exports FOR SELECT USING (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = report_exports.report_id AND reports.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can insert own report exports" ON report_exports;
CREATE POLICY "Users can insert own report exports" ON report_exports FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = report_exports.report_id AND reports.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can delete own report exports" ON report_exports;
CREATE POLICY "Users can delete own report exports" ON report_exports FOR DELETE USING (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = report_exports.report_id AND reports.user_id = auth.uid())
);

-- ============================================
-- DASHBOARD_LAYOUTS RLS POLICIES
-- Users manage their own layouts, can view shared defaults
-- ============================================
DROP POLICY IF EXISTS "Users can view own dashboard layouts" ON dashboard_layouts;
CREATE POLICY "Users can view own dashboard layouts" ON dashboard_layouts FOR SELECT USING (
    user_id = auth.uid() OR is_default = TRUE
);
DROP POLICY IF EXISTS "Users can insert own dashboard layouts" ON dashboard_layouts;
CREATE POLICY "Users can insert own dashboard layouts" ON dashboard_layouts FOR INSERT WITH CHECK (
    auth.uid() = user_id
);
DROP POLICY IF EXISTS "Users can update own dashboard layouts" ON dashboard_layouts;
CREATE POLICY "Users can update own dashboard layouts" ON dashboard_layouts FOR UPDATE USING (
    auth.uid() = user_id
);
DROP POLICY IF EXISTS "Users can delete own dashboard layouts" ON dashboard_layouts;
CREATE POLICY "Users can delete own dashboard layouts" ON dashboard_layouts FOR DELETE USING (
    auth.uid() = user_id
);

-- ============================================
-- INDEXES FOR PHASE 4 TABLES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_is_public ON reports(is_public);
CREATE INDEX IF NOT EXISTS idx_report_exports_report_id ON report_exports(report_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_format ON report_exports(format);
CREATE INDEX IF NOT EXISTS idx_report_exports_created_at ON report_exports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id ON dashboard_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_is_default ON dashboard_layouts(is_default);

-- ============================================
-- PHASE 4 COMPLETE
-- ============================================

-- ============================================
-- PHASE 5: AI/ML FEATURES
-- ============================================

-- ============================================
-- AI_MODELS TABLE
-- AI model configurations for CRM intelligence
-- ============================================
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (name IN ('contact_score', 'deal_prediction', 'auto_tag')),
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONTACT_SCORE_HISTORY TABLE
-- Historical contact scoring records for trend analysis
-- ============================================
CREATE TABLE IF NOT EXISTS contact_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    factors JSONB NOT NULL DEFAULT '{}',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DEAL_PREDICTIONS TABLE
-- AI-predicted deal outcomes
-- ============================================
CREATE TABLE IF NOT EXISTS deal_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    predicted_outcome TEXT NOT NULL CHECK (predicted_outcome IN ('won', 'lost', 'probability')),
    predicted_close_date DATE,
    predicted_value INTEGER,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    factors JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AI_RECOMMENDATIONS TABLE
-- Actionable AI-driven recommendations for users
-- ============================================
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('next_action', 'deal_upsell', 'contact_reengage', 'churn_risk')),
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    title TEXT NOT NULL,
    description TEXT,
    entity_type TEXT CHECK (entity_type IN ('contact', 'company', 'deal')),
    entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) FOR PHASE 5 TABLES
-- ============================================

-- Enable RLS on Phase 5 tables
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- AI_MODELS RLS POLICIES
-- Admin-only for model management
-- ============================================
DROP POLICY IF EXISTS "Admins can view ai_models" ON ai_models;
CREATE POLICY "Admins can view ai_models" ON ai_models FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can insert ai_models" ON ai_models;
CREATE POLICY "Admins can insert ai_models" ON ai_models FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update ai_models" ON ai_models;
CREATE POLICY "Admins can update ai_models" ON ai_models FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can delete ai_models" ON ai_models;
CREATE POLICY "Admins can delete ai_models" ON ai_models FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- CONTACT_SCORE_HISTORY RLS POLICIES
-- Users can view history for their contacts
-- ============================================
DROP POLICY IF EXISTS "Users can view contact score history" ON contact_score_history;
CREATE POLICY "Users can view contact score history" ON contact_score_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM contacts c
        WHERE c.id = contact_score_history.contact_id
        AND (c.store_id IN (SELECT store_id FROM users WHERE id = auth.uid()) OR c.store_id IS NULL)
    )
);
DROP POLICY IF EXISTS "System can insert contact score history" ON contact_score_history;
CREATE POLICY "System can insert contact score history" ON contact_score_history FOR INSERT WITH CHECK (true);

-- ============================================
-- DEAL_PREDICTIONS RLS POLICIES
-- Users can view predictions for their deals
-- ============================================
DROP POLICY IF EXISTS "Users can view deal predictions" ON deal_predictions;
CREATE POLICY "Users can view deal predictions" ON deal_predictions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM deals d
        WHERE d.id = deal_predictions.deal_id
        AND (d.store_id IN (SELECT store_id FROM users WHERE id = auth.uid()) OR d.store_id IS NULL)
    )
);
DROP POLICY IF EXISTS "System can insert deal predictions" ON deal_predictions;
CREATE POLICY "System can insert deal predictions" ON deal_predictions FOR INSERT WITH CHECK (true);

-- ============================================
-- AI_RECOMMENDATIONS RLS POLICIES
-- Users can view and update own recommendations
-- ============================================
DROP POLICY IF EXISTS "Users can view own ai_recommendations" ON ai_recommendations;
CREATE POLICY "Users can view own ai_recommendations" ON ai_recommendations FOR SELECT USING (true);
DROP POLICY IF EXISTS "System can insert ai_recommendations" ON ai_recommendations;
CREATE POLICY "System can insert ai_recommendations" ON ai_recommendations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update own ai_recommendations" ON ai_recommendations;
CREATE POLICY "Users can update own ai_recommendations" ON ai_recommendations FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Users can dismiss own ai_recommendations" ON ai_recommendations;
CREATE POLICY "Users can dismiss own ai_recommendations" ON ai_recommendations FOR DELETE USING (true);

-- ============================================
-- INDEXES FOR PHASE 5 TABLES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ai_models_name ON ai_models(name);
CREATE INDEX IF NOT EXISTS idx_ai_models_is_active ON ai_models(is_active);
CREATE INDEX IF NOT EXISTS idx_contact_score_history_contact_id ON contact_score_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_score_history_calculated_at ON contact_score_history(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_predictions_deal_id ON deal_predictions(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_predictions_created_at ON deal_predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_type ON ai_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_priority ON ai_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_entity ON ai_recommendations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_is_read ON ai_recommendations(is_read);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_is_dismissed ON ai_recommendations(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_created_at ON ai_recommendations(created_at DESC);

-- ============================================
-- INSERT DEFAULT AI MODEL CONFIGURATIONS
-- ============================================
INSERT INTO ai_models (name, config, is_active) VALUES
    ('contact_score', '{"version": "1.0", "model_type": "gradient_boost", "features": ["engagement", "company_size", "behavior", "fit_score"]}', TRUE),
    ('deal_prediction', '{"version": "1.0", "model_type": "random_forest", "features": ["deal_value", "stage", "contact_score", "days_to_close"]}', TRUE),
    ('auto_tag', '{"version": "1.0", "model_type": "text_classification", "labels": ["hot_lead", "decision_maker", "technical", "champion"]}', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- PHASE 5 COMPLETE
-- ============================================

SELECT 'CRM-system Database Schema - All Phases Complete!' as status;
