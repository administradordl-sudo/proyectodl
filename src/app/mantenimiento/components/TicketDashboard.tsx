'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Filter, AlertCircle, Clock, CheckCircle, Search, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Ticket = {
  id: string;
  titulo: string;
  categoria: string;
  prioridad: string;
  estado: string;
  ubicacion: string;
  placa_vehiculo: string | null;
  created_at: string;
};

interface TicketDashboardProps {
  initialTickets: Ticket[];
}

export default function TicketDashboard({ initialTickets }: TicketDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentCategoria = searchParams.get('categoria') || '';
  const currentEstado = searchParams.get('estado') || '';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);

  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-tickets-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets_mantenimiento' }, (payload) => {
        setTickets(prev => {
          if (prev.find(t => t.id === payload.new.id)) return prev;
          return [payload.new as Ticket, ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets_mantenimiento' }, (payload) => {
        setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...(payload.new as Ticket) } : t));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tickets_mantenimiento' }, (payload) => {
        setTickets(prev => prev.filter(t => t.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle server-side filter changes
  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/mantenimiento?${params.toString()}`);
  };

  // Client-side search (for text search within fetched results)
  const filteredTickets = tickets.filter(ticket => {
    return searchTerm 
      ? ticket.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
        ticket.ubicacion.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
  });

  const getPriorityBadge = (prioridad: string) => {
    switch (prioridad) {
      case 'Emergencia':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><AlertCircle className="w-3 h-3 mr-1" /> Emergencia</span>;
      case 'Alta':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">Alta</span>;
      case 'Media':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">Media</span>;
      case 'Baja':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Baja</span>;
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" /> Pendiente</span>;
      case 'En Progreso':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">En Progreso</span>;
      case 'Resuelto':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Resuelto</span>;
      case 'Cerrado':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-800">Cerrado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{estado}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-800">Tickets de Mantenimiento</h2>
            <Link 
              href="/mantenimiento/nuevo"
              className="inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nuevo Ticket
            </Link>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar en resultados..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full lg:w-64"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="hidden sm:flex items-center justify-center">
                <Filter className="h-4 w-4 text-gray-500 mx-1" />
              </div>
              <select 
                value={currentCategoria}
                onChange={(e) => updateFilters('categoria', e.target.value)}
                className="py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white w-full sm:w-auto"
              >
                <option value="">Todas las Categorías</option>
                <option value="Infraestructura">Infraestructura</option>
                <option value="Reparaciones">Reparaciones</option>
                <option value="Mantenimiento General">Mantenimiento General</option>
                <option value="Mantenimiento Preventivo">Preventivo</option>
                <option value="Mantenimiento de Unidades">Unidades</option>
              </select>

              <select 
                value={currentEstado}
                onChange={(e) => updateFilters('estado', e.target.value)}
                className="py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white w-full sm:w-auto"
              >
                <option value="">Todos los Estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En Progreso">En Progreso</option>
                <option value="Resuelto">Resuelto</option>
                <option value="Cerrado">Cerrado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Ticket</th>
              <th scope="col" className="px-4 py-3 font-semibold">Categoría / Ubicación</th>
              <th scope="col" className="px-4 py-3 font-semibold text-center whitespace-nowrap">Prioridad</th>
              <th scope="col" className="px-4 py-3 font-semibold text-center whitespace-nowrap">Estado</th>
              <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => (
                <tr 
                  key={ticket.id} 
                  onClick={() => router.push(`/mantenimiento/${ticket.id}`)}
                  className="bg-white border-b hover:bg-blue-50/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 line-clamp-1" title={ticket.titulo}>{ticket.titulo}</div>
                    {ticket.placa_vehiculo && (
                      <div className="text-xs text-blue-600 mt-1 font-mono bg-blue-50 inline-block px-1 rounded">
                        Placa: {ticket.placa_vehiculo}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{ticket.categoria}</div>
                    <div className="text-xs text-gray-500 mt-1">{ticket.ubicacion}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getPriorityBadge(ticket.prioridad)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(ticket.estado)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(ticket.created_at), "dd MMM yyyy", { locale: es })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <Filter className="h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-base font-medium text-gray-900">No se encontraron tickets</p>
                    <p className="text-sm">Ajusta los filtros para ver más resultados.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
        <span>Mostrando {filteredTickets.length} tickets</span>
        <span>Módulo de Mantenimiento Logístico</span>
      </div>
    </div>
  );
}
