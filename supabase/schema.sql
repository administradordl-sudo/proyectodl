-- Crear tabla de feriados
CREATE TABLE IF NOT EXISTS public.feriados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    descripcion TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear tabla de permisos
CREATE TYPE estado_permiso AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

CREATE TABLE IF NOT EXISTS public.permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_trabajador TEXT NOT NULL,
    fecha_permiso DATE NOT NULL,
    motivo TEXT NOT NULL,
    estado estado_permiso DEFAULT 'PENDIENTE',
    solicitado_por TEXT, -- UUID o texto plano si es mock
    aprobado_por TEXT,   -- UUID o texto plano si es mock
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;

-- Políticas de Feriados
-- Permitir lectura a todos (anon y authenticated)
CREATE POLICY "Permitir lectura de feriados a todos" 
ON public.feriados FOR SELECT 
USING (true);

-- Permitir gestión de feriados a todos (para pruebas sin autenticación)
CREATE POLICY "Permitir gestión de feriados a todos" 
ON public.feriados FOR ALL 
USING (true);

-- Políticas de Permisos
-- Permitir lectura de permisos a todos
CREATE POLICY "Permitir lectura de permisos a todos" 
ON public.permisos FOR SELECT 
USING (true);

-- Permitir inserción de permisos a todos (o autenticados)
CREATE POLICY "Permitir insertar permisos" 
ON public.permisos FOR INSERT 
WITH CHECK (true);

-- Permitir actualización a todos (para pruebas sin autenticación)
CREATE POLICY "Permitir actualización de permisos" 
ON public.permisos FOR UPDATE 
USING (true);

-- ==========================================
-- MÓDULO DE MANTENIMIENTO (Infraestructura y Flota)
-- ==========================================

-- Crear enumeraciones para restringir los valores permitidos
CREATE TYPE categoria_mantenimiento AS ENUM (
    'Infraestructura', 
    'Reparaciones', 
    'Mantenimiento General', 
    'Mantenimiento Preventivo', 
    'Mantenimiento de Unidades'
);

CREATE TYPE prioridad_mantenimiento AS ENUM (
    'Baja', 
    'Media', 
    'Alta', 
    'Emergencia'
);

CREATE TYPE estado_mantenimiento AS ENUM (
    'Pendiente', 
    'En Progreso', 
    'Resuelto', 
    'Cerrado'
);

-- Crear la tabla principal de tickets de mantenimiento
CREATE TABLE IF NOT EXISTS public.tickets_mantenimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria categoria_mantenimiento NOT NULL,
    prioridad prioridad_mantenimiento NOT NULL,
    estado estado_mantenimiento DEFAULT 'Pendiente' NOT NULL,
    ubicacion VARCHAR(255) NOT NULL,
    placa_vehiculo VARCHAR(50),
    evidencia_url TEXT,
    reportado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    asignado_a UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Restricción a nivel de BD para asegurar que la placa sea requerida 
    -- SOLO si la categoría es 'Mantenimiento de Unidades'
    CONSTRAINT chk_placa_vehiculo CHECK (
        (categoria = 'Mantenimiento de Unidades' AND placa_vehiculo IS NOT NULL AND placa_vehiculo <> '') OR
        (categoria != 'Mantenimiento de Unidades')
    )
);

-- Habilitar RLS
ALTER TABLE public.tickets_mantenimiento ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad básicas (Adaptar según roles reales del proyecto)
-- Lectura para todos los autenticados
CREATE POLICY "Permitir lectura de tickets a usuarios autenticados" 
ON public.tickets_mantenimiento FOR SELECT 
USING (auth.role() = 'authenticated' OR true); -- Cambiar "OR true" si hay autenticación real

-- Inserción
CREATE POLICY "Permitir crear tickets" 
ON public.tickets_mantenimiento FOR INSERT 
WITH CHECK (true); -- Cambiar a auth.uid() = reportado_por en entorno real

-- Actualización
CREATE POLICY "Permitir actualizar tickets" 
ON public.tickets_mantenimiento FOR UPDATE 
USING (true);

-- Trigger para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION actualizar_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_actualizar_tickets_mantenimiento_updated_at
BEFORE UPDATE ON public.tickets_mantenimiento
FOR EACH ROW
EXECUTE FUNCTION actualizar_timestamp_updated_at();

-- ==========================================
-- STORAGE (Evidencias de Mantenimiento)
-- ==========================================

-- 1. Crear el bucket si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('mantenimiento_evidencias', 'mantenimiento_evidencias', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Storage
-- Permitir a cualquiera ver las imágenes (es un bucket público)
CREATE POLICY "Permitir ver evidencias"
ON storage.objects FOR SELECT
USING (bucket_id = 'mantenimiento_evidencias');

-- Permitir subir imágenes a usuarios autenticados (o a todos si no hay Auth configurado estricto aún)
CREATE POLICY "Permitir subir evidencias"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mantenimiento_evidencias');

-- ==========================================
-- COMENTARIOS DE TICKETS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.ticket_comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.tickets_mantenimiento(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nombre_usuario VARCHAR(255), -- Temporal para usuario mock
    comentario TEXT NOT NULL,
    evidencia_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ticket_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de comentarios"
ON public.ticket_comentarios FOR SELECT
USING (true);

CREATE POLICY "Permitir crear comentarios"
ON public.ticket_comentarios FOR INSERT
WITH CHECK (true);

-- ==========================================
-- CONFIGURACIÓN DEL SISTEMA (Sedes y Bancos)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.config_sedes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.config_bancos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar valores por defecto
INSERT INTO public.config_sedes (nombre) VALUES ('Principal'), ('Almacén') ON CONFLICT DO NOTHING;
INSERT INTO public.config_bancos (nombre) VALUES ('BCP'), ('Interbank'), ('BBVA') ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.config_sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_bancos ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Permitir lectura de sedes" ON public.config_sedes FOR SELECT USING (true);
CREATE POLICY "Permitir insertar sedes" ON public.config_sedes FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir lectura de bancos" ON public.config_bancos FOR SELECT USING (true);
CREATE POLICY "Permitir insertar bancos" ON public.config_bancos FOR INSERT WITH CHECK (true);
