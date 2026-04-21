-- ============================================
-- CRM-system Database Cleanup Script
-- Run this in Supabase SQL Editor to remove all data
-- ============================================

-- Disable row level security temporarily for cleanup
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;

-- Delete from child tables first (to avoid foreign key violations)
DELETE FROM activities;
DELETE FROM deals;
DELETE FROM contacts;
DELETE FROM companies;
DELETE FROM revenue_history;
DELETE FROM pipeline_history;
DELETE FROM users;

-- Reset settings to default values
DELETE FROM settings;
INSERT INTO settings (id, company_name, primary_color, currency, timezone, date_format, fiscal_year, deal_stages, contact_statuses)
VALUES (1, 'CRM-system', '#4f46e5', 'USD', 'America/New_York', 'MM/DD/YYYY', 'January', ARRAY['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'], ARRAY['lead', 'prospect', 'customer', 'churned']);

-- Delete from parent table last
DELETE FROM stores;

-- Re-enable row level security
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Recreate policies for public access
DROP POLICY IF EXISTS "Enable read access for all users" ON stores;
DROP POLICY IF EXISTS "Enable insert for all users" ON stores;
DROP POLICY IF EXISTS "Enable update for all users" ON stores;
DROP POLICY IF EXISTS "Enable delete for all users" ON stores;

DROP POLICY IF EXISTS "Enable read access for all users" ON contacts;
DROP POLICY IF EXISTS "Enable insert for all users" ON contacts;
DROP POLICY IF EXISTS "Enable update for all users" ON contacts;
DROP POLICY IF EXISTS "Enable delete for all users" ON contacts;

DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
DROP POLICY IF EXISTS "Enable insert for all users" ON companies;
DROP POLICY IF EXISTS "Enable update for all users" ON companies;
DROP POLICY IF EXISTS "Enable delete for all users" ON companies;

DROP POLICY IF EXISTS "Enable read access for all users" ON deals;
DROP POLICY IF EXISTS "Enable insert for all users" ON deals;
DROP POLICY IF EXISTS "Enable update for all users" ON deals;
DROP POLICY IF EXISTS "Enable delete for all users" ON deals;

DROP POLICY IF EXISTS "Enable read access for all users" ON activities;
DROP POLICY IF EXISTS "Enable insert for all users" ON activities;
DROP POLICY IF EXISTS "Enable update for all users" ON activities;
DROP POLICY IF EXISTS "Enable delete for all users" ON activities;

DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for all users" ON users;
DROP POLICY IF EXISTS "Enable update for all users" ON users;
DROP POLICY IF EXISTS "Enable delete for all users" ON users;

DROP POLICY IF EXISTS "Enable read access for all users" ON settings;
DROP POLICY IF EXISTS "Enable update for all users" ON settings;

DROP POLICY IF EXISTS "Enable read access for all users" ON revenue_history;
DROP POLICY IF EXISTS "Enable insert for all users" ON revenue_history;

DROP POLICY IF EXISTS "Enable read access for all users" ON pipeline_history;
DROP POLICY IF EXISTS "Enable insert for all users" ON pipeline_history;

-- Recreate policies
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
-- FINISH
-- ============================================
SELECT 'CRM-system Database Cleaned Successfully!' as status;