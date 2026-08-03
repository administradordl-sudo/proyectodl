'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Filter, AlertCircle, Clock, CheckCircle, Search, Plus, MapPin, Calendar, Tag, ChevronRight, Car, Wrench, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Select from '@/components/ui/Select';

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

  const getPriorityInfo = (prioridad: string) => {
    switch (prioridad) {
      case 'Emergencia':
        return { 
          badge: <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-200 shadow-sm"><ShieldAlert className="w-3 h-3 mr-1" /> EMERGENCIA</span>,
          color: 'bg-red-500'
        };
      case 'Alta':
        return {
          badge: <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200 shadow-sm"><AlertTriangle className="w-3 h-3 mr-1" /> Alta</span>,
          color: 'bg-orange-500'
        };
      case 'Media':
        return {
          badge: <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 shadow-sm">Media</span>,
          color: 'bg-amber-400'
        };
      case 'Baja':
      default:
        return {
          badge: <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">Baja</span>,
          color: 'bg-emerald-400'
        };
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"><Clock className="w-3.5 h-3.5 mr-1 text-slate-500" /> Pendiente</span>;
      case 'En Progreso':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><Wrench className="w-3.5 h-3.5 mr-1 text-blue-500 animate-pulse" /> En Progreso</span>;
      case 'Resuelto':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"><CheckCircle className="w-3.5 h-3.5 mr-1 text-green-500" /> Resuelto</span>;
      case 'Cerrado':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">Cerrado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">{estado}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Controles Superiores */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tickets de Mantenimiento</h2>
              <p className="text-sm text-gray-500 mt-1">Administra y da seguimiento a los reportes</p>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-2.5 md:gap-3 items-stretch">
            <div className="relative group flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar por título..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 w-full lg:w-64 border border-gray-200 rounded-lg text-[13px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <Select 
                value={currentCategoria}
                onChange={(e) => updateFilters('categoria', e.target.value)}
                options={[
                  { value: 'Infraestructura', label: 'Infraestructura' },
                  { value: 'Reparaciones', label: 'Reparaciones' },
                  { value: 'Mantenimiento General', label: 'Mantenimiento General' },
                  { value: 'Mantenimiento Preventivo', label: 'Preventivo' },
                  { value: 'Mantenimiento de Unidades', label: 'Unidades' },
                ]}
                placeholder="Todas las Categorías"
                icon={<Filter className="h-3.5 w-3.5 text-gray-400" />}
                className="w-full sm:w-auto sm:min-w-[190px]"
                triggerClassName="px-2.5 py-1.5 border-gray-200 rounded-lg bg-white hover:bg-gray-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 min-h-[34px] text-[13px]"
              />

              <Select 
                value={currentEstado}
                onChange={(e) => updateFilters('estado', e.target.value)}
                options={[
                  { value: 'Pendiente', label: 'Pendiente' },
                  { value: 'En Progreso', label: 'En Progreso' },
                  { value: 'Resuelto', label: 'Resuelto' },
                  { value: 'Cerrado', label: 'Cerrado' },
                ]}
                placeholder="Todos los Estados"
                icon={<Tag className="h-3.5 w-3.5 text-gray-400" />}
                className="w-full sm:w-auto sm:min-w-[170px]"
                triggerClassName="px-2.5 py-1.5 border-gray-200 rounded-lg bg-white hover:bg-gray-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 min-h-[34px] text-[13px]"
              />

              <Link 
                href="/mantenimiento/nuevo"
                className="inline-flex items-center justify-center px-4 py-1.5 border border-transparent text-[13px] font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap min-h-[34px]"
              >
                <Plus className="w-4 h-4 mr-1" />
                Nuevo Ticket
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Tickets */}
      <div className="flex flex-col gap-4">
        {filteredTickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
            {filteredTickets.map((ticket) => {
              const priorityInfo = getPriorityInfo(ticket.prioridad);
              
              return (
                <div 
                  key={ticket.id}
                  onClick={() => router.push(`/mantenimiento/${ticket.id}`)}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 cursor-pointer overflow-hidden relative flex flex-col h-full"
                >
                  {/* Indicador de prioridad lateral */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityInfo.color}`} />
                  
                  <div className="p-5 flex-grow flex flex-col pl-6">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="flex-1">
                        {priorityInfo.badge}
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(ticket.estado)}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {ticket.titulo}
                    </h3>
                    
                    <div className="mt-auto pt-4 space-y-2.5">
                      <div className="flex items-center text-sm text-gray-600">
                        <Tag className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                        <span className="truncate">{ticket.categoria}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                        <span className="truncate">{ticket.ubicacion}</span>
                      </div>
                      
                      {ticket.placa_vehiculo && (
                        <div className="flex items-center text-sm text-blue-700 bg-blue-50/50 py-1 px-2 rounded-md w-fit mt-1">
                          <Car className="w-4 h-4 mr-2 text-blue-500 shrink-0" />
                          <span className="font-medium tracking-wide">{ticket.placa_vehiculo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50/80 px-5 py-3 border-t border-gray-100 flex items-center justify-between mt-auto pl-6">
                    <div className="flex items-center text-xs text-gray-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 mr-1.5" />
                      {format(new Date(ticket.created_at), "d MMM, yyyy", { locale: es })}
                    </div>
                    <div className="flex items-center text-blue-600 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                      Ver detalle
                      <ChevronRight className="w-4 h-4 ml-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-5">
              <Search className="h-10 w-10 text-blue-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No encontramos tickets</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              No hay resultados para los filtros actuales. Intenta cambiar los términos de búsqueda o ajustar las categorías.
            </p>
            <button 
              onClick={() => {
                setSearchTerm('');
                updateFilters('categoria', '');
                updateFilters('estado', '');
              }}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Limpiar todos los filtros
            </button>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between text-xs font-medium text-gray-500 px-2 mt-2">
        <span>Mostrando <span className="text-gray-900">{filteredTickets.length}</span> tickets en total</span>
        <span>Módulo de Mantenimiento</span>
      </div>
    </div>
  );
}
