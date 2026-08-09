-- =====================================================================================
-- MODULO EPP - ALMACÉN Y CONTROL DE STOCK
-- =====================================================================================

-- 1. Tabla de Catálogo de Items EPP
DROP TABLE IF EXISTS public.epp_transactions CASCADE;
DROP TABLE IF EXISTS public.sst_epp CASCADE;
DROP TABLE IF EXISTS public.epp_items CASCADE;

CREATE TABLE public.epp_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL, -- ej. Calzado, Cascos, Chalecos, Guantes
    unidad_medida VARCHAR(50) DEFAULT 'Unidad', -- ej. Unidad, Par, Caja
    stock_actual INTEGER DEFAULT 0 NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Entregas a Empleados (Cabecera)
-- Esta tabla reemplaza a la antigua sst_epp, ahora funciona como cabecera.
CREATE TABLE public.sst_epp (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    fecha_entrega DATE NOT NULL,
    motivo_entrega VARCHAR(255),
    estado_firma VARCHAR(100),
    fecha_proxima_renovacion DATE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Transacciones / Movimientos de Almacén
CREATE TABLE public.epp_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    epp_item_id UUID NOT NULL REFERENCES public.epp_items(id) ON DELETE CASCADE,
    tipo_movimiento VARCHAR(50) NOT NULL CHECK (tipo_movimiento IN ('INGRESO', 'SALIDA', 'AJUSTE')),
    cantidad INTEGER NOT NULL, -- Siempre positivo. Si es SALIDA se resta del stock.
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    motivo VARCHAR(255),
    entrega_id UUID REFERENCES public.sst_epp(id) ON DELETE CASCADE, -- Si es una salida por entrega
    usuario_registro VARCHAR(255),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Función y Trigger para mantener el stock actualizado
CREATE OR REPLACE FUNCTION update_epp_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo_movimiento = 'INGRESO' THEN
        UPDATE public.epp_items
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.epp_item_id;
    ELSIF NEW.tipo_movimiento = 'SALIDA' THEN
        UPDATE public.epp_items
        SET stock_actual = stock_actual - NEW.cantidad
        WHERE id = NEW.epp_item_id;
    ELSIF NEW.tipo_movimiento = 'AJUSTE' THEN
        -- Ajuste suma el valor exacto enviado (puede ser un delta, ej: -2 o +3).
        UPDATE public.epp_items
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.epp_item_id;
    END IF;

    -- Prevenir stock negativo
    IF (SELECT stock_actual FROM public.epp_items WHERE id = NEW.epp_item_id) < 0 THEN
        RAISE EXCEPTION 'El stock no puede ser negativo para el ítem especificado.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_epp_stock_trigger
AFTER INSERT ON public.epp_transactions
FOR EACH ROW
EXECUTE FUNCTION update_epp_stock();

-- =====================================================================================
-- Inserción de Datos Iniciales de Prueba
-- =====================================================================================
INSERT INTO public.epp_items (nombre, categoria, unidad_medida) VALUES 
('Casco de Seguridad Blanco', 'Cascos', 'Unidad'),
('Casco de Seguridad Amarillo', 'Cascos', 'Unidad'),
('Chaleco Reflectivo M', 'Chalecos', 'Unidad'),
('Chaleco Reflectivo L', 'Chalecos', 'Unidad'),
('Botas de Seguridad Punta de Acero Talla 40', 'Calzado', 'Par'),
('Botas de Seguridad Punta de Acero Talla 41', 'Calzado', 'Par'),
('Botas de Seguridad Punta de Acero Talla 42', 'Calzado', 'Par'),
('Guantes de Cuero', 'Guantes', 'Par'),
('Lentes de Seguridad Claros', 'Protección Visual', 'Unidad');

-- Como estamos probando, daremos un ingreso inicial a algunos para tener stock
INSERT INTO public.epp_transactions (epp_item_id, tipo_movimiento, cantidad, motivo)
SELECT id, 'INGRESO', 50, 'Inventario Inicial' FROM public.epp_items;
