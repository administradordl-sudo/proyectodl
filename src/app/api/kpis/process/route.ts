import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const asistenciasToUpsert = data.asistenciasToUpsert;

    if (!asistenciasToUpsert || !Array.isArray(asistenciasToUpsert)) {
      return NextResponse.json({ error: 'Datos de asistencias inválidos o faltantes.' }, { status: 400 });
    }

    if (asistenciasToUpsert.length === 0) {
      return NextResponse.json({ error: 'No hay datos para guardar.' }, { status: 400 });
    }

    // Upsert into Supabase in chunks
    const chunkSize = 1000;
    for (let i = 0; i < asistenciasToUpsert.length; i += chunkSize) {
      const chunk = asistenciasToUpsert.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('asistencias')
        .upsert(chunk, { onConflict: 'nombre_crudo, fecha' });
        
      if (error) {
        console.error('Supabase Upsert Error:', error);
        throw error;
      }
    }

    return NextResponse.json({ success: true, count: asistenciasToUpsert.length }, { status: 200 });

  } catch (error: any) {
    console.error('Error saving KPIs:', error);
    return NextResponse.json({ error: error.message || 'Error al guardar los registros en BD' }, { status: 500 });
  }
}
