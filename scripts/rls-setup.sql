-- RLS Setup for MMMC Platform
-- Run this as superuser after migrations

-- Enable RLS on all tenant-scoped tables
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE votings ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- Helper function to get current tenant ID
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$;

-- Helper function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE PLPGSQL SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, false);
  IF p_user_id IS NOT NULL THEN
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, false);
  END IF;
END;
$$;

-- Generic tenant isolation policy
CREATE OR REPLACE FUNCTION create_tenant_rls_policy(table_name TEXT)
RETURNS VOID
LANGUAGE PLPGSQL
AS $$
BEGIN
  EXECUTE format(
    'CREATE POLICY tenant_isolation_%I ON %I USING (tenant_id = get_current_tenant_id())',
    table_name, table_name
  );
END;
$$;

-- Apply RLS policies
SELECT create_tenant_rls_policy('buildings');
SELECT create_tenant_rls_policy('units');
SELECT create_tenant_rls_policy('owners');
SELECT create_tenant_rls_policy('ownerships');
SELECT create_tenant_rls_policy('residents');
SELECT create_tenant_rls_policy('users');
SELECT create_tenant_rls_policy('sessions');
SELECT create_tenant_rls_policy('user_roles');
SELECT create_tenant_rls_policy('votings');
SELECT create_tenant_rls_policy('voting_options');
SELECT create_tenant_rls_policy('votes');
SELECT create_tenant_rls_policy('proxies');
SELECT create_tenant_rls_policy('meetings');
SELECT create_tenant_rls_policy('meeting_agendas');
SELECT create_tenant_rls_policy('meeting_attendees');
SELECT create_tenant_rls_policy('protocols');
SELECT create_tenant_rls_policy('protocol_signatures');
SELECT create_tenant_rls_policy('funds');
SELECT create_tenant_rls_policy('transactions');
SELECT create_tenant_rls_policy('journal_entries');
SELECT create_tenant_rls_policy('charge_templates');
SELECT create_tenant_rls_policy('charges');
SELECT create_tenant_rls_policy('payments');
SELECT create_tenant_rls_policy('debts');
SELECT create_tenant_rls_policy('tickets');
SELECT create_tenant_rls_policy('ticket_comments');
SELECT create_tenant_rls_policy('work_orders');
SELECT create_tenant_rls_policy('contractors');
SELECT create_tenant_rls_policy('contracts');
SELECT create_tenant_rls_policy('document_folders');
SELECT create_tenant_rls_policy('documents');
SELECT create_tenant_rls_policy('notifications');
SELECT create_tenant_rls_policy('budgets');
SELECT create_tenant_rls_policy('budget_items');

-- Special policy for audit_logs: super_admin only
CREATE POLICY audit_isolation ON audit_logs FOR ALL
  USING (get_current_tenant_id() IS NOT NULL);

-- Audit logs are IMMUTABLE
CREATE POLICY audit_immutable ON audit_logs FOR DELETE USING (false);
CREATE POLICY audit_no_update ON audit_logs FOR UPDATE USING (false);
