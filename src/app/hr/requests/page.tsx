"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Clock, CheckCircle2, XCircle, FileText, Palmtree, BriefcaseMedical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

type Permiso = {
  id: string;
  nombre_trabajador: string;
  fecha_permiso: string;
  motivo: string;
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

const MOCK_USER = "CRISTOBAL DE LA CRUZ STEFANI CAMILA";

export default function EmployeeRequestsPage() {
  const [activeTab, setActiveTab] = useState<'permisos' | 'vacaciones'>('permisos');
  
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newPermiso, setNewPermiso] = useState({ nombre_trabajador: "", fecha: "", motivo: "" });
  const [newVacacion, setNewVacacion] = useState({ nombre_trabajador: "", fecha_inicio: "", fecha_fin: "", motivo: "" });

  useEffect(() => {
    fetchPermisos();
    fetchVacaciones();
    
    const channel = supabase
      .channel('realtime-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'permisos' }, (payload) => {
        setPermisos(prev => {
          if (prev.find(p => p.id === payload.new.id)) return prev;
          return [payload.new as Permiso, ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'permisos' }, (payload) => {
        setPermisos(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...(payload.new as Permiso) } : p));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vacaciones' }, (payload) => {
        setVacaciones(prev => {
          if (prev.find(v => v.id === payload.new.id)) return prev;
          return [payload.new as Vacacion, ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vacaciones' }, (payload) => {
        setVacaciones(prev => prev.map(v => v.id === payload.new.id ? { ...v, ...(payload.new as Vacacion) } : v));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPermisos = async () => {
    try {
      const { data, error } = await supabase
        .from('permisos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPermisos(data || []);
    } catch (error) {
      console.error("Error fetching permisos", error);
    } finally {
      if (activeTab === 'permisos') setLoading(false);
    }
  };

  const fetchVacaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('vacaciones')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVacaciones(data || []);
    } catch (error) {
      console.error("Error fetching vacaciones", error);
      // Fail silently if table doesn't exist yet
    } finally {
      if (activeTab === 'vacaciones') setLoading(false);
    }
  };

  const handleAddPermiso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('permisos')
        .insert([{ 
          nombre_trabajador: newPermiso.nombre_trabajador || MOCK_USER,
          fecha_permiso: newPermiso.fecha, 
          motivo: newPermiso.motivo,
          estado: 'PENDIENTE',
          solicitado_por: 'mock-user-id'
        }])
        .select();

      if (error) throw error;
      
      setPermisos([data[0], ...permisos]);
      setNewPermiso({ nombre_trabajador: "", fecha: "", motivo: "" });
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding permiso", error);
    }
  };

  const handleAddVacacion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate difference in days (inclusive)
    const start = new Date(newVacacion.fecha_inicio);
    const end = new Date(newVacacion.fecha_fin);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days

    if (diffDays <= 0) {
      alert("La fecha de fin debe ser igual o posterior a la fecha de inicio.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('vacaciones')
        .insert([{ 
          nombre_trabajador: newVacacion.nombre_trabajador || MOCK_USER,
          fecha_inicio: newVacacion.fecha_inicio, 
          fecha_fin: newVacacion.fecha_fin, 
          dias_totales: diffDays,
          motivo: newVacacion.motivo || 'Vacaciones Regulares',
          estado: 'PENDIENTE'
        }])
        .select();

      if (error) {
        if (error.code === '42P01') {
          alert("La tabla 'vacaciones' aún no existe en Supabase. Por favor, corre el script SQL proporcionado.");
        }
        throw error;
      }
      
      setVacaciones([data[0], ...vacaciones]);
      setNewVacacion({ nombre_trabajador: "", fecha_inicio: "", fecha_fin: "", motivo: "" });
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding vacacion", error);
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'APROBADO': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'RECHAZADO': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'APROBADO': return "bg-green-50 text-green-700 border-green-200";
      case 'RECHAZADO': return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Solicitudes</h1>
          <p className="text-gray-500 mt-2">Gestiona tus permisos de inasistencia o programa tus vacaciones.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap text-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Solicitud
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => {
            setActiveTab('permisos');
            setIsAdding(false);
          }}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeTab === 'permisos' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          <BriefcaseMedical className="w-4 h-4" />
          Permisos (Días / Horas)
        </button>
        <button
          onClick={() => {
            setActiveTab('vacaciones');
            setIsAdding(false);
          }}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeTab === 'vacaciones' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          <Palmtree className="w-4 h-4" />
          Vacaciones (Bloques)
        </button>
      </div>

      {isAdding && activeTab === 'permisos' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Solicitar Permiso</h3>
          <form onSubmit={handleAddPermiso} className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-gray-700">Trabajador (Test)</label>
              <input
                type="text"
                required
                placeholder="Nombre completo..."
                value={newPermiso.nombre_trabajador}
                onChange={e => setNewPermiso({ ...newPermiso, nombre_trabajador: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-gray-700">Fecha del Permiso</label>
              <input
                type="date"
                required
                value={newPermiso.fecha}
                onChange={e => setNewPermiso({ ...newPermiso, fecha: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="flex-[2] space-y-2">
              <label className="text-sm font-medium text-gray-700">Motivo</label>
              <input
                type="text"
                required
                placeholder="Ej. Cita médica, Trámite personal..."
                value={newPermiso.motivo}
                onChange={e => setNewPermiso({ ...newPermiso, motivo: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button type="submit" className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors">
              Enviar Solicitud
            </button>
          </form>
        </motion.div>
      )}

      {isAdding && activeTab === 'vacaciones' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <Palmtree className="w-5 h-5 text-green-500" /> Programar Vacaciones
          </h3>
          <form onSubmit={handleAddVacacion} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-gray-700">Trabajador (Test)</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre completo..."
                  value={newVacacion.nombre_trabajador}
                  onChange={e => setNewVacacion({ ...newVacacion, nombre_trabajador: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-gray-700">Inicio de Vacaciones</label>
                <input
                  type="date"
                  required
                  value={newVacacion.fecha_inicio}
                  onChange={e => setNewVacacion({ ...newVacacion, fecha_inicio: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-gray-700">Fin de Vacaciones (Incluido)</label>
                <input
                  type="date"
                  required
                  value={newVacacion.fecha_fin}
                  onChange={e => setNewVacacion({ ...newVacacion, fecha_fin: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-[3] space-y-2 w-full">
                <label className="text-sm font-medium text-gray-700">Motivo u Observación (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Vacaciones anuales correspondientes al periodo 2025"
                  value={newVacacion.motivo}
                  onChange={e => setNewVacacion({ ...newVacacion, motivo: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <button type="submit" className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors whitespace-nowrap">
                Solicitar Vacaciones
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto w-full">
        {activeTab === 'permisos' ? (
          <table className="w-full min-w-[600px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 font-medium text-gray-500 whitespace-nowrap w-32">Fecha</th>
                <th className="px-4 py-3 font-medium text-gray-500">Trabajador</th>
                <th className="px-4 py-3 font-medium text-gray-500">Motivo</th>
                <th className="px-4 py-3 font-medium text-gray-500 w-40 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Cargando permisos...</td>
                </tr>
              ) : permisos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center flex flex-col items-center justify-center text-gray-400 gap-2">
                    <FileText className="w-12 h-12 text-gray-200" />
                    <p>No hay permisos solicitados</p>
                  </td>
                </tr>
              ) : (
                permisos.map((permiso) => (
                  <tr key={permiso.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{permiso.fecha_permiso}</td>
                    <td className="px-4 py-3 text-gray-800">{permiso.nombre_trabajador}</td>
                    <td className="px-4 py-3 text-gray-600">{permiso.motivo}</td>
                    <td className="px-4 py-3 text-right">
                      <div className={clsx(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium",
                        getStatusBadge(permiso.estado)
                      )}>
                        {getStatusIcon(permiso.estado)}
                        {permiso.estado}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[600px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 font-medium text-gray-500">Trabajador</th>
                <th className="px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Desde</th>
                <th className="px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Hasta</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-center">Días Totales</th>
                <th className="px-4 py-3 font-medium text-gray-500 w-40 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Cargando vacaciones...</td>
                </tr>
              ) : vacaciones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center flex flex-col items-center justify-center text-gray-400 gap-2">
                    <Palmtree className="w-12 h-12 text-gray-200" />
                    <p>No hay vacaciones programadas</p>
                  </td>
                </tr>
              ) : (
                vacaciones.map((v) => (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-800">{v.nombre_trabajador}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{v.fecha_inicio}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{v.fecha_fin}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">{v.dias_totales}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={clsx(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium",
                        getStatusBadge(v.estado)
                      )}>
                        {getStatusIcon(v.estado)}
                        {v.estado}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
