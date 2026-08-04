"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Check, X, Clock, User, CalendarDays, FileText, Palmtree } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

type Permiso = {
  id: string;
  nombre_trabajador: string;
  fecha_permiso: string;
  motivo: string;
  tipo_permiso: 'DIA' | 'HORAS';
  horas_permiso: string | null;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
};

type Vacacion = {
  id: string;
  nombre_trabajador: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales: number;
  motivo: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
};

type CambioHorario = {
  id: string;
  nombre_trabajador: string;
  fecha_inicio: string;
  fecha_fin: string;
  hora_ingreso: string;
  hora_salida: string;
  motivo: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
};

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<'permisos' | 'vacaciones' | 'horarios'>('permisos');
  
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
  const [cambios, setCambios] = useState<CambioHorario[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Simplificado para evitar fugas de memoria con demasiados channels.
    // Lo ideal en producción es suscribirse a cada tabla por separado o usar recarga manual si hay muchos cambios.
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, vRes, cRes] = await Promise.all([
        supabase.from('permisos').select('*').eq('estado', 'PENDIENTE').order('created_at', { ascending: true }),
        supabase.from('vacaciones').select('*').eq('estado', 'PENDIENTE').order('created_at', { ascending: true }),
        supabase.from('cambios_horario').select('*').eq('estado', 'PENDIENTE').order('created_at', { ascending: true }),
      ]);
      
      if (pRes.data) setPermisos(pRes.data);
      if (vRes.data) setVacaciones(vRes.data);
      if (cRes.data) setCambios(cRes.data);
    } catch (error) {
      console.error("Error fetching pendientes", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'APROBADO' | 'RECHAZADO', tabla: 'permisos' | 'vacaciones' | 'cambios_horario') => {
    try {
      const { error } = await supabase
        .from(tabla)
        .update({ estado: action }) // quitamos aprobado_por por ahora si no existe la columna en todas
        .eq('id', id);

      if (error) throw error;
      
      if (tabla === 'permisos') setPermisos(prev => prev.filter(p => p.id !== id));
      if (tabla === 'vacaciones') setVacaciones(prev => prev.filter(p => p.id !== id));
      if (tabla === 'cambios_horario') setCambios(prev => prev.filter(p => p.id !== id));
      
    } catch (error) {
      console.error(`Error updating ${tabla}`, error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bandeja de Aprobaciones</h1>
        <p className="text-gray-500 mt-2">Gestiona las solicitudes pendientes de revisión.</p>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 w-full md:w-max">
        <button
          onClick={() => setActiveTab('permisos')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all",
            activeTab === 'permisos' ? "bg-amber-100 text-amber-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          <FileText className="w-4 h-4" />
          Permisos
          {permisos.length > 0 && (
            <span className={clsx("ml-1.5 px-2 py-0.5 rounded-full text-xs", activeTab === 'permisos' ? "bg-amber-200 text-amber-800" : "bg-gray-200 text-gray-700")}>
              {permisos.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('vacaciones')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all",
            activeTab === 'vacaciones' ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          <Palmtree className="w-4 h-4" />
          Vacaciones
          {vacaciones.length > 0 && (
            <span className={clsx("ml-1.5 px-2 py-0.5 rounded-full text-xs", activeTab === 'vacaciones' ? "bg-indigo-200 text-indigo-800" : "bg-gray-200 text-gray-700")}>
              {vacaciones.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('horarios')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all",
            activeTab === 'horarios' ? "bg-emerald-100 text-emerald-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          <Clock className="w-4 h-4" />
          Cambios Horario
          {cambios.length > 0 && (
            <span className={clsx("ml-1.5 px-2 py-0.5 rounded-full text-xs", activeTab === 'horarios' ? "bg-emerald-200 text-emerald-800" : "bg-gray-200 text-gray-700")}>
              {cambios.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Cargando solicitudes...</div>
      ) : (
        <>
          {activeTab === 'permisos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {permisos.length === 0 ? (
                  <EmptyState />
                ) : (
                  permisos.map((p) => (
                    <CardApproval 
                      key={p.id} 
                      title={p.nombre_trabajador}
                      date={p.fecha_permiso}
                      tag={p.tipo_permiso === 'HORAS' ? `Por Horas: ${p.horas_permiso}` : 'Día Completo'}
                      motivo={p.motivo}
                      onApprove={() => handleAction(p.id, 'APROBADO', 'permisos')}
                      onReject={() => handleAction(p.id, 'RECHAZADO', 'permisos')}
                      color="amber"
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'vacaciones' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {vacaciones.length === 0 ? (
                  <EmptyState />
                ) : (
                  vacaciones.map((v) => (
                    <CardApproval 
                      key={v.id} 
                      title={v.nombre_trabajador}
                      date={`${v.fecha_inicio} al ${v.fecha_fin}`}
                      tag={`${v.dias_totales} días`}
                      motivo={v.motivo}
                      onApprove={() => handleAction(v.id, 'APROBADO', 'vacaciones')}
                      onReject={() => handleAction(v.id, 'RECHAZADO', 'vacaciones')}
                      color="indigo"
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'horarios' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {cambios.length === 0 ? (
                  <EmptyState />
                ) : (
                  cambios.map((c) => (
                    <CardApproval 
                      key={c.id} 
                      title={c.nombre_trabajador}
                      date={c.fecha_inicio === c.fecha_fin ? c.fecha_inicio : `${c.fecha_inicio} al ${c.fecha_fin}`}
                      tag={`${c.hora_ingreso} - ${c.hora_salida}`}
                      motivo={c.motivo}
                      onApprove={() => handleAction(c.id, 'APROBADO', 'cambios_horario')}
                      onReject={() => handleAction(c.id, 'RECHAZADO', 'cambios_horario')}
                      color="emerald"
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="col-span-full bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center justify-center"
    >
      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
        <Check className="w-8 h-8 text-green-500" />
      </div>
      <h3 className="text-xl font-medium text-gray-900">¡Todo al día!</h3>
      <p className="text-gray-500 mt-2">No hay solicitudes pendientes en esta sección.</p>
    </motion.div>
  );
}

function CardApproval({ title, date, tag, motivo, onApprove, onReject, color }: any) {
  const colorMap: Record<string, string> = {
    amber: "bg-amber-400 text-amber-600 bg-amber-50 border-amber-200",
    indigo: "bg-indigo-400 text-indigo-600 bg-indigo-50 border-indigo-200",
    emerald: "bg-emerald-400 text-emerald-600 bg-emerald-50 border-emerald-200"
  };
  const c = colorMap[color] || colorMap.amber;
  const [bgLine, text, bgIcon, border] = c.split(" ");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
      className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden group"
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${bgLine}`} />
      
      <div className="flex justify-between items-start">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${text} ${bgIcon} ${border}`}>
          <Clock className="w-3.5 h-3.5" />
          Pendiente
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="truncate" title={title}>{title}</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-gray-500 text-sm mt-2">
          <div className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />
            {date}
          </div>
          <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-0.5 rounded-full font-medium border border-gray-200">
            {tag}
          </span>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-1">
        <p className="text-gray-700 text-sm">{motivo}</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 py-2.5 rounded-xl font-medium transition-colors"
        >
          <X className="w-4 h-4" />
          Rechazar
        </button>
        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-medium transition-colors"
        >
          <Check className="w-4 h-4" />
          Aprobar
        </button>
      </div>
    </motion.div>
  );
}
