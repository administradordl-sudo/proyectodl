import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { empleado_id, tipo_marca } = await req.json();

    if (!empleado_id || !tipo_marca) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    const horaActual = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:mm

    // Obtener empleado para su nombre
    const { data: empleado } = await supabase
      .from('empleados')
      .select('nombres, apellidos')
      .eq('id', empleado_id)
      .single();

    if (!empleado) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    const nombre_completo = `${empleado.apellidos}, ${empleado.nombres}`;

    // Buscar si ya existe la asistencia para hoy
    const { data: asistenciaActual } = await supabase
      .from('asistencias')
      .select('*')
      .eq('empleado_id', empleado_id)
      .eq('fecha', fechaHoy)
      .single();

    // Mapear tipo de marca a columna
    const columnMap: Record<string, string> = {
      'ingreso': 'hora_ingreso',
      'inicio_refrigerio': 'hora_inicio_refrigerio',
      'fin_refrigerio': 'hora_fin_refrigerio',
      'fin_turno': 'hora_salida'
    };

    const columnToUpdate = columnMap[tipo_marca];

    if (!asistenciaActual) {
      if (tipo_marca !== 'ingreso') {
        return NextResponse.json({ error: 'Debe marcar ingreso primero' }, { status: 400 });
      }
      
      // Crear nueva asistencia
      const { data, error } = await supabase
        .from('asistencias')
        .insert({
          empleado_id,
          nombre_crudo: nombre_completo,
          fecha: fechaHoy,
          hora_ingreso: horaActual
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data, message: 'Ingreso registrado correctamente' });
      
    } else {
      // Actualizar asistencia existente
      if (asistenciaActual[columnToUpdate]) {
        return NextResponse.json({ error: `Ya existe un registro de ${tipo_marca} para hoy` }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('asistencias')
        .update({ [columnToUpdate]: horaActual, updated_at: new Date().toISOString() })
        .eq('id', asistenciaActual.id)
        .select()
        .single();

      if (error) {
        // Puede que las columnas de refrigerio/salida no existan aún en el schema de la BD. 
        // En ese caso, devolveremos el error detallado para que el admin lo note.
        throw error;
      }
      return NextResponse.json({ success: true, data, message: `Marca de ${tipo_marca.replace('_', ' ')} registrada correctamente` });
    }

  } catch (err: any) {
    console.error('Error en mark-biometric route:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
