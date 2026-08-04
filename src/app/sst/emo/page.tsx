"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, HeartPulse, Search, Calendar, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

type Empleado = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  fecha_ingreso: string;
  puesto: string;
};

type EmoRecord = {
  id: string;
  empleado_id: string;
  fecha_examen: string;
  tipo_examen: string;
  clinica: string;
  perfil: string;
  resultado: string;
  fecha_vencimiento: string;
  observaciones: string;
  empleados?: Empleado;
};

export default function EMOPage() {
  const [records, setRecords] = useState<EmoRecord[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    empleado_id: "",
    fecha_examen: "",
    tipo_examen: "Pre-ocupacional",
    clinica: "",
    perfil: "",
    resultado: "Apto",
    fecha_vencimiento: "",
    observaciones: ""
  });

  const selectedEmpleado = empleados.find(e => e.id === formData.empleado_id);

  useEffect(() => {
    fetchEmpleados();
    fetchRecords();
  }, []);

  const fetchEmpleados = async () => {
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombres, apellidos, dni, fecha_ingreso, puesto')
        .eq('status', 'Activo')
        .order('nombres');
      
      if (error) throw error;
      setEmpleados(data || []);
    } catch (error) {
      console.error("Error fetching empleados:", error);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sst_emo')
        .select('*, empleados(id, nombres, apellidos, dni, fecha_ingreso, puesto)')
        .order('fecha_examen', { ascending: false });
      
      if (error) {
        if (error.code === '42P01') {
          console.warn("Tabla sst_emo no existe aún.");
        } else {
          throw error;
        }
      } else {
        setRecords(data || []);
      }
    } catch (error) {
      console.error("Error fetching EMO records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.empleado_id) {
      alert("Seleccione un empleado.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sst_emo')
        .insert([formData])
        .select('*, empleados(id, nombres, apellidos, dni, fecha_ingreso, puesto)');

      if (error) throw error;

      setRecords([data[0], ...records]);
      setIsAdding(false);
      setFormData({
        empleado_id: "",
        fecha_examen: "",
        tipo_examen: "Pre-ocupacional",
        clinica: "",
        perfil: "",
        resultado: "Apto",
        fecha_vencimiento: "",
        observaciones: ""
      });
    } catch (error) {
      console.error("Error saving EMO:", error);
      alert("Error al guardar el registro. Verifique que ejecutó el código SQL.");
    }
  };

  const filteredRecords = records.filter(record => 
    `${record.empleados?.nombres} ${record.empleados?.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.empleados?.dni?.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Registro de EMO</h1>
          <p className="text-slate-500 mt-2">Control de Exámenes Médico Ocupacionales</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Registro
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
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 mb-6">
              <h3 className="text-lg font-semibold mb-6 text-slate-800 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-emerald-500" />
                Registrar Nuevo Examen Médico
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="font-medium text-slate-700 mb-2">1. Datos del Empleado</h4>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Empleado</label>
                      <select
                        required
                        value={formData.empleado_id}
                        onChange={e => setFormData({ ...formData, empleado_id: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                      >
                        <option value="">Seleccione...</option>
                        {empleados.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.nombres} {emp.apellidos} - {emp.dni}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedEmpleado && (
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                        <div>
                          <p className="text-xs text-slate-500">DNI</p>
                          <p className="font-medium text-slate-800">{selectedEmpleado.dni}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Puesto</p>
                          <p className="font-medium text-slate-800">{selectedEmpleado.puesto || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500">Fecha de Ingreso</p>
                          <p className="font-medium text-slate-800">{selectedEmpleado.fecha_ingreso}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-700 mb-2">2. Datos del Examen</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha del Examen</label>
                        <input
                          type="date"
                          required
                          value={formData.fecha_examen}
                          onChange={e => setFormData({ ...formData, fecha_examen: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Vencimiento</label>
                        <input
                          type="date"
                          value={formData.fecha_vencimiento}
                          onChange={e => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Examen</label>
                        <select
                          value={formData.tipo_examen}
                          onChange={e => setFormData({ ...formData, tipo_examen: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        >
                          <option value="Pre-ocupacional">Pre-ocupacional</option>
                          <option value="Periódico">Periódico</option>
                          <option value="Retiro">Retiro</option>
                          <option value="Reincorporación">Reincorporación</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Resultado</label>
                        <select
                          value={formData.resultado}
                          onChange={e => setFormData({ ...formData, resultado: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        >
                          <option value="Apto">Apto</option>
                          <option value="Apto con restricciones">Apto con restricciones</option>
                          <option value="No Apto">No Apto</option>
                          <option value="Pendiente">Pendiente</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Clínica</label>
                        <input
                          type="text"
                          placeholder="Nombre de la clínica"
                          value={formData.clinica}
                          onChange={e => setFormData({ ...formData, clinica: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Perfil (Riesgo)</label>
                        <input
                          type="text"
                          placeholder="Ej. Operativo, Administrativo"
                          value={formData.perfil}
                          onChange={e => setFormData({ ...formData, perfil: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
                      <textarea
                        rows={2}
                        value={formData.observaciones}
                        onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  >
                    Guardar Registro
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Puesto / Perfil</th>
                <th className="px-6 py-4">Clínica</th>
                <th className="px-6 py-4">F. Examen</th>
                <th className="px-6 py-4">F. Vencimiento</th>
                <th className="px-6 py-4">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{record.empleados?.nombres} {record.empleados?.apellidos}</div>
                      <div className="text-slate-500 text-xs">DNI: {record.empleados?.dni}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700">{record.empleados?.puesto || '-'}</div>
                      <div className="text-slate-500 text-xs">{record.perfil || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{record.clinica || '-'}</td>
                    <td className="px-6 py-4 text-slate-700">{record.fecha_examen}</td>
                    <td className="px-6 py-4 text-slate-700">
                      {record.fecha_vencimiento}
                      {/* Lógica simple visual para vencimiento */}
                      {new Date(record.fecha_vencimiento) < new Date() && record.fecha_vencimiento ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          <AlertCircle className="w-3 h-3" /> Vencido
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-semibold",
                        record.resultado.includes("No Apto") ? "bg-red-100 text-red-700" :
                        record.resultado.includes("restricciones") ? "bg-amber-100 text-amber-700" :
                        record.resultado === "Apto" ? "bg-emerald-100 text-emerald-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {record.resultado}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    {loading ? "Cargando registros..." : "No se encontraron registros de EMO."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
