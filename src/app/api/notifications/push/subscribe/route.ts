import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // fallback

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const { subscription, email } = await req.json()

    if (!subscription || !subscription.endpoint || !email) {
      return NextResponse.json({ error: 'Faltan datos de suscripción o correo' }, { status: 400 })
    }

    // Upsert into Supabase
    // To handle multiple devices, we insert without uniqueness constraint on user_id, just endpoint
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert([
        {
          email: email.toLowerCase().trim(),
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      ])

    if (error) {
      // If endpoint already exists (violates unique constraint if added), it's fine, we catch or ignore
      console.error('Error guardando suscripción:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Suscripción guardada exitosamente' })
  } catch (error: any) {
    console.error('Error en ruta de suscripción:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
