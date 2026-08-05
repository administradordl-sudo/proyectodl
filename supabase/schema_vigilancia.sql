-- ==========================================
-- MÓDULO DE VIGILANCIA (Registro de Visitas)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.registro_visitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni VARCHAR(20) NOT NULL,
    nombres_apellidos VARCHAR(255) NOT NULL,
    empresa VARCHAR(255),
    motivo_visita TEXT NOT NULL,
    persona_visitada VARCHAR(255) NOT NULL,
    firmo_acuerdo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.registro_visitas ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (Adaptar según roles reales del proyecto si hay Auth)
-- Permitir lectura de visitas a todos
CREATE POLICY "Permitir lectura de visitas a todos" 
ON public.registro_visitas FOR SELECT 
USING (true);

-- Permitir inserción de visitas a todos
CREATE POLICY "Permitir crear visitas" 
ON public.registro_visitas FOR INSERT 
WITH CHECK (true);

-- Índices recomendados para la búsqueda rápida por DNI
CREATE INDEX IF NOT EXISTS idx_registro_visitas_dni ON public.registro_visitas(dni);
