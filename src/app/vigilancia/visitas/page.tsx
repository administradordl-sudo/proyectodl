"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UserCheck, Search, FileText, Building2, User, Clock, Calendar, CheckCircle, Download } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface Visita {
  id: string;
  dni: string;
  nombres_apellidos: string;
  empresa: string;
  motivo_visita: string;
  persona_visitada: string;
  firmo_acuerdo: boolean;
  version_acuerdo: string | null;
  created_at: string;
}

interface AcuerdoVersion {
  version: string;
  descripcion: string;
  archivo_url?: string | null;
}

export default function RegistroVisitasPage() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [versionActiva, setVersionActiva] = useState<AcuerdoVersion | null>(null);
  
  // Estado para saber si el acuerdo ya fue firmado en el histórico
  const [acuerdoPrevioFirmado, setAcuerdoPrevioFirmado] = useState(false);
  
  const [formData, setFormData] = useState({
    dni: "",
    nombres_apellidos: "",
    empresa: "",
    motivo_visita: "",
    persona_visitada: "",
    firmo_acuerdo: false,
  });

  const [fechaActual, setFechaActual] = useState("");
  const [horaActual, setHoraActual] = useState("");
  
  useEffect(() => {
    fetchVersionActiva();
    fetchVisitas();
    
    // Actualizar reloj cada segundo
    const updateTime = () => {
      const now = new Date();
      setFechaActual(now.toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }));
      setHoraActual(now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchVersionActiva = async () => {
    try {
      const { data, error } = await supabase
        .from("sst_acuerdos_versiones")
        .select("version, descripcion, archivo_url")
        .eq("activa", true)
        .limit(1);
        
      if (error) throw error;
      if (data && data.length > 0) {
        setVersionActiva(data[0]);
      } else {
        // Fallback si no hay versión en DB
        setVersionActiva({ version: "1.0", descripcion: "Versión base" });
      }
    } catch (error) {
      console.error("Error fetching versión activa:", error);
      setVersionActiva({ version: "1.0", descripcion: "Versión base (Fallback)" });
    }
  };

  const fetchVisitas = async () => {
    try {
      setLoading(true);
      // Obtener historial completo de visitas
      const { data, error } = await supabase
        .from("registro_visitas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVisitas(data || []);
    } catch (error) {
      console.error("Error fetching visitas:", error);
    } finally {
      setLoading(false);
    }
  };

  const buscarHistorialDNI = async (dni: string) => {
    if (dni.length < 8) return;
    
    try {
      setSearching(true);
      setAcuerdoPrevioFirmado(false);
      
      const { data, error } = await supabase
        .from("registro_visitas")
        .select("nombres_apellidos, empresa, version_acuerdo")
        .eq("dni", dni)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const lastVisit = data[0];
        
        // Verificar si la última visita usó la versión actual del acuerdo
        const hasSignedCurrent = versionActiva && lastVisit.version_acuerdo === versionActiva.version;
        
        setFormData(prev => ({
          ...prev,
          nombres_apellidos: lastVisit.nombres_apellidos,
          empresa: lastVisit.empresa || "",
          firmo_acuerdo: !!hasSignedCurrent // Si ya firmó, marcamos como true
        }));
        
        setAcuerdoPrevioFirmado(!!hasSignedCurrent);
      }
    } catch (error) {
      console.error("Error buscando DNI:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      if (name === "dni") {
        setAcuerdoPrevioFirmado(false); // Resetear status si cambia el DNI
        if (value.length === 8) {
          buscarHistorialDNI(value);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firmo_acuerdo) {
      alert("El visitante debe firmar el acuerdo actual para poder ingresar.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("registro_visitas")
        .insert([{
          dni: formData.dni,
          nombres_apellidos: formData.nombres_apellidos,
          empresa: formData.empresa,
          motivo_visita: formData.motivo_visita,
          persona_visitada: formData.persona_visitada,
          firmo_acuerdo: true,
          version_acuerdo: versionActiva?.version // Guardamos qué versión firmó
        }]);

      if (error) throw error;
      
      // Limpiar formulario y recargar lista
      setFormData({
        dni: "",
        nombres_apellidos: "",
        empresa: "",
        motivo_visita: "",
        persona_visitada: "",
        firmo_acuerdo: false,
      });
      setAcuerdoPrevioFirmado(false);
      fetchVisitas();
      alert("Visita registrada correctamente");
      
    } catch (error) {
      console.error("Error al registrar visita:", error);
      alert("Ocurrió un error al guardar el registro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-2 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <UserCheck className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            Registro de Visitas
          </h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base">
            Control de accesos y validación automática de acuerdos de seguridad (v{versionActiva?.version || "..."}).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Nueva Visita</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              
              {/* Reloj Inalterable dentro del formulario */}
              <div className="flex gap-2 mb-1">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                    Fecha de Ingreso
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={fechaActual}
                      className="block w-full pl-8 pr-2 py-1.5 text-sm border-slate-200 rounded-lg bg-slate-50 text-slate-600 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                    Hora de Ingreso
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={horaActual}
                      className="block w-full pl-8 pr-2 py-1.5 text-sm border-slate-200 rounded-lg bg-slate-50 text-slate-600 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    DNI
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      {searching ? (
                        <div className="animate-spin h-3.5 w-3.5 border-2 border-amber-500 border-t-transparent rounded-full" />
                      ) : (
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </div>
                    <input
                      type="text"
                      name="dni"
                      required
                      maxLength={8}
                      pattern="[0-9]{8}"
                      value={formData.dni}
                      onChange={handleChange}
                      className="block w-full pl-8 pr-2 py-1.5 sm:text-sm border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 shadow-sm border"
                      placeholder="8 dígitos"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nombres
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="nombres_apellidos"
                      required
                      value={formData.nombres_apellidos}
                      onChange={handleChange}
                      className="block w-full pl-8 pr-2 py-1.5 sm:text-sm border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 shadow-sm border"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Empresa <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="empresa"
                      value={formData.empresa}
                      onChange={handleChange}
                      className="block w-full pl-8 pr-2 py-1.5 sm:text-sm border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 shadow-sm border"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    A quien visita
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="persona_visitada"
                      required
                      value={formData.persona_visitada}
                      onChange={handleChange}
                      className="block w-full pl-8 pr-2 py-1.5 sm:text-sm border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 shadow-sm border"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Motivo de Visita
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 pt-2 pointer-events-none">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <textarea
                    name="motivo_visita"
                    required
                    rows={2}
                    value={formData.motivo_visita}
                    onChange={handleChange}
                    className="block w-full pl-8 pr-2 py-1.5 sm:text-sm border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 shadow-sm border"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                {acuerdoPrevioFirmado ? (
                  <div className="flex flex-col gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="ml-3 text-sm text-green-800">
                        <span className="font-semibold block">Acuerdo v{versionActiva?.version} vigente</span>
                        Este visitante ya firmó la versión actual del acuerdo en una visita anterior. No requiere nueva firma.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="firmo_acuerdo"
                          name="firmo_acuerdo"
                          type="checkbox"
                          required
                          checked={formData.firmo_acuerdo}
                          onChange={handleChange}
                          className="h-5 w-5 text-amber-600 focus:ring-amber-500 border-slate-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="firmo_acuerdo" className="font-medium text-slate-900 cursor-pointer">
                          Firmó Acuerdo de Seguridad (v{versionActiva?.version})
                        </label>
                        <p className="text-slate-500 text-xs mt-0.5">Requisito para ingresar.</p>
                      </div>
                    </div>
                    
                    {versionActiva?.archivo_url && (
                      <div className="ml-8">
                        <a 
                          href={versionActiva.archivo_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Ver / Descargar Acuerdo
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-50"
                >
                  {loading ? "Registrando..." : "Registrar Visita"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Lista Histórica de Visitas */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col"
          >
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Historial de Visitas</h2>
              <span className="bg-slate-200 text-slate-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {visitas.length}
              </span>
            </div>
            
            <div className="p-0 overflow-x-auto flex-1 max-h-[500px] xl:max-h-[700px]">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Visitante
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Detalles
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Acuerdo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {visitas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-sm">
                        {loading ? "Cargando historial..." : "No hay visitas registradas."}
                      </td>
                    </tr>
                  ) : (
                    visitas.map((visita) => (
                      <tr key={visita.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                              <span className="text-amber-700 font-bold text-sm">
                                {visita.nombres_apellidos.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-slate-900">
                                {visita.nombres_apellidos}
                              </div>
                              <div className="text-sm text-slate-500">
                                DNI: {visita.dni}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">{visita.persona_visitada}</div>
                          <div className="text-sm text-slate-500 line-clamp-1">{visita.empresa || "Particular"} • {visita.motivo_visita}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {new Date(visita.created_at).toLocaleDateString('es-PE')}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(visita.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {visita.firmo_acuerdo ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Firmado (v{visita.version_acuerdo || "1.0"})
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
