-- RLS Policies for Centerpoint ETL Integration
-- This file sets up Row Level Security for landing_ and app_ schemas

-- Enable RLS on all landing tables
ALTER TABLE IF EXISTS landing_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landing_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landing_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landing_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landing_watermarks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on app schema tables (if not already enabled)
ALTER TABLE IF EXISTS companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;

-- Create service role policies for ETL operations (landing schema)
-- Service role has full access for ETL sync
CREATE POLICY "Service role full access to landing_companies" 
ON landing_companies FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to landing_contacts" 
ON landing_contacts FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to landing_productions" 
ON landing_productions FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to landing_work_orders" 
ON landing_work_orders FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to landing_invoices" 
ON landing_invoices FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to landing_files" 
ON landing_files FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to landing_watermarks" 
ON landing_watermarks FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Create authenticated user policies for app schema
-- Users can only see data for their organization
CREATE POLICY "Users can view companies in their org" 
ON companies FOR SELECT 
TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view contacts in their org" 
ON contacts FOR SELECT 
TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view projects in their org" 
ON projects FOR SELECT 
TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view work orders in their org" 
ON work_orders FOR SELECT 
TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view invoices in their org" 
ON invoices FOR SELECT 
TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- Admin policies for write access
CREATE POLICY "Admins can manage companies" 
ON companies FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
    AND organization_id = companies.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
    AND organization_id = companies.organization_id
  )
);

CREATE POLICY "Admins can manage contacts" 
ON contacts FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
    AND organization_id = contacts.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
    AND organization_id = contacts.organization_id
  )
);

-- Storage policies for centerpoint bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('centerpoint', 'centerpoint', false)
ON CONFLICT (id) DO NOTHING;

-- Service role can upload attachments
CREATE POLICY "Service role can upload centerpoint files"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'centerpoint');

-- Service role can update attachments
CREATE POLICY "Service role can update centerpoint files"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'centerpoint')
WITH CHECK (bucket_id = 'centerpoint');

-- Authenticated users can view attachments
CREATE POLICY "Authenticated users can view centerpoint files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'centerpoint');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMENT ON SCHEMA public IS 'WeatherCraft CRM production schema with RLS enabled';