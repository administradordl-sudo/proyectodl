"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Check, X, Clock, User, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Permiso = {
  id: string;
  nombre_trabajador: string;
  fecha_permiso: string;
  motivo: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
};

export default function ApprovalsPage() {
  const [pendientes, setPendientes] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendientes();
    
    const channel = supabase
      .channel('realtime-approvals')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'permisos' }, (payload) => {
        const nuevo = payload.new as Permiso;
        if (nuevo.estado === 'PENDIENTE') {
          setPendientes(prev => {
            if (prev.find(p => p.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'permisos' }, (payload) => {
        const updated = payload.new as Permiso;
        if (updated.estado !== 'PENDIENTE') {
          setPendientes(prev => prev.filter(p => p.id !== updated.id));
        } else {
          setPendientes(prev => prev.map(p => p.id === updated.id ? updated : p));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendientes = async () => {
    try {
      const { data, error } = await supabase
        .from('permisos')
        .select('*')
        .eq('estado', 'PENDIENTE')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setPendientes(data || []);
    } catch (error) {
      console.error("Error fetching pendientes", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'APROBADO' | 'RECHAZADO') => {
    try {
      const { error } = await supabase
        .from('permisos')
        .update({ estado: action, aprobado_por: 'hr-mock-id' })
        .eq('id', id);

      if (error) throw error;
      
      // Remove from list with animation
      setPendientes(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error updating permiso", error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bandeja de Aprobaciones</h1>
        <p className="text-gray-500 mt-2">Gestiona las solicitudes de permisos pendientes de revisión.</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Cargando solicitudes...</div>
      ) : pendientes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-900">¡Todo al día!</h3>
          <p className="text-gray-500 mt-2">No hay solicitudes pendientes por revisar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {pendientes.map((permiso) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                key={permiso.id}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-medium border border-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    Pendiente
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    {permiso.nombre_trabajador}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                    <CalendarDays className="w-4 h-4" />
                    {permiso.fecha_permiso}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-1">
                  <p className="text-gray-700 text-sm">{permiso.motivo}</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleAction(permiso.id, 'RECHAZADO')}
                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 py-2.5 rounded-xl font-medium transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleAction(permiso.id, 'APROBADO')}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-medium transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Aprobar
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
