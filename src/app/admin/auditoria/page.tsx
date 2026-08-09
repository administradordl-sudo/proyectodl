"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, ShieldAlert, History, Filter, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

type AuditLog = {
  id: string;
  table_name: string;
  action: string;
  record_id: string;
  old_data: any;
  new_data: any;
  user_id: string;
  created_at: string;
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTable, setFilterTable] = useState("TODAS");
  const [filterAction, setFilterAction] = useState("TODAS");

  // Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200); // Límite inicial de 200 para pruebas
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      if (error.code !== '42P01') {
        console.error("Error fetching audit logs:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchSearch = 
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (log.record_id && log.record_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchTable = filterTable === "TODAS" || log.table_name === filterTable;
    const matchAction = filterAction === "TODAS" || log.action === filterAction;

    return matchSearch && matchTable && matchAction;
  });

  const uniqueTables = Array.from(new Set(logs.map(l => l.table_name)));

  const renderDataVisual = (data: any) => {
    if (!data) return <p className="text-slate-500 italic p-2">No aplicable.</p>;
    if (typeof data !== 'object') return <p className="p-2">{String(data)}</p>;
    
    return (
      <ul className="space-y-1.5 w-full">
        {Object.entries(data).map(([key, value]) => (
          <li key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 p-2.5 rounded-lg hover:bg-white/60 transition-colors border border-transparent hover:border-slate-200/50">
            <span className="font-semibold text-slate-600 sm:w-1/3 break-words shrink-0 capitalize">{key.replace(/_/g, ' ')}:</span>
            <span className="text-slate-800 text-sm break-words flex-1">
              {value === null ? <span className="text-slate-400 italic">null</span> : String(value)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-indigo-600" />
            Auditoría del Sistema
          </h1>
          <p className="text-slate-500 mt-2">Monitoreo global de cambios y registros en la base de datos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm shadow-sm"
          >
            <History className="w-4 h-4" />
            Refrescar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por tabla o ID de registro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
          >
            <option value="TODAS">Todas las Tablas</option>
            {uniqueTables.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <select 
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
          >
            <option value="TODAS">Todas las Acciones</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-slate-500">Fecha y Hora</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-slate-500">Acción</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-slate-500">Tabla</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-slate-500">Usuario</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-slate-500 text-right">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Cargando registros de auditoría...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron registros de auditoría que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide",
                        log.action === 'INSERT' ? "bg-emerald-100 text-emerald-800" :
                        log.action === 'UPDATE' ? "bg-amber-100 text-amber-800" :
                        "bg-rose-100 text-rose-800"
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-indigo-900">
                      {log.table_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {log.user_id || <span className="italic text-slate-400">Sistema (No Auth)</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium hover:underline flex items-center justify-end gap-1 w-full"
                      >
                        Ver Cambios <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedLog(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white z-10">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    Detalles de Auditoría
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    ID Registro: <span className="font-mono text-slate-700">{selectedLog.record_id || 'N/A'}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto bg-slate-50 flex flex-col lg:flex-row gap-6">
                
                {/* Old Data */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-rose-700 mb-3 flex items-center gap-2">
                    Datos Anteriores {selectedLog.action === 'INSERT' && '(Vacío)'}
                  </h4>
                  <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-2 sm:p-4 overflow-x-auto shadow-inner h-full">
                    {renderDataVisual(selectedLog.old_data)}
                  </div>
                </div>

                {/* New Data */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                    Datos Nuevos {selectedLog.action === 'DELETE' && '(Vacío)'}
                  </h4>
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2 sm:p-4 overflow-x-auto shadow-inner h-full">
                    {renderDataVisual(selectedLog.new_data)}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
