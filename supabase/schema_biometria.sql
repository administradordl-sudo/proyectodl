-- ==========================================
-- TABLA DE BIOMETRÍA FACIAL DE EMPLEADOS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.empleado_biometria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID REFERENCES public.empleados(id) ON DELETE CASCADE,
    face_descriptor JSONB NOT NULL, -- Almacena el array de 128 dimensiones generado por face-api
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Un empleado solo puede tener un registro biométrico (si se quiere actualizar, se hace UPDATE)
    CONSTRAINT uk_empleado_biometria UNIQUE (empleado_id)
);

-- Habilitar RLS
ALTER TABLE public.empleado_biometria ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (Permitimos lectura y escritura a todos por ahora para simplificar)
DROP POLICY IF EXISTS "Permitir lectura de biometria a todos" ON public.empleado_biometria;
CREATE POLICY "Permitir lectura de biometria a todos" 
ON public.empleado_biometria FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercion de biometria a todos" ON public.empleado_biometria;
CREATE POLICY "Permitir insercion de biometria a todos" 
ON public.empleado_biometria FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de biometria a todos" ON public.empleado_biometria;
CREATE POLICY "Permitir actualizacion de biometria a todos" 
ON public.empleado_biometria FOR UPDATE 
USING (true);

-- Trigger para actualizar updated_at (usamos la funcion que ya tienes creada)
DROP TRIGGER IF EXISTS tr_actualizar_biometria_updated_at ON public.empleado_biometria;
CREATE TRIGGER tr_actualizar_biometria_updated_at
BEFORE UPDATE ON public.empleado_biometria
FOR EACH ROW
EXECUTE FUNCTION actualizar_timestamp_updated_at();

-- ==========================================
-- ACTUALIZAR TABLA DE ASISTENCIAS 
-- (Agregar columnas para Kiosco si no existen)
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='asistencias' AND column_name='hora_inicio_refrigerio') THEN
        ALTER TABLE public.asistencias ADD COLUMN hora_inicio_refrigerio TIME;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='asistencias' AND column_name='hora_fin_refrigerio') THEN
        ALTER TABLE public.asistencias ADD COLUMN hora_fin_refrigerio TIME;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='asistencias' AND column_name='hora_salida') THEN
        ALTER TABLE public.asistencias ADD COLUMN hora_salida TIME;
    END IF;
END $$;

-- ==========================================
-- CONFIGURACIÓN DEL KIOSCO
-- ==========================================
CREATE TABLE IF NOT EXISTS public.config_kiosco (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin_salida VARCHAR(20) NOT NULL DEFAULT '1234',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.config_kiosco ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de config kiosco a todos" ON public.config_kiosco;
CREATE POLICY "Permitir lectura de config kiosco a todos" 
ON public.config_kiosco FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir actualizacion de config kiosco a todos" ON public.config_kiosco;
CREATE POLICY "Permitir actualizacion de config kiosco a todos" 
ON public.config_kiosco FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Permitir insercion de config kiosco a todos" ON public.config_kiosco;
CREATE POLICY "Permitir insercion de config kiosco a todos" 
ON public.config_kiosco FOR INSERT 
WITH CHECK (true);

-- Insertar valor por defecto si la tabla está vacía
INSERT INTO public.config_kiosco (pin_salida)
SELECT '1234'
WHERE NOT EXISTS (SELECT 1 FROM public.config_kiosco);
