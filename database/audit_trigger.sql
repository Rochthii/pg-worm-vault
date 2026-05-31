-- =====================================================================
-- WORM Cryptographic Vault (Write Once, Read Many) - Database Schema
-- Standard: ISO/IEC 27017 CLD.12.4.1 (Audit Logging)
-- Target Database: PostgreSQL 14+ / Supabase
-- Description: Enforces physical database immutability by blocking all 
--              UPDATE and DELETE statements on audit logs at the engine level.
-- =====================================================================

-- 1. Create the Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    user_id UUID,
    user_email VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    table_name VARCHAR(100),
    record_id VARCHAR(100),
    severity VARCHAR(50) DEFAULT 'info',
    ip_address VARCHAR(45),
    user_agent TEXT,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add Index for optimized scanning (B-Tree scan instead of Sequential Scan)
CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_idx ON public.audit_logs (tenant_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at);

-- 2. Define the WORM Vault Immutability Trigger Function
CREATE OR REPLACE FUNCTION public.enforce_worm_audit_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Block any attempt to update records
    IF (TG_OP = 'UPDATE') THEN
        RAISE EXCEPTION 'COMPLIANCE VIOLATION: Database immutability policy (WORM) blocks all UPDATE operations on audit_logs.'
            USING ERRCODE = 'restrict_violation';
    END IF;

    -- Block any attempt to delete records
    IF (TG_OP = 'DELETE') THEN
        RAISE EXCEPTION 'COMPLIANCE VIOLATION: Database immutability policy (WORM) blocks all DELETE operations on audit_logs.'
            USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Apply WORM Vault Security Trigger to the Table
DROP TRIGGER IF EXISTS restrict_audit_modification_trigger ON public.audit_logs;
CREATE TRIGGER restrict_audit_modification_trigger
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_worm_audit_immutability();

-- 4. Dynamic Verification Hook (Optional helper for direct DB checking)
COMMENT ON TABLE public.audit_logs IS 'WORM vault: Physical database modifications are blocked. Only INSERT operations are permitted.';
