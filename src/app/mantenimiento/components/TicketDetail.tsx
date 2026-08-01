'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Send, Loader2, User, Clock, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { updateTicketStatus, addTicketComment } from '../actions';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

type Comentario = {
  id: string;
  nombre_usuario: string;
  comentario: string;
  evidencia_url: string | null;
  created_at: string;
};

type TicketDetalle = {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: string;
  estado: string;
  ubicacion: string;
  placa_vehiculo: string | null;
  evidencia_url: string | null;
  created_at: string;
  comentarios: Comentario[];
};

export default function TicketDetail({ ticket }: { ticket: TicketDetalle }) {
  const [estado, setEstado] = useState(ticket.estado);
  const [comentario, setComentario] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);

  const getPriorityBadge = (prioridad: string) => {
    switch (prioridad) {
      case 'Emergencia': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 uppercase tracking-wider">Emergencia</span>;
      case 'Alta': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200 uppercase tracking-wider">Alta</span>;
      case 'Media': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200 uppercase tracking-wider">Media</span>;
      case 'Baja': default: return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200 uppercase tracking-wider">Baja</span>;
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoEstado = e.target.value;
    setIsUpdatingStatus(true);
    const result = await updateTicketStatus(ticket.id, nuevoEstado);
    if (result.success) {
      setEstado(nuevoEstado);
    } else {
      alert("Error al actualizar el estado: " + result.error);
    }
    setIsUpdatingStatus(false);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('mantenimiento_evidencias').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('mantenimiento_evidencias').getPublicUrl(fileName);
      return publicUrl;
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      return null;
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentario.trim() && !file) return;

    setIsSendingComment(true);
    let evidenciaUrl = null;
    if (file) {
      evidenciaUrl = await uploadFile(file);
    }

    const result = await addTicketComment(ticket.id, comentario, evidenciaUrl);
    if (result.success) {
      setComentario('');
      setFile(null);
    } else {
      alert("Error al enviar comentario: " + result.error);
    }
    setIsSendingComment(false);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start w-full">
      
      {/* Columna Izquierda: Detalles del Ticket */}
      <div className="w-full md:w-1/3 space-y-6">
        <Link href="/mantenimiento" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-sm font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Panel
        </Link>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{ticket.titulo}</h2>
            {getPriorityBadge(ticket.prioridad)}
          </div>
          
          <div className="space-y-4 text-sm">
            <div>
              <span className="block text-gray-500 mb-1">Descripción:</span>
              <p className="text-gray-800 whitespace-pre-wrap">{ticket.descripcion}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div>
                <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Categoría</span>
                <span className="font-medium text-gray-900">{ticket.categoria}</span>
              </div>
              <div>
                <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Ubicación</span>
                <span className="font-medium text-gray-900">{ticket.ubicacion}</span>
              </div>
              {ticket.placa_vehiculo && (
                <div>
                  <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Placa</span>
                  <span className="font-medium font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{ticket.placa_vehiculo}</span>
                </div>
              )}
              <div>
                <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Fecha Reporte</span>
                <span className="font-medium text-gray-900">{format(new Date(ticket.created_at), "dd MMM yyyy", { locale: es })}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <span className="block text-gray-500 text-xs uppercase tracking-wider mb-2">Estado del Ticket</span>
              <div className="relative">
                <select 
                  value={estado} 
                  onChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 disabled:opacity-50 appearance-none font-medium"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="En Progreso">En Progreso</option>
                  <option value="Resuelto">Resuelto</option>
                  <option value="Cerrado">Cerrado</option>
                </select>
                {isUpdatingStatus && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-gray-400" />}
              </div>
            </div>

            {ticket.evidencia_url && (
              <div className="border-t border-gray-100 pt-4">
                <span className="block text-gray-500 text-xs uppercase tracking-wider mb-2">Evidencia Original</span>
                <a href={ticket.evidencia_url} target="_blank" rel="noreferrer" className="block relative h-32 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                  <Image src={ticket.evidencia_url} alt="Evidencia" fill className="object-cover" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Comentarios / Hilo */}
      <div className="w-full md:w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[75vh]">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            Historial y Actualizaciones
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
          {ticket.comentarios.length === 0 ? (
            <div className="text-center text-gray-400 py-10 flex flex-col items-center">
              <CheckCircle className="w-12 h-12 mb-3 text-gray-300" />
              <p>No hay comentarios aún.</p>
              <p className="text-sm mt-1">Sé el primero en actualizar el estado de este ticket.</p>
            </div>
          ) : (
            ticket.comentarios.map((com) => {
              const isSystem = com.nombre_usuario === 'Sistema';
              return (
                <div key={com.id} className={`flex gap-4 ${isSystem ? 'justify-center' : ''}`}>
                  {!isSystem && (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div className={`flex flex-col ${isSystem ? 'items-center text-center max-w-sm' : 'max-w-xl'}`}>
                    {!isSystem && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900">{com.nombre_usuario || 'Usuario'}</span>
                        <span className="text-xs text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1"/> {format(new Date(com.created_at), "HH:mm - dd MMM", { locale: es })}</span>
                      </div>
                    )}
                    
                    <div className={`p-4 rounded-2xl text-sm shadow-sm ${
                      isSystem 
                        ? 'bg-gray-100 text-gray-600 border border-gray-200 rounded-full py-1.5 px-4 text-xs' 
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                    }`}>
                      {com.comentario.includes('**') ? (
                        <span dangerouslySetInnerHTML={{__html: com.comentario.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>')}} />
                      ) : (
                        <span className="whitespace-pre-wrap">{com.comentario}</span>
                      )}
                      
                      {com.evidencia_url && (
                        <a href={com.evidencia_url} target="_blank" rel="noreferrer" className="block mt-3 relative h-40 rounded-lg overflow-hidden border border-gray-200">
                           <Image src={com.evidencia_url} alt="Evidencia adjunta" fill className="object-cover" />
                        </a>
                      )}
                    </div>
                    {isSystem && (
                       <span className="text-[10px] text-gray-400 mt-1">{format(new Date(com.created_at), "HH:mm - dd MMM", { locale: es })}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-200 rounded-b-xl">
          {file && (
            <div className="mb-3 flex items-center justify-between p-2 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
              <span className="flex items-center truncate"><ImageIcon className="w-4 h-4 mr-2 flex-shrink-0"/> {file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-xs text-red-500 hover:underline font-medium">Quitar</button>
            </div>
          )}
          <form onSubmit={handleCommentSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Añadir comentario o actualización..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-12 min-h-[48px]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if(comentario.trim() || file) handleCommentSubmit(e as unknown as React.FormEvent);
                  }
                }}
              />
              <label className="absolute right-3 top-3 cursor-pointer text-gray-400 hover:text-blue-500 transition-colors">
                <ImageIcon className="w-5 h-5" />
                <input type="file" className="sr-only" accept="image/*" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
              </label>
            </div>
            <button
              type="submit"
              disabled={isSendingComment || (!comentario.trim() && !file)}
              className="bg-blue-600 text-white rounded-xl p-3 flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
          <div className="mt-2 text-xs text-gray-400 text-center">
            Presiona <kbd className="font-sans px-1 bg-gray-100 rounded border">Enter</kbd> para enviar
          </div>
        </div>
      </div>
    </div>
  );
}
