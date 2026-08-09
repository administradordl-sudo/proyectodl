"use client";

import { useState, useEffect, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, PackageSearch, PackagePlus, History, TrendingDown, TrendingUp, AlertTriangle, ClipboardList, ArrowRightLeft, Search, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import Select from "@/components/ui/Select";

type EppItem = {
  id: string;
  nombre: string;
  categoria: string;
  unidad_medida: string;
  stock_actual: number;
};

type EppTransaction = {
  id: string;
  tipo_movimiento: string;
  cantidad: number;
  fecha: string;
  motivo: string;
  usuario_registro?: string;
  epp_items: { nombre: string };
};

export default function EppAlmacenPage() {
  const [items, setItems] = useState<EppItem[]>([]);
  const [transactions, setTransactions] = useState<EppTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stock" | "historial" | "kardex">("stock");

  // Kardex States
  const [selectedKardexItemId, setSelectedKardexItemId] = useState("");
  const [kardexTransactions, setKardexTransactions] = useState<EppTransaction[]>([]);
  const [kardexLoading, setKardexLoading] = useState(false);

  // Historial States
  const [searchTermHistorial, setSearchTermHistorial] = useState("");

  // Stock Expand/Modal States
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<EppItem | null>(null);
  const [expandedItemTransactions, setExpandedItemTransactions] = useState<EppTransaction[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  // States for Modals
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingMovement, setIsAddingMovement] = useState(false);

  // Forms
  const [newItemForm, setNewItemForm] = useState({ nombre: "", categoria: "Cascos", unidad_medida: "Unidad" });
  const [newMovementForm, setNewMovementForm] = useState({
    epp_item_id: "",
    tipo_movimiento: "INGRESO",
    cantidad: "",
    motivo: "",
  });

  useEffect(() => {
    fetchItems();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (selectedKardexItemId) {
      fetchKardex(selectedKardexItemId);
    } else {
      setKardexTransactions([]);
    }
  }, [selectedKardexItemId]);

  const fetchKardex = async (itemId: string) => {
    try {
      setKardexLoading(true);
      const { data, error } = await supabase
        .from('epp_transactions')
        .select('*, epp_items(nombre)')
        .eq('epp_item_id', itemId)
        .order('fecha', { ascending: true }); // Orden cronológico para calcular saldo
      
      if (error) throw error;
      setKardexTransactions(data || []);
    } catch (error: any) {
      console.error("Error fetching kardex:", error);
    } finally {
      setKardexLoading(false);
    }
  };

  const openHistoryModal = async (item: EppItem) => {
    setSelectedHistoryItem(item);
    setExpandedLoading(true);
    try {
      const { data, error } = await supabase
        .from('epp_transactions')
        .select('*, epp_items(nombre)')
        .eq('epp_item_id', item.id)
        .order('fecha', { ascending: true }); // orden ascendente para saldo
      if (error) throw error;
      setExpandedItemTransactions(data || []);
    } catch(error) {
      console.error("Error al cargar historial del ítem:", error);
    } finally {
      setExpandedLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setSelectedHistoryItem(null);
    setExpandedItemTransactions([]);
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('epp_items')
        .select('*')
        .order('categoria')
        .order('nombre');
      
      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      if (error.code !== '42P01') console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('epp_transactions')
        .select('*, epp_items(nombre)')
        .order('fecha', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      if (error.code !== '42P01') console.error("Error fetching transactions:", error);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('epp_items').insert([newItemForm]);
      if (error) throw error;
      
      setIsAddingItem(false);
      setNewItemForm({ nombre: "", categoria: "Cascos", unidad_medida: "Unidad" });
      fetchItems();
      alert("Ítem agregado al catálogo con éxito");
    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un error al agregar el ítem.");
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.epp_items?.nombre.toLowerCase().includes(searchTermHistorial.toLowerCase()) ||
    tx.motivo?.toLowerCase().includes(searchTermHistorial.toLowerCase()) ||
    tx.usuario_registro?.toLowerCase().includes(searchTermHistorial.toLowerCase())
  );

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('epp_transactions').insert([{
        epp_item_id: newMovementForm.epp_item_id,
        tipo_movimiento: newMovementForm.tipo_movimiento,
        cantidad: parseInt(newMovementForm.cantidad),
        motivo: newMovementForm.motivo
      }]);
      
      if (error) throw error;
      
      setIsAddingMovement(false);
      setNewMovementForm({ epp_item_id: "", tipo_movimiento: "INGRESO", cantidad: "", motivo: "" });
      fetchItems(); // Para actualizar stock
      fetchTransactions(); // Para actualizar historial
      alert("Movimiento registrado con éxito");
    } catch (error) {
      console.error("Error:", error);
      alert("Error al registrar movimiento. Verifique stock si es salida.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <PackageSearch className="w-8 h-8 text-blue-600" />
            Almacén de EPPs
          </h1>
          <p className="text-slate-500 mt-2">Control de inventario, ingresos y salidas de equipos de protección.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsAddingItem(!isAddingItem)}
            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm shadow-sm"
          >
            <PackagePlus className="w-4 h-4" />
            Nuevo Ítem Catálogo
          </button>
          <button
            onClick={() => setIsAddingMovement(!isAddingMovement)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Registrar Movimiento
          </button>
        </div>
      </div>

      {/* Forms (Modals or Expandable Areas) */}
      <AnimatePresence>
        {isAddingItem && (
          <motion.div 
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }} 
            animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }} 
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
          >
            <div className="bg-white p-6 pb-24 rounded-2xl shadow-sm border border-slate-200 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-800">Agregar Nuevo Ítem al Catálogo</h3>
              <form onSubmit={handleAddItem} className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px] relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Equipo</label>
                  <input
                    required
                    type="text"
                    value={newItemForm.nombre}
                    onChange={e => setNewItemForm({ ...newItemForm, nombre: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ej. Guantes de Nitrilo Talla L"
                  />
                  {newItemForm.nombre.length > 2 && (
                    <div className="absolute z-50 w-full bg-white border border-slate-200 shadow-xl rounded-lg mt-1 max-h-48 overflow-y-auto">
                      {items.filter(item => item.nombre.toLowerCase().includes(newItemForm.nombre.toLowerCase())).length > 0 ? (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100 uppercase tracking-wider">
                            Equipos Similares (Ya existentes)
                          </div>
                          {items.filter(item => item.nombre.toLowerCase().includes(newItemForm.nombre.toLowerCase())).map(match => (
                            <div key={match.id} className="px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                onClick={() => setNewItemForm({ ...newItemForm, nombre: match.nombre })}>
                              <AlertTriangle className="w-4 h-4 inline-block mr-1.5 text-amber-500" /> {match.nombre}
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="px-3 py-2.5 text-sm text-emerald-600 font-medium">
                          <Check className="w-4 h-4 inline-block mr-1.5" /> Nombre disponible
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="w-48 relative z-[60]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <Select
                    required
                    value={newItemForm.categoria}
                    onChange={e => setNewItemForm({ ...newItemForm, categoria: e.target.value })}
                    options={[
                      { value: "Cascos", label: "Cascos" },
                      { value: "Calzado", label: "Calzado" },
                      { value: "Chalecos", label: "Chalecos" },
                      { value: "Guantes", label: "Guantes" },
                      { value: "Protección Visual", label: "Protección Visual" },
                      { value: "Protección Auditiva", label: "Protección Auditiva" },
                      { value: "Protección Respiratoria", label: "Protección Respiratoria" },
                      { value: "Otros", label: "Otros" },
                    ]}
                    triggerClassName="w-full px-4 py-2.5 rounded-lg border-slate-200"
                  />
                </div>
                <div className="w-32 relative z-[50]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
                  <Select
                    required
                    value={newItemForm.unidad_medida}
                    onChange={e => setNewItemForm({ ...newItemForm, unidad_medida: e.target.value })}
                    options={[
                      { value: "Unidad", label: "Unidad" },
                      { value: "Par", label: "Par" },
                      { value: "Caja", label: "Caja" },
                      { value: "Kit", label: "Kit" },
                    ]}
                    triggerClassName="w-full px-4 py-2.5 rounded-lg border-slate-200"
                  />
                </div>
                <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-medium transition-colors h-[42px] z-10">
                  Guardar
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {isAddingMovement && (
          <motion.div 
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }} 
            animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }} 
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
          >
            <div className="bg-white p-6 pb-24 rounded-2xl shadow-sm border border-blue-100 mb-6 bg-blue-50/30">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">Registrar Movimiento de Almacén</h3>
              <form onSubmit={handleAddMovement} className="flex flex-wrap gap-4 items-end">
                <div className="w-40 relative z-[60]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <Select
                    required
                    value={newMovementForm.tipo_movimiento}
                    onChange={e => setNewMovementForm({ ...newMovementForm, tipo_movimiento: e.target.value })}
                    options={[
                      { value: "INGRESO", label: "Ingreso (Compra)" },
                      { value: "SALIDA", label: "Salida / Merma" },
                      { value: "AJUSTE", label: "Ajuste (+/-)" },
                    ]}
                    triggerClassName="w-full px-4 py-2.5 rounded-lg border-slate-200"
                  />
                </div>
                <div className="flex-1 min-w-[250px] relative z-[50]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ítem</label>
                  <Select
                    required
                    value={newMovementForm.epp_item_id}
                    onChange={e => setNewMovementForm({ ...newMovementForm, epp_item_id: e.target.value })}
                    options={items.map(i => ({ value: i.id, label: `${i.nombre} (Stock: ${i.stock_actual})` }))}
                    placeholder="Seleccione un equipo..."
                    triggerClassName="w-full px-4 py-2.5 rounded-lg border-slate-200"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={newMovementForm.cantidad}
                    onChange={e => setNewMovementForm({ ...newMovementForm, cantidad: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Factura</label>
                  <input
                    required
                    type="text"
                    value={newMovementForm.motivo}
                    onChange={e => setNewMovementForm({ ...newMovementForm, motivo: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ej. Fac 001-3442 o Compra urgente"
                  />
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors h-[42px]">
                  Registrar
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('stock')}
          className={clsx(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'stock' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          Stock Actual
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={clsx(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'historial' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <History className="w-4 h-4" />
          Historial de Movimientos
        </button>
        <button
          onClick={() => setActiveTab('kardex')}
          className={clsx(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'kardex' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <ClipboardList className="w-4 h-4" />
          Kardex
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === 'stock' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Equipo</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Categoría</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Unidad</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Stock Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay ítems registrados en el almacén.</td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} onClick={() => openHistoryModal(item)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 flex items-center gap-2">
                          <History className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                          {item.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{item.unidad_medida}</td>
                      <td className="px-6 py-4 text-right">
                        <div className={clsx(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold",
                          item.stock_actual > 10 ? "bg-emerald-50 text-emerald-700" : 
                          item.stock_actual > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                        )}>
                          {item.stock_actual <= 5 && <AlertTriangle className="w-4 h-4" />}
                          {item.stock_actual}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar equipo, motivo o usuario..."
                  value={searchTermHistorial}
                  onChange={(e) => setSearchTermHistorial(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white shadow-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Fecha</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Usuario</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Tipo</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Equipo</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Cantidad</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        {transactions.length === 0 ? "No hay movimientos registrados." : "No se encontraron resultados para la búsqueda."}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(tx.fecha).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {tx.usuario_registro || <span className="text-slate-400 italic">Sistema</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={clsx(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium",
                            tx.tipo_movimiento === 'INGRESO' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            tx.tipo_movimiento === 'SALIDA' ? "bg-rose-50 text-rose-700 border border-rose-200" :
                            "bg-amber-50 text-amber-700 border border-amber-200"
                          )}>
                            {tx.tipo_movimiento === 'INGRESO' && <TrendingUp className="w-3 h-3" />}
                            {tx.tipo_movimiento === 'SALIDA' && <TrendingDown className="w-3 h-3" />}
                            {tx.tipo_movimiento}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {tx.epp_items?.nombre}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          {tx.tipo_movimiento === 'SALIDA' ? '-' : '+'}{tx.cantidad}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {tx.motivo}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'kardex' && (
          <div className="flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Seleccionar Ítem para Kardex:</label>
              <div className="w-full sm:w-80">
                <Select
                  value={selectedKardexItemId}
                  onChange={e => setSelectedKardexItemId(e.target.value)}
                  options={items.map(i => ({ value: i.id, label: i.nombre }))}
                  placeholder="Buscar equipo..."
                  triggerClassName="w-full px-4 py-2 rounded-lg border-slate-200 text-sm bg-white shadow-sm"
                />
              </div>
            </div>
            
            {!selectedKardexItemId ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                <ClipboardList className="w-12 h-12 text-slate-200" />
                <p>Seleccione un equipo arriba para visualizar su Kardex.</p>
              </div>
            ) : kardexLoading ? (
              <div className="py-12 text-center text-slate-500">Cargando Kardex...</div>
            ) : kardexTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-500">No hay movimientos registrados para este ítem.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-slate-500">Fecha</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-slate-500">Detalle / Motivo</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-emerald-600 text-center">Entrada</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-rose-600 text-center">Salida</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-blue-600 text-center">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      let saldo = 0;
                      return kardexTransactions.map(tx => {
                        const esIngreso = tx.tipo_movimiento === 'INGRESO';
                        const esSalida = tx.tipo_movimiento === 'SALIDA';
                        const esAjuste = tx.tipo_movimiento === 'AJUSTE';
                        
                        let entrada = 0;
                        let salida = 0;

                        if (esIngreso) entrada = tx.cantidad;
                        if (esSalida) salida = tx.cantidad;
                        if (esAjuste) {
                          if (tx.cantidad > 0) entrada = tx.cantidad;
                          else salida = Math.abs(tx.cantidad);
                        }

                        saldo = saldo + entrada - salida;

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-3 text-sm text-slate-600 whitespace-nowrap">
                              {new Date(tx.fecha).toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-sm font-medium text-slate-800">
                              <span className={clsx(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold mr-2",
                                esIngreso ? "bg-emerald-100 text-emerald-800" :
                                esSalida ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                              )}>
                                {tx.tipo_movimiento}
                              </span>
                              {tx.motivo}
                            </td>
                            <td className="px-6 py-3 text-center text-sm font-semibold text-emerald-700 bg-emerald-50/20 group-hover:bg-emerald-50/50">
                              {entrada > 0 ? `+${entrada}` : '-'}
                            </td>
                            <td className="px-6 py-3 text-center text-sm font-semibold text-rose-700 bg-rose-50/20 group-hover:bg-rose-50/50">
                              {salida > 0 ? `-${salida}` : '-'}
                            </td>
                            <td className="px-6 py-3 text-center text-sm font-bold text-blue-700 bg-blue-50/20 group-hover:bg-blue-50/50">
                              {saldo}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Historial de Equipo */}
      <AnimatePresence>
        {selectedHistoryItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={closeHistoryModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white z-10">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  Historial: {selectedHistoryItem.nombre}
                </h3>
                <button
                  onClick={closeHistoryModal}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto bg-slate-50">
                {expandedLoading ? (
                  <div className="py-16 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : expandedItemTransactions.length === 0 ? (
                  <div className="py-16 text-center text-slate-500">
                    <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p>No hay movimientos registrados para este equipo.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-4 font-semibold text-slate-600">Fecha</th>
                          <th className="px-5 py-4 font-semibold text-slate-600">Usuario</th>
                          <th className="px-5 py-4 font-semibold text-slate-600">Motivo</th>
                          <th className="px-5 py-4 font-semibold text-slate-600 text-center">Entrada</th>
                          <th className="px-5 py-4 font-semibold text-slate-600 text-center">Salida</th>
                          <th className="px-5 py-4 font-semibold text-blue-700 text-center">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          let saldo = 0;
                          return expandedItemTransactions.map(tx => {
                            const esIngreso = tx.tipo_movimiento === 'INGRESO';
                            const esSalida = tx.tipo_movimiento === 'SALIDA';
                            const esAjuste = tx.tipo_movimiento === 'AJUSTE';
                            let entrada = 0, salida = 0;
                            if (esIngreso) entrada = tx.cantidad;
                            if (esSalida) salida = tx.cantidad;
                            if (esAjuste) {
                              if (tx.cantidad > 0) entrada = tx.cantidad;
                              else salida = Math.abs(tx.cantidad);
                            }
                            saldo = saldo + entrada - salida;
                            return (
                              <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{new Date(tx.fecha).toLocaleString()}</td>
                                <td className="px-5 py-3 font-medium text-slate-700">{tx.usuario_registro || <span className="text-slate-400 italic">Sistema</span>}</td>
                                <td className="px-5 py-3 text-slate-600">
                                  <span className={clsx("inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold mr-2", esIngreso ? "bg-emerald-100 text-emerald-800" : esSalida ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800")}>{tx.tipo_movimiento}</span>
                                  {tx.motivo}
                                </td>
                                <td className="px-5 py-3 text-center font-semibold text-emerald-600 bg-emerald-50/20">
                                  {entrada > 0 ? `+${entrada}` : '-'}
                                </td>
                                <td className="px-5 py-3 text-center font-semibold text-rose-600 bg-rose-50/20">
                                  {salida > 0 ? `-${salida}` : '-'}
                                </td>
                                <td className="px-5 py-3 text-center font-bold text-blue-700 bg-blue-50/20">
                                  {saldo}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
