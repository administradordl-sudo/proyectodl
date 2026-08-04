"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Check, X, Clock, User, CalendarDays, Palmtree, Users, History, FileText, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

type Vacacion = {
  id: string;
  nombre_trabajador: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales: number;
  motivo: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
};

type Empleado = {
  id: string;
  nombres: string;
  apellidos: string;
  fecha_ingreso: string;
  status: string;
};

export default function VacationsManagerPage() {
  const [activeTab, setActiveTab] = useState<'pendientes' | 'saldos' | 'historial'>('pendientes');
  
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    const channel = supabase
      .channel('realtime-vacations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vacaciones' }, (payload) => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [vacacionesRes, empleadosRes] = await Promise.all([
        supabase.from('vacaciones').select('*').order('created_at', { ascending: false }),
        supabase.from('empleados').select('*').eq('status', 'Activo')
      ]);
      
      setVacaciones(vacacionesRes.data || []);
      setEmpleados(empleadosRes.data || []);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'APROBADO' | 'RECHAZADO') => {
    try {
      const { error } = await supabase
        .from('vacaciones')
        .update({ estado: action })
        .eq('id', id);

      if (error) throw error;
      
      setVacaciones(prev => prev.map(v => v.id === id ? { ...v, estado: action } : v));
    } catch (error) {
      console.error("Error updating vacacion", error);
    }
  };

  const pendientes = vacaciones.filter(v => v.estado === 'PENDIENTE');
  const historial = vacaciones.filter(v => v.estado !== 'PENDIENTE');

  // Cálculos de saldo
  const calculateVacationsInfo = (fechaIngreso: string) => {
    if (!fechaIngreso) return { ganados: 0, años: 0 };
    const start = new Date(fechaIngreso);
    const now = new Date();
    let diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) diffDays = 0;
    
    const añosCompletos = diffDays / 365;
    const ganados = Math.floor(añosCompletos * 30);
    return { ganados, años: Math.floor(añosCompletos) };
  };

  const getSaldos = () => {
    return empleados.map(emp => {
      const fullName = `${emp.nombres} ${emp.apellidos}`.toUpperCase();
      const reversedName = `${emp.apellidos} ${emp.nombres}`.toUpperCase();
      
      // Buscar vacaciones de este empleado (Aprobadas)
      const misVacaciones = vacaciones.filter(v => 
        v.estado === 'APROBADO' && 
        (v.nombre_trabajador.toUpperCase() === fullName || v.nombre_trabajador.toUpperCase() === reversedName)
      );

      const tomados = misVacaciones.reduce((acc, v) => acc + v.dias_totales, 0);
      const { ganados, años } = calculateVacationsInfo(emp.fecha_ingreso);
      const saldo = ganados - tomados;

      return {
        ...emp,
        fullName: `${emp.nombres} ${emp.apellidos}`,
        ganados,
        tomados,
        saldo,
        años
      };
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestor de Vacaciones</h1>
        <p className="text-gray-500 mt-2">Aprueba solicitudes, controla el historial y verifica los saldos de días de cada trabajador.</p>
      </div>

      <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('pendientes')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeTab === 'pendientes' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          <Clock className="w-4 h-4" />
          Aprobaciones
          {pendientes.length > 0 && (
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold ml-1">
              {pendientes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('saldos')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeTab === 'saldos' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          <Users className="w-4 h-4" />
          Control de Saldos
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeTab === 'historial' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          <History className="w-4 h-4" />
          Historial
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Cargando información...</div>
      ) : activeTab === 'pendientes' ? (
        pendientes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-900">No hay solicitudes pendientes</h3>
            <p className="text-gray-500 mt-2">Todas las solicitudes de vacaciones han sido revisadas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {pendientes.map((vac) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                  key={vac.id}
                  className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                      <Palmtree className="w-3.5 h-3.5" />
                      {vac.dias_totales} Días Solicitados
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {vac.nombre_trabajador}
                    </h3>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-1 space-y-3">
                    <div className="flex justify-between text-sm">
                      <div className="text-gray-500 font-medium">Desde:</div>
                      <div className="font-semibold text-gray-900">{vac.fecha_inicio}</div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div className="text-gray-500 font-medium">Hasta:</div>
                      <div className="font-semibold text-gray-900">{vac.fecha_fin}</div>
                    </div>
                    {vac.motivo && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 italic">"{vac.motivo}"</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleAction(vac.id, 'RECHAZADO')}
                      className="flex-1 flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 py-2.5 rounded-xl font-medium transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleAction(vac.id, 'APROBADO')}
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
        )
      ) : activeTab === 'saldos' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold text-gray-600">Trabajador Activo</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Fecha Ingreso</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-center">Días Ganados</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-center">Días Tomados</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-center">Saldo Restante</th>
              </tr>
            </thead>
            <tbody>
              {getSaldos().map((emp) => (
                <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{emp.fullName}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {emp.fecha_ingreso ? emp.fecha_ingreso : <span className="text-gray-300">No registrada</span>}
                    {emp.años > 0 && <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{emp.años} años ref.</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-gray-700">{emp.ganados}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-orange-600">{emp.tomados}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={clsx(
                      "px-3 py-1 rounded-full font-bold",
                      emp.saldo < 0 ? "bg-red-50 text-red-600" :
                      emp.saldo > 15 ? "bg-green-50 text-green-600" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {emp.saldo} días
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold text-gray-600">Trabajador</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Desde</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Hasta</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-center">Días</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Resolución</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    No hay historial de vacaciones procesadas.
                  </td>
                </tr>
              ) : (
                historial.map((vac) => (
                  <tr key={vac.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{vac.nombre_trabajador}</td>
                    <td className="px-6 py-4 text-gray-600">{vac.fecha_inicio}</td>
                    <td className="px-6 py-4 text-gray-600">{vac.fecha_fin}</td>
                    <td className="px-6 py-4 text-center font-bold text-gray-700">{vac.dias_totales}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold",
                        vac.estado === 'APROBADO' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                      )}>
                        {vac.estado === 'APROBADO' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {vac.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
