import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('config_kiosco')
      .select('pin_salida')
      .limit(1)
      .single();

    if (error || !data) {
      // Si la tabla no existe o no tiene datos, devolvemos el valor por defecto
      return NextResponse.json({ pin: '1234' });
    }

    return NextResponse.json({ pin: data.pin_salida });
  } catch (err: any) {
    console.error('Error fetching kiosk pin:', err);
    return NextResponse.json({ pin: '1234' }); // Fallback seguro
  }
}

export async function POST(req: Request) {
  try {
    const { pin_salida } = await req.json();

    if (!pin_salida || pin_salida.length < 4) {
      return NextResponse.json(
        { error: 'El PIN debe tener al menos 4 caracteres' },
        { status: 400 }
      );
    }

    // Buscar si existe un registro
    const { data: existingData } = await supabase
      .from('config_kiosco')
      .select('id')
      .limit(1)
      .single();

    let result;
    if (existingData) {
      // Update
      result = await supabase
        .from('config_kiosco')
        .update({ pin_salida, updated_at: new Date().toISOString() })
        .eq('id', existingData.id)
        .select()
        .single();
    } else {
      // Insert
      result = await supabase
        .from('config_kiosco')
        .insert({ pin_salida })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({ success: true, message: 'PIN actualizado correctamente' });
  } catch (err: any) {
    console.error('Error saving kiosk pin:', err);
    return NextResponse.json({ error: 'Error interno del servidor al guardar el PIN' }, { status: 500 });
  }
}
