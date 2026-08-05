import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build')

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (to, subject, html)' }, { status: 400 })
    }

    const { data, error } = await resend.emails.send({
      from: 'Auto Tareo Notificaciones <onboarding@resend.dev>', // Update with your verified domain in production
      to: [to],
      subject: subject,
      html: html,
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error enviando correo:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
