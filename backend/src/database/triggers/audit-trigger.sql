-- 1. Create or replace Trigger Function
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_actor_id INTEGER;
    actor_setting TEXT;
BEGIN
    -- Lấy context actor_id từ session (nếu có)
    actor_setting := current_setting('app.current_user_id', true);
    IF actor_setting IS NOT NULL AND actor_setting <> '' THEN
        BEGIN
            current_actor_id := actor_setting::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            current_actor_id := NULL;
        END;
    ELSE
        current_actor_id := NULL;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, action, old_data, new_data, actor_id, created_at)
        VALUES (TG_TABLE_NAME, 'INSERT', NULL, to_jsonb(NEW), current_actor_id, CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, action, old_data, new_data, actor_id, created_at)
        VALUES (TG_TABLE_NAME, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_actor_id, CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, action, old_data, new_data, actor_id, created_at)
        VALUES (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD), NULL, current_actor_id, CURRENT_TIMESTAMP);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach trigger on employees table
DROP TRIGGER IF EXISTS trg_audit_employees ON employees;
CREATE TRIGGER trg_audit_employees
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 3. Attach trigger on payrolls table
DROP TRIGGER IF EXISTS trg_audit_payrolls ON payrolls;
CREATE TRIGGER trg_audit_payrolls
AFTER INSERT OR UPDATE OR DELETE ON payrolls
FOR EACH ROW EXECUTE FUNCTION process_audit_log();
