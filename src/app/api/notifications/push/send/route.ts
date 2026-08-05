import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // fallback

const supabase = createClient(supabaseUrl, supabaseServiceKey)

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:test@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: Request) {
  try {
    const { userId, title, body, url } = await req.json()

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
    }

    // Get all subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: 'Error al obtener suscripciones de la BD' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'Usuario no tiene dispositivos suscritos' }, { status: 200 })
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/',
      icon: '/logo.png'
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        try {
          await webpush.sendNotification(pushSubscription, payload)
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            // Subscription expired or unsubscribed, remove from db
            console.log('Subscription expired, deleting from DB')
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          } else {
            throw err
          }
        }
      })
    )

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Error al enviar notificaciones push:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
