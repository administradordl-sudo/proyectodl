"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, ShieldCheck, Search, PackageCheck, AlertTriangle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import Select from "@/components/ui/Select";
import Link from "next/link";

type Empleado = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  fecha_ingreso: string;
  puesto: string;
};

type EppItem = {
  id: string;
  nombre: string;
  stock_actual: number;
};

type EppTransaction = {
  id: string;
  cantidad: number;
  epp_items: { nombre: string };
};

type EppEntrega = {
  id: string;
  empleado_id: string;
  fecha_entrega: string;
  motivo_entrega: string;
  estado_firma: string;
  fecha_proxima_renovacion: string;
  empleados?: Empleado;
  epp_transactions?: EppTransaction[];
};

export default function EPPPage() {
  const [entregas, setEntregas] = useState<EppEntrega[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [eppItems, setEppItems] = useState<EppItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    empleado_id: "",
    fecha_entrega: new Date().toISOString().split('T')[0],
    motivo_entrega: "Nuevo Ingreso",
    estado_firma: "Entregado",
    fecha_proxima_renovacion: ""
  });

  // Items seleccionados para entregar
  const [selectedItems, setSelectedItems] = useState<{ id: string; epp_item_id: string; cantidad: number }[]>([]);

  useEffect(() => {
    fetchEmpleados();
    fetchEppItems();
    fetchEntregas();
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

  const fetchEppItems = async () => {
    try {
      const { data, error } = await supabase
        .from('epp_items')
        .select('id, nombre, stock_actual')
        .order('nombre');
      if (error) throw error;
      setEppItems(data || []);
    } catch (error: any) {
      if (error.code !== '42P01') console.error("Error fetching items:", error);
    }
  };

  const fetchEntregas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sst_epp')
        .select(`
          *,
          empleados(id, nombres, apellidos, dni, fecha_ingreso, puesto),
          epp_transactions(id, cantidad, epp_items(nombre))
        `)
        .order('fecha_entrega', { ascending: false });
      
      if (error) throw error;
      setEntregas(data || []);
    } catch (error: any) {
      if (error.code !== '42P01') console.error("Error fetching EPP records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItemToDelivery = () => {
    setSelectedItems([...selectedItems, { id: Date.now().toString(), epp_item_id: "", cantidad: 1 }]);
  };

  const updateDeliveryItem = (id: string, field: string, value: string | number) => {
    setSelectedItems(selectedItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeDeliveryItem = (id: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.empleado_id) {
      alert("Seleccione un empleado.");
      return;
    }
    if (selectedItems.length === 0 || selectedItems.some(i => !i.epp_item_id)) {
      alert("Debe seleccionar al menos un equipo de protección para entregar.");
      return;
    }

    try {
      // 1. Crear Cabecera de Entrega
      const payloadCabecera = {
        empleado_id: formData.empleado_id,
        fecha_entrega: formData.fecha_entrega,
        motivo_entrega: formData.motivo_entrega || null,
        estado_firma: formData.estado_firma || null,
        fecha_proxima_renovacion: formData.fecha_proxima_renovacion || null,
      };

      const { data: entregaData, error: entregaError } = await supabase
        .from('sst_epp')
        .insert([payloadCabecera])
        .select()
        .single();

      if (entregaError) throw entregaError;

      const entregaId = entregaData.id;

      // 2. Crear Transacciones (Salidas)
      const transaccionesPayload = selectedItems.map(item => ({
        epp_item_id: item.epp_item_id,
        tipo_movimiento: 'SALIDA',
        cantidad: item.cantidad,
        entrega_id: entregaId,
        motivo: `Entrega a empleado - ${formData.motivo_entrega}`,
      }));

      const { error: txError } = await supabase
        .from('epp_transactions')
        .insert(transaccionesPayload);

      if (txError) throw txError;

      // 3. Refrescar Datos
      fetchEntregas();
      fetchEppItems(); // Refrescar stock
      
      setIsAdding(false);
      setSelectedItems([]);
      setFormData({
        empleado_id: "",
        fecha_entrega: new Date().toISOString().split('T')[0],
        motivo_entrega: "Nuevo Ingreso",
        estado_firma: "Entregado",
        fecha_proxima_renovacion: ""
      });
      alert("Entrega registrada con éxito.");

    } catch (error: any) {
      console.error("Error saving EPP:", error);
      alert(error.message || "Error al guardar el registro. Asegúrese de que hay stock suficiente.");
    }
  };

  const filteredRecords = entregas.filter(record => 
    `${record.empleados?.nombres} ${record.empleados?.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.empleados?.dni?.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Registro de Entregas EPP</h1>
          <p className="text-slate-500 mt-2">Control de entrega de Equipos de Protección Personal a trabajadores</p>
        </div>
        <div className="flex gap-3">
          <Link href="/sst/epp/almacen" className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm shadow-sm">
            <PackageCheck className="w-4 h-4 text-blue-600" />
            Ir a Almacén EPP
          </Link>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Entrega
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }} 
            animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }} 
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
          >
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 mb-6">
              <h3 className="text-lg font-semibold mb-6 text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Registrar Entrega de EPP
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna Izquierda: Datos del Empleado */}
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100 h-fit">
                    <h4 className="font-medium text-slate-700 mb-2">1. Datos del Empleado</h4>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Empleado</label>
                      <Select
                        required
                        value={formData.empleado_id}
                        onChange={e => setFormData({ ...formData, empleado_id: e.target.value })}
                        options={empleados.map(emp => ({ value: emp.id, label: `${emp.nombres} ${emp.apellidos} - ${emp.dni}` }))}
                        placeholder="Seleccione un empleado..."
                        triggerClassName="w-full px-4 py-2.5 rounded-lg border-slate-200 bg-white"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Entrega</label>
                        <input
                          type="date"
                          required
                          value={formData.fecha_entrega}
                          onChange={e => setFormData({...formData, fecha_entrega: e.target.value})}
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Renovación</label>
                        <input
                          type="date"
                          value={formData.fecha_proxima_renovacion}
                          onChange={e => setFormData({...formData, fecha_proxima_renovacion: e.target.value})}
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                      <Select
                        value={formData.motivo_entrega}
                        onChange={e => setFormData({...formData, motivo_entrega: e.target.value})}
                        options={[
                          { value: "Nuevo Ingreso", label: "Nuevo Ingreso" },
                          { value: "Renovación", label: "Renovación por desgaste" },
                          { value: "Pérdida", label: "Pérdida" },
                          { value: "Cambio de Puesto", label: "Cambio de Puesto" },
                        ]}
                        triggerClassName="w-full px-4 py-2.5 rounded-lg border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Columna Derecha: Equipos a Entregar */}
                  <div className="space-y-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-emerald-900">2. Equipos a Entregar</h4>
                      <button 
                        type="button" 
                        onClick={handleAddItemToDelivery}
                        className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-md font-medium transition-colors"
                      >
                        + Agregar Equipo
                      </button>
                    </div>

                    {selectedItems.length === 0 ? (
                      <div className="text-center py-6 text-emerald-600/60 text-sm border-2 border-dashed border-emerald-200 rounded-lg bg-emerald-50/30">
                        Haga clic en "Agregar Equipo" para seleccionar del almacén.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedItems.map((item, index) => (
                          <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-emerald-100 shadow-sm">
                            <span className="text-xs font-bold text-slate-400 w-5 text-center">{index + 1}</span>
                            <div className="flex-1">
                              <Select
                                required
                                value={item.epp_item_id}
                                onChange={e => updateDeliveryItem(item.id, 'epp_item_id', e.target.value)}
                                options={eppItems.map(i => ({ 
                                  value: i.id, 
                                  label: `${i.nombre} (Stock: ${i.stock_actual})` 
                                }))}
                                placeholder="Seleccionar ítem..."
                                triggerClassName="w-full px-3 py-1.5 rounded-md border-slate-200 text-sm"
                              />
                            </div>
                            <div className="w-16">
                              <input 
                                type="number" 
                                min="1"
                                required
                                value={item.cantidad}
                                onChange={e => updateDeliveryItem(item.id, 'cantidad', parseInt(e.target.value))}
                                className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm text-center focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                            <button 
                              type="button" 
                              onClick={() => removeDeliveryItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-medium shadow-sm shadow-emerald-200 transition-all active:scale-95"
                  >
                    Guardar Entrega
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por empleado o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Empleado</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Equipos Entregados</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Fecha Entrega</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Motivo</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Renovación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Cargando registros...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                    <ShieldCheck className="w-8 h-8 text-slate-300" />
                    <p>No se encontraron registros de entrega de EPP.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {record.empleados?.nombres} {record.empleados?.apellidos}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
                        <span>DNI: {record.empleados?.dni}</span>
                        <span>•</span>
                        <span>{record.empleados?.puesto}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {record.epp_transactions && record.epp_transactions.length > 0 ? (
                          record.epp_transactions.map(tx => (
                            <span key={tx.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {tx.cantidad}x {tx.epp_items?.nombre}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No detalla</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {record.fecha_entrega}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {record.motivo_entrega}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {record.fecha_proxima_renovacion ? (
                        new Date(record.fecha_proxima_renovacion) < new Date() ? (
                          <span className="text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {record.fecha_proxima_renovacion}
                          </span>
                        ) : (
                          record.fecha_proxima_renovacion
                        )
                      ) : '-'}
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
