'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { Activity, Clock, FileText, CheckCircle } from 'lucide-react';

type Ticket = {
  id: string;
  categoria: string;
  prioridad: string;
  estado: string;
  created_at: string;
  updated_at: string;
};

interface KPIDashboardProps {
  initialTickets: Ticket[];
}

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];

export default function KPIDashboard({ initialTickets }: KPIDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);

  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-kpis')
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

  // Calcular la demora en días para un ticket individual
  const getDelayInDays = (ticket: Ticket) => {
    const start = new Date(ticket.created_at).getTime();
    let end;
    
    if (ticket.estado === 'Resuelto' || ticket.estado === 'Cerrado') {
      end = new Date(ticket.updated_at).getTime();
    } else {
      end = new Date().getTime();
    }
    
    const diff = end - start;
    const days = diff / (1000 * 60 * 60 * 24);
    return Math.max(0, days);
  };

  const processedData = useMemo(() => {
    const metrics = tickets.map(t => ({
      ...t,
      delayDays: getDelayInDays(t)
    }));

    // Agrupar y promediar
    const avgByCategory: Record<string, { totalDays: number; count: number }> = {};
    const avgByStatus: Record<string, { totalDays: number; count: number }> = {};
    const avgByPriority: Record<string, { totalDays: number; count: number }> = {};

    let totalDelay = 0;
    let resolvedCount = 0;

    metrics.forEach(t => {
      totalDelay += t.delayDays;
      if (t.estado === 'Resuelto' || t.estado === 'Cerrado') resolvedCount++;

      // By Category
      if (!avgByCategory[t.categoria]) avgByCategory[t.categoria] = { totalDays: 0, count: 0 };
      avgByCategory[t.categoria].totalDays += t.delayDays;
      avgByCategory[t.categoria].count += 1;

      // By Status
      if (!avgByStatus[t.estado]) avgByStatus[t.estado] = { totalDays: 0, count: 0 };
      avgByStatus[t.estado].totalDays += t.delayDays;
      avgByStatus[t.estado].count += 1;

      // By Priority
      if (!avgByPriority[t.prioridad]) avgByPriority[t.prioridad] = { totalDays: 0, count: 0 };
      avgByPriority[t.prioridad].totalDays += t.delayDays;
      avgByPriority[t.prioridad].count += 1;
    });

    const formatData = (record: Record<string, { totalDays: number; count: number }>) => {
      return Object.entries(record).map(([name, data]) => ({
        name,
        DemoraPromedio: parseFloat((data.totalDays / data.count).toFixed(1)),
        Tickets: data.count
      })).sort((a, b) => b.DemoraPromedio - a.DemoraPromedio);
    };

    return {
      globalAvg: metrics.length > 0 ? (totalDelay / metrics.length).toFixed(1) : '0.0',
      totalTickets: metrics.length,
      resolvedTickets: resolvedCount,
      openTickets: metrics.length - resolvedCount,
      byCategory: formatData(avgByCategory),
      byStatus: formatData(avgByStatus),
      byPriority: formatData(avgByPriority),
    };
  }, [tickets]);

  return (
    <div className="space-y-3">
      {/* Indicadores Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 text-xs font-medium">Total de Tickets</span>
            <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><FileText className="w-3 h-3"/></div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900">{processedData.totalTickets}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 text-xs font-medium">Tickets Abiertos</span>
            <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center text-amber-500"><Activity className="w-3 h-3"/></div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900">{processedData.openTickets}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 text-xs font-medium">Resueltos / Cerrados</span>
            <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-green-500"><CheckCircle className="w-3 h-3"/></div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900">{processedData.resolvedTickets}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 text-xs font-medium">Demora Promedio (Días)</span>
            <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-red-500"><Clock className="w-3 h-3"/></div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900">{processedData.globalAvg}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Gráfico de Barras: Demora por Categoría */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Demora Promedio por Categoría</h3>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData.byCategory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{fontSize: 10}} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                <Legend wrapperStyle={{fontSize: '12px', paddingTop: '5px'}}/>
                <Bar dataKey="DemoraPromedio" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Días de demora" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Barras: Demora por Prioridad */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Demora Promedio por Prioridad</h3>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData.byPriority} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" tick={{fontSize: 10}} />
                <YAxis tick={{fontSize: 10}} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                <Legend wrapperStyle={{fontSize: '12px', paddingTop: '5px'}}/>
                <Bar dataKey="DemoraPromedio" fill="#ef4444" radius={[4, 4, 0, 0]} name="Días de demora" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Gráfico de Dona: Distribución de Tickets por Estado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Distribución por Estado</h3>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={processedData.byStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="Tickets"
                >
                  {processedData.byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}}/>
                <Legend wrapperStyle={{fontSize: '12px'}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla: Desglose por Estado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:col-span-2 overflow-hidden flex flex-col">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Análisis Detallado por Estatus</h3>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-xs text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 rounded-t-lg border-b border-gray-200 sticky top-0">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">Estado</th>
                  <th scope="col" className="px-4 py-2 font-semibold text-center">Volumen de Tickets</th>
                  <th scope="col" className="px-4 py-2 font-semibold text-center">Demora Promedio (Días)</th>
                </tr>
              </thead>
              <tbody>
                {processedData.byStatus.map((status) => (
                  <tr key={status.name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{status.name}</td>
                    <td className="px-4 py-2.5 text-center">{status.Tickets}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-semibold border ${
                        status.DemoraPromedio > 3 ? 'bg-red-50 text-red-700 border-red-200' : 
                        status.DemoraPromedio > 1 ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {status.DemoraPromedio}
                      </span>
                    </td>
                  </tr>
                ))}
                {processedData.byStatus.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400">Sin datos registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
