"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, FileBadge, Search, AlertCircle } from "lucide-react";
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

type CarnetRecord = {
  id: string;
  empleado_id: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  municipalidad: string;
  estado: string;
  empleados?: Empleado;
};

export default function CarnetsPage() {
  const [records, setRecords] = useState<CarnetRecord[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    empleado_id: "",
    fecha_emision: "",
    fecha_vencimiento: "",
    municipalidad: "",
    estado: "Vigente"
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
        .from('sst_carnet')
        .select('*, empleados(id, nombres, apellidos, dni, fecha_ingreso, puesto)')
        .order('fecha_vencimiento', { ascending: true });
      
      if (error) {
        if (error.code === '42P01') {
          console.warn("Tabla sst_carnet no existe aún.");
        } else {
          throw error;
        }
      } else {
        setRecords(data || []);
      }
    } catch (error) {
      console.error("Error fetching Carnet records:", error);
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
        .from('sst_carnet')
        .insert([formData])
        .select('*, empleados(id, nombres, apellidos, dni, fecha_ingreso, puesto)');

      if (error) throw error;

      setRecords([...records, data[0]].sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()));
      setIsAdding(false);
      setFormData({
        empleado_id: "",
        fecha_emision: "",
        fecha_vencimiento: "",
        municipalidad: "",
        estado: "Vigente"
      });
    } catch (error) {
      console.error("Error saving Carnet:", error);
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Carnets de Sanidad</h1>
          <p className="text-slate-500 mt-2">Control de vigencia de carnets de sanidad</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap text-sm"
        >
          <Plus className="w-4 h-4" />
          Registrar Carnet
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
                <FileBadge className="w-5 h-5 text-emerald-500" />
                Registrar Nuevo Carnet
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
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-700 mb-2">2. Datos del Carnet</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Emisión</label>
                        <input
                          type="date"
                          required
                          value={formData.fecha_emision}
                          onChange={e => setFormData({ ...formData, fecha_emision: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Vencimiento</label>
                        <input
                          type="date"
                          required
                          value={formData.fecha_vencimiento}
                          onChange={e => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Municipalidad / Entidad</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Muni. Lima"
                          value={formData.municipalidad}
                          onChange={e => setFormData({ ...formData, municipalidad: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Estado Físico</label>
                        <select
                          value={formData.estado}
                          onChange={e => setFormData({ ...formData, estado: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        >
                          <option value="Vigente">Vigente (Físico en empresa)</option>
                          <option value="En Trámite">En Trámite</option>
                          <option value="Por Renovar">Por Renovar</option>
                        </select>
                      </div>
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
                <th className="px-6 py-4">Municipalidad</th>
                <th className="px-6 py-4">Fecha Emisión</th>
                <th className="px-6 py-4">Vencimiento</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => {
                  const isExpired = new Date(record.fecha_vencimiento) < new Date();
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{record.empleados?.nombres} {record.empleados?.apellidos}</div>
                        <div className="text-slate-500 text-xs">DNI: {record.empleados?.dni} • {record.empleados?.puesto}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700">{record.municipalidad}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{record.fecha_emision}</td>
                      <td className="px-6 py-4 text-slate-700">
                        {record.fecha_vencimiento}
                        {isExpired && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                            <AlertCircle className="w-3 h-3" /> Vencido
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "px-2.5 py-1 rounded-full text-xs font-semibold",
                          isExpired ? "bg-red-100 text-red-700" :
                          record.estado === "Vigente" ? "bg-emerald-100 text-emerald-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {isExpired ? "Vencido" : record.estado}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    {loading ? "Cargando registros..." : "No se encontraron carnets de sanidad."}
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
