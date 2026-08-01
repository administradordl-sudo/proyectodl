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
