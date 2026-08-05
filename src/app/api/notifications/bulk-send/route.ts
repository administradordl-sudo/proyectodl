import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const resend = new Resend(process.env.RESEND_API_KEY)

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@empresa.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: Request) {
  try {
    const { audience, audienceValue, title, message, sendPush, sendEmail } = await req.json()

    if (!title || !message) {
      return NextResponse.json({ error: 'Falta título o mensaje' }, { status: 400 })
    }

    // 1. Fetch matching employees from DB based on audience
    let query = supabase.from('empleados').select('id, email, correo_personal, nombres, apellidos, dni')

    if (audience === 'Por Persona') {
      // Assuming audienceValue is the DNI or exactly the name for now, let's use exact DNI match
      query = query.eq('dni', audienceValue)
    } else if (audience === 'Por Puesto') {
      query = query.eq('puesto', audienceValue)
    } else if (audience === 'Por Área') {
      query = query.eq('area', audienceValue)
    } else if (audience === 'Por Género') {
      query = query.eq('genero', audienceValue)
    }

    const { data: empleados, error: empError } = await query

    if (empError) throw empError
    if (!empleados || empleados.length === 0) {
      return NextResponse.json({ success: false, message: 'No se encontraron empleados para el filtro seleccionado' }, { status: 404 })
    }

    // Collect all unique emails from matching employees
    const targetEmails = new Set<string>()
    empleados.forEach(emp => {
      if (emp.email) targetEmails.add(emp.email.toLowerCase().trim())
      if (emp.correo_personal) targetEmails.add(emp.correo_personal.toLowerCase().trim())
    })

    const results = {
      emailsSent: 0,
      pushesSent: 0,
      errors: [] as any[]
    }

    // 2. Send Emails via Resend
    if (sendEmail && targetEmails.size > 0) {
      const emailList = Array.from(targetEmails)
      try {
        const { data, error } = await resend.emails.send({
          from: 'Auto Tareo Notificaciones <onboarding@resend.dev>', // Update for production
          to: emailList,
          subject: title,
          html: `<div style="font-family: sans-serif; padding: 20px;">
                   <h2 style="color: #2563eb;">${title}</h2>
                   <p style="white-space: pre-wrap; font-size: 16px;">${message}</p>
                 </div>`,
        })
        if (error) throw error
        results.emailsSent = emailList.length
      } catch (err: any) {
        console.error('Error enviando emails:', err)
        results.errors.push({ type: 'email', error: err.message })
      }
    }

    // 3. Send Push Notifications
    if (sendPush) {
      // Fetch all push subscriptions
      const { data: allSubscriptions, error: subError } = await supabase.from('push_subscriptions').select('*')
      
      if (!subError && allSubscriptions && allSubscriptions.length > 0) {
        // Find which subscriptions belong to our target emails
        const validSubscriptions = []

        for (const sub of allSubscriptions) {
          // Check directly against the email stored in the subscription (no auth.users needed)
          if (sub.email && targetEmails.has(sub.email.toLowerCase().trim())) {
            validSubscriptions.push(sub)
          }
        }

        const payload = JSON.stringify({
          title,
          body: message,
          url: '/', // They can be directed to home or a specific alerts page
          icon: '/icon-192.png'
        })

        await Promise.allSettled(
          validSubscriptions.map(async (sub) => {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            }
            try {
              await webpush.sendNotification(pushSubscription, payload)
              results.pushesSent++
            } catch (err: any) {
              if (err.statusCode === 404 || err.statusCode === 410) {
                // Subscription expired
                await supabase.from('push_subscriptions').delete().eq('id', sub.id)
              } else {
                console.error('Error sending push to', sub.endpoint, err)
              }
            }
          })
        )
      }
    }

    return NextResponse.json({ success: true, results, matchingEmployees: empleados.length })

  } catch (error: any) {
    console.error('Error en bulk-send:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
