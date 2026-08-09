"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Smartphone, Shield, Search, X, Check, Trash2, MonitorSmartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { toast } from "sonner";

type Empleado = {
  id: string;
  nombres: string;
  apellidos: string;
  email?: string;
  puesto?: string;
};

type Permisos = {
  id?: string;
  modulo: string;
  puede_ver: boolean;
  puede_crear: boolean;
  puede_editar: boolean;
  puede_eliminar: boolean;
};

type PushSubscription = {
  id: string;
  email: string;
  os: string;
  browser: string;
  device_model: string;
  created_at: string;
};

const MODULOS = ['RRHH', 'Mantenimiento', 'SST', 'Vigilancia'];

export default function UsuariosAdminPage() {
  const [activeTab, setActiveTab] = useState<'permisos' | 'dispositivos'>('permisos');
  
  // Data States
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [dispositivos, setDispositivos] = useState<PushSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [empleadoPermisos, setEmpleadoPermisos] = useState<Permisos[]>([]);
  const [savingPermisos, setSavingPermisos] = useState(false);

  useEffect(() => {
    if (activeTab === 'permisos') {
      fetchEmpleados();
    } else {
      fetchDispositivos();
    }
  }, [activeTab]);

  const fetchEmpleados = async () => {
    try {
      setLoading(true);
      // Intentamos cargar de public.empleados
      const { data, error } = await supabase.from('empleados').select('*').limit(50);
      
      if (error) {
        if (error.code === '42P01') {
          // Si no existe, mockeamos para pruebas
          setEmpleados([
            { id: 'uuid-1', nombres: 'Juan', apellidos: 'Pérez', email: 'juan@dicar.com', puesto: 'Supervisor SST' },
            { id: 'uuid-2', nombres: 'María', apellidos: 'López', email: 'maria@dicar.com', puesto: 'RRHH' },
            { id: 'uuid-3', nombres: 'Carlos', apellidos: 'Ruiz', email: 'carlos@dicar.com', puesto: 'Mantenimiento' },
          ]);
        } else {
          throw error;
        }
      } else {
        setEmpleados(data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  };

  const fetchDispositivos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('push_subscriptions').select('*').order('created_at', { ascending: false });
      if (error) {
        if (error.code !== '42P01') throw error;
        setDispositivos([]);
      } else {
        setDispositivos(data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar dispositivos");
    } finally {
      setLoading(false);
    }
  };

  const loadPermisos = async (empleado: Empleado) => {
    setSelectedEmpleado(empleado);
    const emailToUse = empleado.email || `${empleado.id}@mock.com`;
    
    try {
      const { data, error } = await supabase
        .from('usuario_accesos')
        .select('*')
        .eq('user_email', emailToUse);
        
      if (error && error.code !== '42P01') throw error;
      
      // Mapear los existentes o crear default para los modulos
      const currentPermisos = data || [];
      const mapped = MODULOS.map(mod => {
        const p = currentPermisos.find(x => x.modulo === mod);
        return p ? p : {
          modulo: mod,
          puede_ver: false,
          puede_crear: false,
          puede_editar: false,
          puede_eliminar: false
        };
      });
      setEmpleadoPermisos(mapped);
    } catch (err) {
      console.error(err);
      // Fallback si la tabla aún no se ha creado
      setEmpleadoPermisos(MODULOS.map(mod => ({
          modulo: mod,
          puede_ver: false,
          puede_crear: false,
          puede_editar: false,
          puede_eliminar: false
      })));
    }
  };

  const togglePermiso = (modulo: string, campo: keyof Permisos) => {
    setEmpleadoPermisos(prev => prev.map(p => {
      if (p.modulo === modulo) {
        return { ...p, [campo]: !p[campo] };
      }
      return p;
    }));
  };

  const savePermisos = async () => {
    if (!selectedEmpleado) return;
    const emailToUse = selectedEmpleado.email || `${selectedEmpleado.id}@mock.com`;
    
    setSavingPermisos(true);
    try {
      // Upsert
      for (const p of empleadoPermisos) {
        await supabase.from('usuario_accesos').upsert({
          user_email: emailToUse,
          modulo: p.modulo,
          puede_ver: p.puede_ver,
          puede_crear: p.puede_crear,
          puede_editar: p.puede_editar,
          puede_eliminar: p.puede_eliminar
        }, { onConflict: 'user_email, modulo' });
      }
      toast.success("Permisos guardados correctamente");
      setSelectedEmpleado(null);
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar, asegúrate de ejecutar el script SQL de permisos.");
    } finally {
      setSavingPermisos(false);
    }
  };

  const revocarDispositivo = async (id: string) => {
    try {
      await supabase.from('push_subscriptions').delete().eq('id', id);
      toast.success("Acceso al dispositivo revocado");
      fetchDispositivos();
    } catch (err) {
      toast.error("Error al revocar");
    }
  };

  const filteredEmpleados = empleados.filter(e => {
    const nombreCompleto = `${e.nombres || ''} ${e.apellidos || ''}`;
    const email = e.email || '';
    return nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) || 
           email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            Gestión de Usuarios
          </h1>
          <p className="text-slate-500 mt-2">Administración de permisos de acceso y dispositivos conectados.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('permisos')}
          className={clsx(
            "px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'permisos' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Users className="w-4 h-4" />
          Permisos de Acceso
        </button>
        <button
          onClick={() => setActiveTab('dispositivos')}
          className={clsx(
            "px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'dispositivos' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <MonitorSmartphone className="w-4 h-4" />
          Dispositivos y Notificaciones
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm min-h-[400px]">
        {activeTab === 'permisos' && (
          <div className="p-4 sm:p-6">
            <div className="mb-6 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar empleado..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmpleados.map(emp => (
                <div 
                  key={emp.id} 
                  onClick={() => loadPermisos(emp)}
                  className="p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all bg-white flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg group-hover:bg-indigo-100 transition-colors">
                    {(emp.nombres || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{emp.nombres} {emp.apellidos}</h3>
                    <p className="text-xs text-slate-500">{emp.puesto || 'Sin puesto'}</p>
                    <p className="text-xs text-slate-400 truncate w-40">{emp.email || 'Sin correo'}</p>
                  </div>
                </div>
              ))}
              {filteredEmpleados.length === 0 && !loading && (
                <div className="col-span-full py-10 text-center text-slate-500">
                  No se encontraron empleados.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'dispositivos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Usuario (Correo)</th>
                  <th className="px-6 py-4 font-semibold">Sistema Operativo</th>
                  <th className="px-6 py-4 font-semibold">Navegador</th>
                  <th className="px-6 py-4 font-semibold">Dispositivo / Modelo</th>
                  <th className="px-6 py-4 font-semibold">Fecha de Activación</th>
                  <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dispositivos.map((disp) => (
                  <tr key={disp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{disp.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        {disp.os || 'Desconocido'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{disp.browser || 'Desconocido'}</td>
                    <td className="px-6 py-4 truncate max-w-[200px]" title={disp.device_model || ''}>
                      {disp.device_model || 'Desconocido'}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(disp.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => revocarDispositivo(disp.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Revocar acceso (Eliminar)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {dispositivos.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Smartphone className="w-8 h-8 text-slate-300" />
                        <p>No hay dispositivos registrados con notificaciones activas.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Permisos */}
      <AnimatePresence>
        {selectedEmpleado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEmpleado(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xl">
                    {(selectedEmpleado.nombres || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedEmpleado.nombres} {selectedEmpleado.apellidos}</h2>
                    <p className="text-sm text-slate-500">Asignación de privilegios de acceso</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmpleado(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="overflow-hidden border border-slate-200 rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Módulo</th>
                        <th className="px-4 py-3 font-semibold text-center">Ver (Leer)</th>
                        <th className="px-4 py-3 font-semibold text-center">Añadir (Crear)</th>
                        <th className="px-4 py-3 font-semibold text-center">Editar (Actualizar)</th>
                        <th className="px-4 py-3 font-semibold text-center">Eliminar (Borrar)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {empleadoPermisos.map((permiso) => (
                        <tr key={permiso.modulo} className="hover:bg-slate-50/30">
                          <td className="px-4 py-3 font-medium text-slate-900">{permiso.modulo}</td>
                          {['puede_ver', 'puede_crear', 'puede_editar', 'puede_eliminar'].map((campo) => (
                            <td key={campo} className="px-4 py-3 text-center">
                              <button
                                onClick={() => togglePermiso(permiso.modulo, campo as keyof Permisos)}
                                className={clsx(
                                  "w-6 h-6 rounded-md border flex items-center justify-center mx-auto transition-colors",
                                  permiso[campo as keyof Permisos] 
                                    ? "bg-indigo-600 border-indigo-600 text-white" 
                                    : "bg-white border-slate-300 text-transparent hover:border-indigo-400"
                                )}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedEmpleado(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={savePermisos}
                  disabled={savingPermisos}
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                >
                  {savingPermisos ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
