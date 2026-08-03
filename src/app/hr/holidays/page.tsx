"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

type Feriado = {
  id: string;
  fecha: string;
  descripcion: string;
};

export default function HolidaysPage() {
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newFeriado, setNewFeriado] = useState({ fecha: "", descripcion: "" });

  useEffect(() => {
    fetchFeriados();
    
    const channel = supabase
      .channel('realtime-holidays')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feriados' }, (payload) => {
        setFeriados(prev => {
          if (prev.find(f => f.id === payload.new.id)) return prev;
          return [...prev, payload.new as Feriado].sort((a, b) => a.fecha.localeCompare(b.fecha));
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'feriados' }, (payload) => {
        setFeriados(prev => prev.filter(f => f.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeriados = async () => {
    try {
      const { data, error } = await supabase
        .from('feriados')
        .select('*')
        .order('fecha', { ascending: true });
      
      if (error) throw error;
      setFeriados(data || []);
    } catch (error) {
      console.error("Error fetching feriados", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('feriados')
        .insert([{ fecha: newFeriado.fecha, descripcion: newFeriado.descripcion }])
        .select();

      if (error) throw error;
      
      setFeriados([...feriados, data[0]].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setNewFeriado({ fecha: "", descripcion: "" });
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding feriado", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('feriados').delete().eq('id', id);
      if (error) throw error;
      setFeriados(feriados.filter(f => f.id !== id));
    } catch (error) {
      console.error("Error deleting feriado", error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestor de Feriados</h1>
          <p className="text-gray-500 mt-2">Administra el calendario de días no laborables para toda la empresa.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Feriado
        </button>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8"
        >
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-gray-700">Fecha del Feriado</label>
              <input
                type="date"
                required
                value={newFeriado.fecha}
                onChange={e => setNewFeriado({ ...newFeriado, fecha: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="flex-[2] space-y-2">
              <label className="text-sm font-medium text-gray-700">Descripción / Motivo</label>
              <input
                type="text"
                required
                placeholder="Ej. Día del Trabajo"
                value={newFeriado.descripcion}
                onChange={e => setNewFeriado({ ...newFeriado, descripcion: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button type="submit" className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors">
              Guardar
            </button>
          </form>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto w-full">
        <table className="w-full min-w-[500px] text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 font-medium text-gray-500 whitespace-nowrap w-32">Fecha</th>
              <th className="px-4 py-3 font-medium text-gray-500">Descripción</th>
              <th className="px-4 py-3 font-medium text-gray-500 w-24 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-400">Cargando feriados...</td>
              </tr>
            ) : feriados.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-400">No hay feriados registrados</td>
              </tr>
            ) : (
              feriados.map((feriado) => (
                <tr key={feriado.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-medium text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {feriado.fecha}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{feriado.descripcion}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(feriado.id)}
                      className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
