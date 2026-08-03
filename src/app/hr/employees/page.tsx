"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Users, Search, ChevronDown, ChevronUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import clsx from "clsx";

type Empleado = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  puesto: string;
  area: string;
  sede: string;
  fecha_ingreso: string;
  direccion?: string;
  telefono?: string;
  telefono_corporativo?: string;
  email?: string;
  jefe?: string;
  cumpleanos?: string;
  genero?: string;
  hijos?: string;
  carrera?: string;
  distrito?: string;
  nro_cta?: string;
  tipo_cta?: string;
  afp?: string;
  cuspp?: string;
  vida_ley?: string;
};

const initialForm = {
  nombres: "", apellidos: "", dni: "", direccion: "", telefono: "", telefono_corporativo: "",
  email: "", puesto: "", jefe: "", area: "", fecha_ingreso: "", cumpleanos: "", genero: "",
  hijos: "", carrera: "", distrito: "", nro_cta: "", tipo_cta: "", afp: "", cuspp: "",
  vida_ley: "No Entregado", sede: ""
};

export default function EmployeesPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);

  const [expandedSections, setExpandedSections] = useState({
    personales: true,
    corporativos: true,
    seguros: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    fetchEmpleados();
    
    const channel = supabase
      .channel('realtime-employees')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'empleados' }, (payload) => {
        setEmpleados(prev => {
          if (prev.find(e => e.id === payload.new.id)) return prev;
          return [payload.new as Empleado, ...prev];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'empleados' }, (payload) => {
        setEmpleados(prev => prev.filter(e => e.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEmpleados = async () => {
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEmpleados(data || []);
    } catch (error) {
      console.error("Error fetching empleados", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Remove empty fields to avoid sending empty strings for dates
      const dataToSubmit = { ...formData };
      if (!dataToSubmit.fecha_ingreso) delete (dataToSubmit as any).fecha_ingreso;
      if (!dataToSubmit.cumpleanos) delete (dataToSubmit as any).cumpleanos;

      const { error } = await supabase
        .from('empleados')
        .insert([dataToSubmit]);

      if (error) throw error;
      
      setFormData(initialForm);
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding empleado", error);
      alert("Hubo un error al registrar el empleado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("¿Estás seguro de eliminar a este empleado?")) return;
    try {
      const { error } = await supabase.from('empleados').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting empleado", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue = value;
    
    if (type === 'text') {
      finalValue = value.toUpperCase();
    } else if (type === 'email') {
      finalValue = value.toLowerCase();
    }
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const filteredEmpleados = empleados.filter(e => 
    `${e.nombres} ${e.apellidos} ${e.dni}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Directorio de Empleados</h1>
          <p className="text-gray-500 mt-2">Gestiona el personal, contratos y datos corporativos.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap text-sm h-10"
        >
          <Plus className="w-4 h-4" />
          Nuevo Empleado
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 relative">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-2"
              >
                Cerrar
              </button>
              
              <h2 className="text-xl font-bold text-gray-800 mb-6">Registrar Nuevo Empleado</h2>
              
              <form onSubmit={handleAdd} className="space-y-6">
                
                {/* 1. Datos Personales */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button type="button" onClick={() => toggleSection('personales')} className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-sm font-semibold text-gray-700">
                    1. Datos Personales
                    {expandedSections.personales ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSections.personales && (
                    <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Nombres *</label><input required name="nombres" value={formData.nombres} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Apellidos *</label><input required name="apellidos" value={formData.apellidos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">DNI *</label><input required name="dni" value={formData.dni} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Cumpleaños</label><input type="date" name="cumpleanos" value={formData.cumpleanos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Género</label>
                        <select name="genero" value={formData.genero} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 bg-white">
                          <option value="">Seleccionar...</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option>
                        </select>
                      </div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Hijos</label><input placeholder="Cantidad o Si/No" name="hijos" value={formData.hijos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label><input name="direccion" value={formData.direccion} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Distrito</label><input name="distrito" value={formData.distrito} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Teléfono Personal</label><input name="telefono" value={formData.telefono} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Carrera / Formación</label><input name="carrera" value={formData.carrera} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                    </div>
                  )}
                </div>

                {/* 2. Datos Corporativos */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button type="button" onClick={() => toggleSection('corporativos')} className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-sm font-semibold text-gray-700">
                    2. Datos Corporativos
                    {expandedSections.corporativos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSections.corporativos && (
                    <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Teléfono Corp.</label><input name="telefono_corporativo" value={formData.telefono_corporativo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Ingreso *</label><input required type="date" name="fecha_ingreso" value={formData.fecha_ingreso} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Puesto *</label><input required name="puesto" value={formData.puesto} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Área *</label><input required name="area" value={formData.area} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Sede *</label>
                        <select required name="sede" value={formData.sede} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 bg-white">
                          <option value="">Seleccionar...</option><option value="Principal">Principal</option><option value="Almacén">Almacén</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Jefe Directo</label><input name="jefe" value={formData.jefe} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                    </div>
                  )}
                </div>

                {/* 3. Bancarios y Seguros */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button type="button" onClick={() => toggleSection('seguros')} className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-sm font-semibold text-gray-700">
                    3. Bancos y Seguros
                    {expandedSections.seguros ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSections.seguros && (
                    <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Nro Cuenta Sueldo</label><input name="nro_cta" value={formData.nro_cta} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Cuenta</label>
                        <select name="tipo_cta" value={formData.tipo_cta} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 bg-white">
                          <option value="">Seleccionar...</option><option value="BCP">BCP</option><option value="Interbank">Interbank</option><option value="BBVA">BBVA</option>
                        </select>
                      </div>
                      <div className="hidden lg:block"></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">AFP / ONP</label><input placeholder="Ej. Integra, Prima, ONP..." name="afp" value={formData.afp} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">CUSPP</label><input name="cuspp" value={formData.cuspp} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Vida Ley</label>
                        <select name="vida_ley" value={formData.vida_ley} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 bg-white">
                          <option value="No Entregado">No Entregado</option><option value="Entregado">Entregado</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 gap-3">
                  <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-50">
                    {isSubmitting ? "Guardando..." : "Guardar Empleado"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar por nombre, apellido o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-sm w-full"
          />
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[700px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Empleado</th>
                <th className="px-4 py-3 font-medium text-gray-500">DNI</th>
                <th className="px-4 py-3 font-medium text-gray-500">Puesto / Área</th>
                <th className="px-4 py-3 font-medium text-gray-500">Sede</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Cargando directorio...</td>
                </tr>
              ) : filteredEmpleados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center flex flex-col items-center justify-center text-gray-400 gap-2">
                    <Users className="w-10 h-10 text-gray-300" />
                    <p>No se encontraron empleados.</p>
                  </td>
                </tr>
              ) : (
                filteredEmpleados.map((empleado) => (
                  <tr 
                    key={empleado.id} 
                    onClick={() => setSelectedEmpleado(empleado)}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{empleado.nombres} {empleado.apellidos}</div>
                      {empleado.fecha_ingreso && (
                        <div className="text-xs text-gray-500">Ingreso: {format(new Date(empleado.fecha_ingreso), "dd/MM/yyyy")}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 text-xs">{empleado.dni}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800">{empleado.puesto}</div>
                      <div className="text-xs text-gray-500">{empleado.area}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "px-2 py-1 rounded text-xs font-medium",
                        empleado.sede === 'Principal' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                      )}>
                        {empleado.sede || 'Sin Sede'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(empleado.id); }}
                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
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

      <AnimatePresence>
        {selectedEmpleado && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEmpleado(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-xl font-bold text-gray-800">
                  {selectedEmpleado.nombres} {selectedEmpleado.apellidos}
                </h3>
                <button onClick={() => setSelectedEmpleado(null)} className="p-2 text-gray-400 hover:text-gray-700 bg-gray-200/50 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Datos Personales */}
                  <div>
                    <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Datos Personales</h4>
                    <dl className="space-y-3 text-sm">
                      <div className="grid grid-cols-3"><dt className="text-gray-500">DNI</dt><dd className="col-span-2 font-medium text-gray-900">{selectedEmpleado.dni}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Género</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.genero || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Cumpleaños</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.cumpleanos ? format(new Date(selectedEmpleado.cumpleanos), 'dd/MM/yyyy') : '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Hijos</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.hijos || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Teléfono</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.telefono || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Dirección</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.direccion || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Distrito</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.distrito || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Carrera</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.carrera || '-'}</dd></div>
                    </dl>
                  </div>
                  
                  {/* Datos Corporativos */}
                  <div>
                    <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Datos Corporativos</h4>
                    <dl className="space-y-3 text-sm">
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Sede</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.sede}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Área</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.area}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Puesto</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.puesto}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Jefe</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.jefe || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Ingreso</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.fecha_ingreso ? format(new Date(selectedEmpleado.fecha_ingreso), 'dd/MM/yyyy') : '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Email</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.email || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Tel. Corp</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.telefono_corporativo || '-'}</dd></div>
                    </dl>
                  </div>

                  {/* Bancos y Seguros */}
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Bancos y Seguros</h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-sm">
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Cuenta</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.nro_cta || '-'} ({selectedEmpleado.tipo_cta || '-'})</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">AFP/ONP</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.afp || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">CUSPP</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.cuspp || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Vida Ley</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.vida_ley || '-'}</dd></div>
                    </dl>
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
