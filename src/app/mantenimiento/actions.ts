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
          comentario: `El estado del ticket ha sido actualizado a: **${nuevoEstado}**`,
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

