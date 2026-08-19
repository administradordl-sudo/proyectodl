"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Clock, Save, X, Edit2 } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";

type Horario = {
  id: string;
  nombre: string;
  hora_ingreso: string;
  hora_salida: string;
  minutos_tolerancia: number;
  dias_laborables: string[];
};

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function HorariosPage() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    hora_ingreso: "08:00",
    hora_salida: "18:00",
    minutos_tolerancia: 10,
    dias_laborables: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
  });

  useEffect(() => {
    fetchHorarios();
  }, []);

  const fetchHorarios = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('horarios').select('*').order('created_at', { ascending: true });
    if (error) {
      toast.error("Error al cargar horarios");
      console.error(error);
    } else {
      setHorarios(data || []);
    }
    setIsLoading(false);
  };

  const handleDiaToggle = (dia: string) => {
    setFormData(prev => {
      const current = prev.dias_laborables;
      if (current.includes(dia)) {
        return { ...prev, dias_laborables: current.filter(d => d !== dia) };
      } else {
        return { ...prev, dias_laborables: [...current, dia] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.hora_ingreso || !formData.hora_salida) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase.from('horarios').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success("Horario actualizado correctamente");
      } else {
        const { error } = await supabase.from('horarios').insert([formData]);
        if (error) throw error;
        toast.success("Horario creado correctamente");
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({
        nombre: "",
        hora_ingreso: "08:00",
        hora_salida: "18:00",
        minutos_tolerancia: 10,
        dias_laborables: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
      });
      fetchHorarios();
    } catch (error: any) {
      toast.error("Error al guardar: " + error.message);
    }
  };

  const handleEdit = (h: Horario) => {
    setFormData({
      nombre: h.nombre,
      // supabase might return TIME as HH:MM:SS, we need HH:MM for inputs
      hora_ingreso: h.hora_ingreso.substring(0, 5),
      hora_salida: h.hora_salida.substring(0, 5),
      minutos_tolerancia: h.minutos_tolerancia,
      dias_laborables: h.dias_laborables
    });
    setEditingId(h.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este horario?")) return;
    try {
      const { error } = await supabase.from('horarios').delete().eq('id', id);
      if (error) throw error;
      toast.success("Horario eliminado");
      fetchHorarios();
    } catch (error: any) {
      toast.error("Error al eliminar: " + error.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Gestor de Horarios</h1>
          <p className="text-gray-500 mt-1">Crea y administra los turnos de trabajo para la biometría</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuevo Horario
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{editingId ? "Editar Horario" : "Nuevo Horario"}</h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Horario *</label>
                <input 
                  type="text" 
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ej. Turno Mañana"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minutos de Tolerancia</label>
                <input 
                  type="number" 
                  min="0"
                  value={formData.minutos_tolerancia}
                  onChange={e => setFormData({...formData, minutos_tolerancia: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora de Ingreso *</label>
                <input 
                  type="time" 
                  value={formData.hora_ingreso}
                  onChange={e => setFormData({...formData, hora_ingreso: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora de Salida *</label>
                <input 
                  type="time" 
                  value={formData.hora_salida}
                  onChange={e => setFormData({...formData, hora_salida: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Días Laborables</label>
              <div className="flex flex-wrap gap-3">
                {DIAS_SEMANA.map(dia => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => handleDiaToggle(dia)}
                    className={clsx(
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                      formData.dias_laborables.includes(dia)
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {dia}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Save className="w-5 h-5" />
                Guardar Horario
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando horarios...</div>
      ) : horarios.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No hay horarios configurados</h3>
          <p className="text-gray-500 max-w-sm mb-6">Agrega los horarios de trabajo de la empresa para poder asignarlos a los empleados y medir sus tardanzas.</p>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Crear primer horario
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {horarios.map((h) => (
            <div key={h.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">{h.nombre}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(h)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(h.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Turno:</span>
                  <span className="font-medium text-gray-900">{h.hora_ingreso.substring(0, 5)} - {h.hora_salida.substring(0, 5)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tolerancia:</span>
                  <span className="font-medium text-gray-900">{h.minutos_tolerancia} min</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Días Laborables</p>
                <div className="flex flex-wrap gap-1">
                  {h.dias_laborables.map(dia => (
                    <span key={dia} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                      {dia.substring(0, 2)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
