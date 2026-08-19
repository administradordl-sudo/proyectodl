'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createTicket(formData: FormData, evidencia_url: string | null) {
  try {
    // Recomendación Senior Auth:
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) throw new Error('No autorizado');

    const titulo = formData.get('titulo') as string;
    const descripcion = formData.get('descripcion') as string;
    const categoria = formData.get('categoria') as string;
    const prioridad = formData.get('prioridad') as string;
    const ubicacion = formData.get('ubicacion') as string;
    const placa_vehiculo = formData.get('placa_vehiculo') as string | null;

    const { data, error } = await supabase
      .from('tickets_mantenimiento')
      .insert([
        {
          titulo,
          descripcion,
          categoria,
          prioridad,
          ubicacion,
          placa_vehiculo: categoria === 'Mantenimiento de Unidades' ? placa_vehiculo : null,
          evidencia_url,
          estado: 'Pendiente',
          // reportado_por: user.id // Usar id real del usuario en el futuro
        }
      ])
      .select();

    if (error) {
      console.error('Error al insertar ticket:', error);
      return { error: error.message };
    }

    // ------------------------------------------------------------------
    // NOTIFICAR A LOS DE MANTENIMIENTO
    // ------------------------------------------------------------------
    try {
      const webpush = require('web-push');
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@empresa.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
      );

      // Buscar empleados que tengan puesto que incluya MANTENIMIENTO
      const { data: empleados } = await supabase
        .from('empleados')
        .select('email, correo_personal')
        .ilike('puesto', '%MANTENIMIENTO%');

      if (empleados && empleados.length > 0) {
        const targetEmails = new Set<string>();
        empleados.forEach(emp => {
          if (emp.email) targetEmails.add(emp.email.toLowerCase().trim());
          if (emp.correo_personal) targetEmails.add(emp.correo_personal.toLowerCase().trim());
        });

        if (targetEmails.size > 0) {
          const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('*')
            .in('email', Array.from(targetEmails));

          if (subs && subs.length > 0) {
            const payload = JSON.stringify({
              title: 'Nuevo Ticket de Mantenimiento',
              body: `Se ha creado el ticket: ${titulo}`,
              url: '/mantenimiento',
              icon: process.env.NEXT_PUBLIC_CLIENT_LOGO || '/logo.png'
            });

            await Promise.allSettled(
              subs.map(async (sub) => {
                const pushSubscription = {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                  }
                };
                await webpush.sendNotification(pushSubscription, payload);
              })
            );
          }
        }
      }
    } catch (pushErr) {
      console.error('Error silencioso al enviar Push en nuevo ticket:', pushErr);
    }
    // ------------------------------------------------------------------

    revalidatePath('/mantenimiento');
    return { success: true, data };
  } catch (error: any) {
    console.error('Excepción al crear ticket:', error);
    return { error: error.message || 'Error desconocido' };
  }
}

export async function getTickets(categoria?: string, estado?: string) {
  let query = supabase
    .from('tickets_mantenimiento')
    .select('*')
    .order('created_at', { ascending: false });

  if (categoria) {
    query = query.eq('categoria', categoria);
  }
  
  if (estado) {
    query = query.eq('estado', estado);
  }
    
  const { data, error } = await query;
    
  if (error) {
    console.error('Error al obtener tickets:', error);
    return [];
  }
  
  return data;
}

export async function getTicketById(id: string) {
  // Obtener el ticket
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets_mantenimiento')
    .select('*')
    .eq('id', id)
    .single();

  if (ticketError || !ticket) {
    console.error('Error al obtener ticket:', ticketError);
    return null;
  }

  // Obtener los comentarios del ticket
  const { data: comentarios, error: comentariosError } = await supabase
    .from('ticket_comentarios')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  if (comentariosError) {
    console.error('Error al obtener comentarios:', comentariosError);
  }

  return { 
    ...ticket, 
    comentarios: comentarios || [] 
  };
}

export async function addTicketComment(ticketId: string, comentario: string, evidenciaUrl: string | null) {
  try {
    const { data, error } = await supabase
      .from('ticket_comentarios')
      .insert([
        {
          ticket_id: ticketId,
          comentario,
          evidencia_url: evidenciaUrl,
          nombre_usuario: 'Usuario Administrador' // Mock temporal
        }
      ])
      .select();

    if (error) throw error;
    
    revalidatePath(`/mantenimiento/${ticketId}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('Error al añadir comentario:', error);
    return { error: error.message };
  }
}

export async function updateTicketStatus(ticketId: string, nuevoEstado: string) {
  try {
    const { data, error } = await supabase
      .from('tickets_mantenimiento')
      .update({ estado: nuevoEstado })
      .eq('id', ticketId)
      .select();

    if (error) throw error;

    // Automáticamente agregar un comentario del sistema sobre el cambio de estado
    await supabase
      .from('ticket_comentarios')
      .insert([
        {
          ticket_id: ticketId,
          comentario: `El estado del ticket ha sido actualizado a: **${nuevoEstado}** - por Usuario Administrador`,
          nombre_usuario: 'Sistema'
        }
      ]);

    revalidatePath(`/mantenimiento`);
    revalidatePath(`/mantenimiento/${ticketId}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('Error al actualizar estado:', error);
    return { error: error.message };
  }
}

