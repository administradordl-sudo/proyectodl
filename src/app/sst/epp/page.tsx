"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, ShieldCheck, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import Select from "@/components/ui/Select";

type Empleado = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  fecha_ingreso: string;
  puesto: string;
};

type EppRecord = {
  id: string;
  empleado_id: string;
  fecha_entrega: string;
  equipo: string;
  talla_calzado: string;
  talla_chaleco: string;
  talla_casco: string;
  motivo_entrega: string;
  estado_firma: string;
  fecha_proxima_renovacion: string;
  empleados?: Empleado;
};

export default function EPPPage() {
  const [records, setRecords] = useState<EppRecord[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    empleado_id: "",
    fecha_entrega: "",
    equipo: "",
    talla_calzado: "",
    talla_chaleco: "",
    talla_casco: "",
    motivo_entrega: "Nuevo Ingreso",
    estado_firma: "Entregado",
    fecha_proxima_renovacion: ""
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
        .from('sst_epp')
        .select('*, empleados(id, nombres, apellidos, dni, fecha_ingreso, puesto)')
        .order('fecha_entrega', { ascending: false });
      
      if (error) {
        if (error.code === '42P01') {
          console.warn("Tabla sst_epp no existe aún.");
        } else {
          throw error;
        }
      } else {
        setRecords(data || []);
      }
    } catch (error) {
      console.error("Error fetching EPP records:", error);
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
      const payload = {
        ...formData,
        talla_calzado: formData.talla_calzado || null,
        talla_chaleco: formData.talla_chaleco || null,
        talla_casco: formData.talla_casco || null,
        motivo_entrega: formData.motivo_entrega || null,
        estado_firma: formData.estado_firma || null,
        fecha_proxima_renovacion: formData.fecha_proxima_renovacion || null,
      };

      const { data, error } = await supabase
        .from('sst_epp')
        .insert([payload])
        .select('*, empleados(id, nombres, apellidos, dni, fecha_ingreso, puesto)');

      if (error) throw error;

      setRecords([data[0], ...records]);
      setIsAdding(false);
      setFormData({
        empleado_id: "",
        fecha_entrega: "",
        equipo: "",
        talla_calzado: "",
        talla_chaleco: "",
        talla_casco: "",
        motivo_entrega: "Nuevo Ingreso",
        estado_firma: "Entregado",
        fecha_proxima_renovacion: ""
      });
    } catch (error) {
      console.error("Error saving EPP:", error);
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Registro de EPP</h1>
          <p className="text-slate-500 mt-2">Control de entrega de Equipos de Protección Personal</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap text-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Entrega
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
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Registrar Entrega de EPP
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="font-medium text-slate-700 mb-2">1. Datos del Empleado</h4>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Empleado</label>
                      <Select
                        required
                        value={formData.empleado_id}
                        onChange={e => setFormData({ ...formData, empleado_id: e.target.value })}
                        options={empleados.map(emp => ({ value: emp.id, label: `${emp.nombres} ${emp.apellidos} - ${emp.dni}` }))}
                        placeholder="Seleccione..."
                        triggerClassName="w-full px-4 py-2.5 rounded-lg border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                      />
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
                    <h4 className="font-medium text-slate-700 mb-2">2. Datos de la Entrega</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Entrega</label>
                        <input
                          type="date"
                          required
                          value={formData.fecha_entrega}
                          onChange={e => setFormData({ ...formData, fecha_entrega: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Equipo(s) Entregado(s)</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Zapatos, Chaleco..."
                          value={formData.equipo}
                          onChange={e => setFormData({ ...formData, equipo: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Talla Calzado</label>
                        <input
                          type="text"
                          placeholder="Ej. 42"
                          value={formData.talla_calzado}
                          onChange={e => setFormData({ ...formData, talla_calzado: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Talla Chaleco</label>
                        <input
                          type="text"
                          placeholder="Ej. M, L"
                          value={formData.talla_chaleco}
                          onChange={e => setFormData({ ...formData, talla_chaleco: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Talla Casco</label>
                        <input
                          type="text"
                          placeholder="Ej. Estándar"
                          value={formData.talla_casco}
                          onChange={e => setFormData({ ...formData, talla_casco: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                        <select
                          value={formData.motivo_entrega}
                          onChange={e => setFormData({ ...formData, motivo_entrega: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        >
                          <option value="Nuevo Ingreso">Nuevo Ingreso</option>
                          <option value="Renovación">Renovación</option>
                          <option value="Deterioro">Deterioro</option>
                          <option value="Pérdida">Pérdida</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                        <select
                          value={formData.estado_firma}
                          onChange={e => setFormData({ ...formData, estado_firma: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        >
                          <option value="Entregado">Entregado / Firmado</option>
                          <option value="Pendiente">Pendiente de Firma</option>
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
                <th className="px-6 py-4">Equipos</th>
                <th className="px-6 py-4">Tallas (Calz/Chal/Casc)</th>
                <th className="px-6 py-4">Fecha Entrega</th>
                <th className="px-6 py-4">Motivo</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{record.empleados?.nombres} {record.empleados?.apellidos}</div>
                      <div className="text-slate-500 text-xs">DNI: {record.empleados?.dni} • {record.empleados?.puesto}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700">{record.equipo}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {record.talla_calzado || '-'} / {record.talla_chaleco || '-'} / {record.talla_casco || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-700">{record.fecha_entrega}</td>
                    <td className="px-6 py-4 text-slate-700">{record.motivo_entrega}</td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-semibold",
                        record.estado_firma.includes("Pendiente") ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      )}>
                        {record.estado_firma}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    {loading ? "Cargando registros..." : "No se encontraron registros de EPP."}
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
