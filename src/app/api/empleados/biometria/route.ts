import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { empleado_id, face_descriptor } = await req.json();

    if (!empleado_id || !face_descriptor) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (empleado_id o face_descriptor)' },
        { status: 400 }
      );
    }

    // Upsert en la tabla empleado_biometria
    const { data, error } = await supabase
      .from('empleado_biometria')
      .upsert(
        {
          empleado_id,
          face_descriptor: JSON.stringify(face_descriptor),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'empleado_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error al guardar biometria:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in biometria route:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
