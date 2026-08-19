-- =====================================================================================
-- MÓDULO DE HORARIOS Y ASIGNACIÓN A EMPLEADOS
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.horarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL, -- ej: "Horario Oficina", "Horario Nocturno"
    hora_ingreso TIME NOT NULL,
    hora_salida TIME NOT NULL,
    minutos_tolerancia INTEGER DEFAULT 0 NOT NULL,
    dias_laborables JSONB DEFAULT '["Lunes","Martes","Miércoles","Jueves","Viernes"]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso básicas para horarios
CREATE POLICY "Permitir lectura de horarios a todos" ON public.horarios FOR SELECT USING (true);
CREATE POLICY "Permitir gestión de horarios a todos" ON public.horarios FOR ALL USING (true);

-- Añadir columna horario_id a la tabla empleados (si no existe)
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS horario_id UUID REFERENCES public.horarios(id) ON DELETE SET NULL;
