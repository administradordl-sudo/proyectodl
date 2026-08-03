-- ==========================================
-- TABLA HISTÓRICA DE ASISTENCIAS Y KPIS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID REFERENCES public.empleados(id) ON DELETE CASCADE,
    nombre_crudo VARCHAR(255) NOT NULL, -- Nombre tal cual viene del Excel por si no hace match
    fecha DATE NOT NULL,
    horario VARCHAR(50), -- Ej: "07:30 - 17:00"
    hora_ingreso TIME, -- Hora real de llegada
    minutos_tardanza INTEGER DEFAULT 0 NOT NULL,
    es_falta BOOLEAN DEFAULT false NOT NULL,
    minutos_extra INTEGER DEFAULT 0 NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Restricción clave: Solo puede haber 1 registro por nombre_crudo (o empleado) y fecha.
    -- Así evitamos duplicados si el usuario sube el Excel 2 veces.
    CONSTRAINT uk_asistencias_nombre_fecha UNIQUE (nombre_crudo, fecha)
);

-- Habilitar RLS
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (Para este proyecto, permitimos todo)
CREATE POLICY "Permitir todo asistencias" 
ON public.asistencias FOR ALL 
USING (true)
WITH CHECK (true);

-- Trigger para actualizar updated_at
CREATE TRIGGER tr_actualizar_asistencias_updated_at
BEFORE UPDATE ON public.asistencias
FOR EACH ROW
EXECUTE FUNCTION actualizar_timestamp_updated_at();
