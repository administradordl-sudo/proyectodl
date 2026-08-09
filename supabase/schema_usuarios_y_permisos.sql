-- =====================================================================================
-- MÓDULO DE PERMISOS DE USUARIO Y ACTUALIZACIÓN DE NOTIFICACIONES PUSH
-- =====================================================================================

-- 1. Crear tabla para los privilegios granulares por módulo
CREATE TABLE IF NOT EXISTS public.usuario_accesos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Enlazar con tabla de empleados si existe, sino usamos auth.users o correo.
    -- Como "empleados" puede no estar creada en public o estar en otro schema, 
    -- usamos un identificador flexible por si acaso (o DNI/Email).
    -- En proyectos sin auth completa a veces se usa email. 
    -- Vamos a dejarlo por email que es seguro para cruzar:
    user_email VARCHAR(255) NOT NULL, 
    modulo VARCHAR(50) NOT NULL, -- Ej: 'RRHH', 'Mantenimiento', 'SST', 'Vigilancia'
    
    -- Permisos granulares
    puede_ver BOOLEAN DEFAULT false,
    puede_crear BOOLEAN DEFAULT false,
    puede_editar BOOLEAN DEFAULT false,
    puede_eliminar BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Un usuario solo puede tener un registro de acceso por cada módulo
    CONSTRAINT uk_usuario_modulo UNIQUE (user_email, modulo)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_usuario_accesos_email ON public.usuario_accesos(user_email);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_timestamp_usuario_accesos()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_update_usuario_accesos ON public.usuario_accesos;
CREATE TRIGGER tr_update_usuario_accesos
BEFORE UPDATE ON public.usuario_accesos
FOR EACH ROW EXECUTE FUNCTION update_timestamp_usuario_accesos();


-- =====================================================================================
-- 2. Actualizar tabla push_subscriptions para almacenar el modelo de equipo
-- =====================================================================================
-- Añadimos las columnas si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='push_subscriptions' AND column_name='os') THEN
        ALTER TABLE public.push_subscriptions ADD COLUMN os VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='push_subscriptions' AND column_name='browser') THEN
        ALTER TABLE public.push_subscriptions ADD COLUMN browser VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='push_subscriptions' AND column_name='device_model') THEN
        ALTER TABLE public.push_subscriptions ADD COLUMN device_model VARCHAR(255);
    END IF;
END $$;
