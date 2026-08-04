"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Clock, CheckCircle2, XCircle, Search, Calendar, UserCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import Select from "@/components/ui/Select";

type Empleado = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
};

type CambioHorario = {
  id: string;
  empleado_id: string;
  nombre_trabajador: string;
  fecha_inicio: string;
  fecha_fin: string;
  hora_ingreso: string;
  hora_salida: string;
  motivo: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  created_at: string;
};

export default function ScheduleChangesPage() {
  const [cambios, setCambios] = useState<CambioHorario[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    empleado_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    hora_ingreso: "",
    hora_salida: "",
    motivo: ""
  });

  useEffect(() => {
    fetchEmpleados();
    fetchCambios();
    
    const channel = supabase
      .channel('realtime-cambios-horario')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cambios_horario' }, (payload) => {
        setCambios(prev => {
          if (prev.find(c => c.id === payload.new.id)) return prev;
          return [payload.new as CambioHorario, ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cambios_horario' }, (payload) => {
        setCambios(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...(payload.new as CambioHorario) } : c));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEmpleados = async () => {
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombres, apellidos, dni')
        .order('nombres', { ascending: true });
      
      if (error) throw error;
      setEmpleados(data || []);
    } catch (error) {
      console.error("Error fetching empleados", error);
    }
  };

  const fetchCambios = async () => {
    try {
      const { data, error } = await supabase
        .from('cambios_horario')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        // Silently fail if table doesn't exist yet
        console.warn("Could not fetch cambios_horario - table might not exist");
      } else {
        setCambios(data || []);
      }
    } catch (error) {
      console.error("Error fetching cambios_horario", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.empleado_id || !formData.fecha_inicio || !formData.fecha_fin || !formData.hora_ingreso || !formData.hora_salida || !formData.motivo) return;

    const emp = empleados.find(e => e.id === formData.empleado_id);
    if (!emp) return;

    try {
      const { error } = await supabase
        .from('cambios_horario')
        .insert([{
          empleado_id: formData.empleado_id,
          nombre_trabajador: `${emp.nombres} ${emp.apellidos}`,
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: formData.fecha_fin,
          hora_ingreso: formData.hora_ingreso,
          hora_salida: formData.hora_salida,
          motivo: formData.motivo,
          estado: 'PENDIENTE'
        }]);

      if (error) throw error;
      
      setIsAdding(false);
      setFormData({
        empleado_id: "",
        fecha_inicio: "",
        fecha_fin: "",
        hora_ingreso: "",
        hora_salida: "",
        motivo: ""
      });
    } catch (error) {
      console.error("Error creating cambio de horario", error);
      alert("Hubo un error al crear la solicitud.");
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'APROBADO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Aprobado</span>;
      case 'RECHAZADO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700"><XCircle className="w-3.5 h-3.5" /> Rechazado</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><Clock className="w-3.5 h-3.5" /> Pendiente</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Cambios de Horario</h1>
          <p className="text-slate-500 mt-2">Gestiona excepciones de turno y horarios rotativos</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={clsx(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm",
            isAdding 
              ? "bg-slate-100 text-slate-700 hover:bg-slate-200" 
              : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5"
          )}
        >
          {isAdding ? "Cancelar" : <><Plus className="w-5 h-5" /> Nueva Solicitud</>}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 mb-8">
              <h3 className="text-lg font-semibold mb-6 text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                Registrar Nuevo Horario
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Select Employee */}
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Trabajador</label>
                    <Select
                      required
                      value={formData.empleado_id}
                      onChange={e => setFormData({ ...formData, empleado_id: e.target.value })}
                      options={empleados.map(emp => ({ value: emp.id, label: `${emp.nombres} ${emp.apellidos} - ${emp.dni}` }))}
                      placeholder="Buscar trabajador..."
                      triggerClassName="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    />
                  </div>

                  {/* Dates */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Desde</label>
                    <div className="relative">
                      <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="date" 
                        required
                        value={formData.fecha_inicio}
                        onChange={e => setFormData({...formData, fecha_inicio: e.target.value})}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hasta</label>
                    <div className="relative">
                      <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="date" 
                        required
                        value={formData.fecha_fin}
                        onChange={e => setFormData({...formData, fecha_fin: e.target.value})}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  
                  {/* Hours */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hora de Ingreso Exacta</label>
                    <input 
                      type="time" 
                      required
                      value={formData.hora_ingreso}
                      onChange={e => setFormData({...formData, hora_ingreso: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hora de Salida Exacta</label>
                    <input 
                      type="time" 
                      required
                      value={formData.hora_salida}
                      onChange={e => setFormData({...formData, hora_salida: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Justificación</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. Cambio de turno por necesidad de producción..."
                      value={formData.motivo}
                      onChange={e => setFormData({...formData, motivo: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                </div>
                
                <div className="flex justify-end pt-4">
                  <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                    Enviar Solicitud
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="px-6 py-4 font-medium text-sm">Trabajador</th>
                <th className="px-6 py-4 font-medium text-sm">Fechas</th>
                <th className="px-6 py-4 font-medium text-sm">Nuevo Horario</th>
                <th className="px-6 py-4 font-medium text-sm">Motivo</th>
                <th className="px-6 py-4 font-medium text-sm">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      Cargando registros...
                    </div>
                  </td>
                </tr>
              ) : cambios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Clock className="w-12 h-12 text-slate-200 mb-3" />
                      <p className="text-lg font-medium text-slate-600">No hay cambios de horario registrados</p>
                      <p className="text-sm">Registra una nueva excepción de turno usando el botón superior.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cambios.map((cambio) => (
                  <tr key={cambio.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                          {cambio.nombre_trabajador.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900">{cambio.nombre_trabajador}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {cambio.fecha_inicio === cambio.fecha_fin ? (
                        cambio.fecha_inicio
                      ) : (
                        `${cambio.fecha_inicio} al ${cambio.fecha_fin}`
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-indigo-600">
                      {cambio.hora_ingreso} - {cambio.hora_salida}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="truncate block max-w-xs" title={cambio.motivo}>{cambio.motivo}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(cambio.estado)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
