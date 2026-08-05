-- ==========================================
-- ACTUALIZACIÓN PARA MÓDULO DE VIGILANCIA Y SST
-- ==========================================

-- 1. Crear tabla para las versiones del acuerdo de seguridad (si no existe)
CREATE TABLE IF NOT EXISTS public.sst_acuerdos_versiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    activa BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar que la columna archivo_url exista (para los que ya tenían la tabla)
ALTER TABLE public.sst_acuerdos_versiones 
ADD COLUMN IF NOT EXISTS archivo_url TEXT;

-- Asegurar que solo haya una versión activa
CREATE UNIQUE INDEX IF NOT EXISTS idx_sst_acuerdos_activa ON public.sst_acuerdos_versiones(activa) WHERE activa = true;

-- Habilitar RLS
ALTER TABLE public.sst_acuerdos_versiones ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores para evitar el error "policy already exists"
DROP POLICY IF EXISTS "Permitir lectura de versiones de acuerdo a todos" ON public.sst_acuerdos_versiones;
DROP POLICY IF EXISTS "Permitir gestión de versiones a todos" ON public.sst_acuerdos_versiones;

-- Políticas de Seguridad para la tabla de acuerdos
CREATE POLICY "Permitir lectura de versiones de acuerdo a todos" 
ON public.sst_acuerdos_versiones FOR SELECT 
USING (true);

CREATE POLICY "Permitir gestión de versiones a todos" 
ON public.sst_acuerdos_versiones FOR ALL 
USING (true);

-- Insertar versión inicial si no existe
INSERT INTO public.sst_acuerdos_versiones (version, descripcion, activa) 
VALUES ('1.0', 'Acuerdo de Seguridad y Confidencialidad Inicial', true)
ON CONFLICT DO NOTHING;


-- ==========================================
-- 2. Alterar tabla registro_visitas para agregar la versión
-- ==========================================
ALTER TABLE public.registro_visitas
ADD COLUMN IF NOT EXISTS version_acuerdo VARCHAR(50);


-- ==========================================
-- 3. Crear Bucket de Storage para Acuerdos
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('acuerdos_seguridad', 'acuerdos_seguridad', true)
ON CONFLICT (id) DO NOTHING;

-- Limpiar políticas anteriores de storage para evitar errores
DROP POLICY IF EXISTS "Permitir ver acuerdos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subir acuerdos" ON storage.objects;

-- Políticas de Storage
CREATE POLICY "Permitir ver acuerdos"
ON storage.objects FOR SELECT
USING (bucket_id = 'acuerdos_seguridad');

CREATE POLICY "Permitir subir acuerdos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'acuerdos_seguridad');
