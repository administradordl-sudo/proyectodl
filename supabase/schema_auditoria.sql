-- =====================================================================================
-- MÓDULO DE AUDITORÍA GLOBAL (AUDIT LOGS)
-- =====================================================================================

-- 1. Crear la tabla principal de auditoría
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,         
    action TEXT NOT NULL,             -- 'INSERT', 'UPDATE', 'DELETE'
    record_id UUID,                   -- ID del registro afectado (se asume que todas usan id UUID)
    old_data JSONB,                   -- Datos antes del cambio
    new_data JSONB,                   -- Datos después del cambio
    user_id UUID,                     -- Usuario que hizo el cambio (si hay auth)
    user_email TEXT,                  -- Útil para búsqueda rápida o logueo manual futuro
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear un índice para mejorar la velocidad de búsqueda
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Habilitar RLS en audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Por seguridad, normalmente solo los admins pueden ver esto. Por ahora permitimos a todos:
CREATE POLICY "Permitir lectura de audit_logs a todos" 
ON public.audit_logs FOR SELECT 
USING (true);

-- Insert solo desde triggers (opcionalmente bloquear por policy, 
-- pero Postgres los triggers bypass RLS si actúan como postgres user,
-- sin embargo, es bueno dejar el policy abierto para pruebas o restringir a authenticated)
CREATE POLICY "Permitir insertar audit_logs" 
ON public.audit_logs FOR INSERT 
WITH CHECK (true);

-- =====================================================================================
-- 2. Crear la función maestra de auditoría (Trigger Function)
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_record_id UUID;
    v_user_id UUID;
BEGIN
    -- Capturar el ID de usuario desde auth.uid() de Supabase
    v_user_id := auth.uid();

    IF (TG_OP = 'UPDATE') THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        
        -- Extraer el ID de forma dinámica si existe (manejando posible error si la tabla no tiene id)
        BEGIN
            v_record_id := (v_new_data->>'id')::uuid;
        EXCEPTION WHEN others THEN
            v_record_id := NULL;
        END;

        INSERT INTO public.audit_logs (table_name, action, record_id, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME::TEXT, TG_OP, v_record_id, v_old_data, v_new_data, v_user_id);
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        v_old_data := to_jsonb(OLD);
        
        BEGIN
            v_record_id := (v_old_data->>'id')::uuid;
        EXCEPTION WHEN others THEN
            v_record_id := NULL;
        END;

        INSERT INTO public.audit_logs (table_name, action, record_id, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME::TEXT, TG_OP, v_record_id, v_old_data, NULL, v_user_id);
        RETURN OLD;
        
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data := to_jsonb(NEW);
        
        BEGIN
            v_record_id := (v_new_data->>'id')::uuid;
        EXCEPTION WHEN others THEN
            v_record_id := NULL;
        END;

        INSERT INTO public.audit_logs (table_name, action, record_id, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME::TEXT, TG_OP, v_record_id, NULL, v_new_data, v_user_id);
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================================================
-- 3. Asignación de Triggers a las tablas principales
-- =====================================================================================

-- Ejemplo: Módulo de Empleados
DROP TRIGGER IF EXISTS audit_empleados ON public.empleados;
CREATE TRIGGER audit_empleados
    AFTER INSERT OR UPDATE OR DELETE ON public.empleados
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Ejemplo: Módulo de Permisos
DROP TRIGGER IF EXISTS audit_permisos ON public.permisos;
CREATE TRIGGER audit_permisos
    AFTER INSERT OR UPDATE OR DELETE ON public.permisos
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Ejemplo: Módulo de Almacén EPP (epp_items)
DROP TRIGGER IF EXISTS audit_epp_items ON public.epp_items;
CREATE TRIGGER audit_epp_items
    AFTER INSERT OR UPDATE OR DELETE ON public.epp_items
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Ejemplo: Módulo de Almacén EPP (epp_transactions)
DROP TRIGGER IF EXISTS audit_epp_transactions ON public.epp_transactions;
CREATE TRIGGER audit_epp_transactions
    AFTER INSERT OR UPDATE OR DELETE ON public.epp_transactions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Ejemplo: Registro de Asistencias (Tareo)
DROP TRIGGER IF EXISTS audit_asistencias ON public.asistencias;
CREATE TRIGGER audit_asistencias
    AFTER INSERT OR UPDATE OR DELETE ON public.asistencias
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Ejemplo: Acuerdos Laborales
DROP TRIGGER IF EXISTS audit_sst_acuerdos_versiones ON public.sst_acuerdos_versiones;
CREATE TRIGGER audit_sst_acuerdos_versiones
    AFTER INSERT OR UPDATE OR DELETE ON public.sst_acuerdos_versiones
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
