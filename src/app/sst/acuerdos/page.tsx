"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { BookOpen, Plus, CheckCircle, Clock, Upload, File } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface AcuerdoVersion {
  id: string;
  version: string;
  descripcion: string;
  activa: boolean;
  archivo_url: string | null;
  created_at: string;
}

export default function AcuerdosPage() {
  const [versiones, setVersiones] = useState<AcuerdoVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    version: "",
    descripcion: "",
  });

  useEffect(() => {
    fetchVersiones();
  }, []);

  const fetchVersiones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sst_acuerdos_versiones")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVersiones(data || []);
    } catch (error) {
      console.error("Error fetching versiones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Debes adjuntar el documento Word o PDF del acuerdo.");
      return;
    }

    try {
      setSubmitting(true);
      
      // 1. Subir archivo a Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `acuerdo_v${formData.version}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('acuerdos_seguridad')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('acuerdos_seguridad')
        .getPublicUrl(fileName);
        
      const archivo_url = publicUrlData.publicUrl;

      // 2. Desactivar todas las versiones actuales
      await supabase
        .from("sst_acuerdos_versiones")
        .update({ activa: false })
        .eq("activa", true);
        
      // 3. Crear nueva versión y establecerla como activa
      const { error } = await supabase
        .from("sst_acuerdos_versiones")
        .insert([{
          version: formData.version,
          descripcion: formData.descripcion,
          archivo_url: archivo_url,
          activa: true
        }]);

      if (error) throw error;
      
      // Reset form
      setFormData({ version: "", descripcion: "" });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      fetchVersiones();
      alert("Nueva versión creada exitosamente.");
    } catch (error) {
      console.error("Error creando versión:", error);
      alert("Ocurrió un error al crear la nueva versión.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetActive = async (id: string) => {
    if (!window.confirm("¿Estás seguro de establecer esta versión como la activa para todas las nuevas visitas?")) {
      return;
    }
    
    try {
      setLoading(true);
      await supabase
        .from("sst_acuerdos_versiones")
        .update({ activa: false })
        .eq("activa", true);
        
      const { error } = await supabase
        .from("sst_acuerdos_versiones")
        .update({ activa: true })
        .eq("id", id);
        
      if (error) throw error;
      fetchVersiones();
    } catch (error) {
      console.error("Error activando versión:", error);
      alert("Ocurrió un error al cambiar la versión activa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            Gestión de Acuerdos de Seguridad
          </h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base">
            Control de las versiones del documento que firman los visitantes para ingresar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="md:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-slate-800">Nueva Versión</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Número/Nombre de Versión
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1.0, 2.1-Covid, etc."
                  value={formData.version}
                  onChange={(e) => setFormData({...formData, version: e.target.value})}
                  className="block w-full px-3 py-2 sm:text-sm border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 shadow-sm border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Documento (Word o PDF)
                </label>
                <div 
                  className={clsx(
                    "mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                    file ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-emerald-400 hover:bg-slate-50"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="space-y-1 text-center">
                    {file ? (
                      <div className="flex flex-col items-center">
                        <File className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                        <span className="text-sm text-emerald-700 font-medium break-all px-2">{file.name}</span>
                        <span className="text-xs text-emerald-500 mt-1">Clic para cambiar</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                        <div className="flex text-sm text-slate-600 justify-center">
                          <span className="relative rounded-md font-medium text-emerald-600 hover:text-emerald-500">
                            Subir archivo
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">DOCX, DOC, PDF hasta 10MB</p>
                      </>
                    )}
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      ref={fileInputRef}
                      className="sr-only"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción / Cambios Principales
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="¿Qué cambia en esta versión?"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="block w-full px-3 py-2 sm:text-sm border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 shadow-sm border"
                />
              </div>
              
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {submitting ? "Subiendo y Creando..." : "Crear y Activar Versión"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Lista de Versiones */}
        <div className="md:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col"
          >
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Historial de Versiones</h2>
            </div>
            
            <div className="p-0 overflow-x-auto flex-1">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Versión
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Fecha / Archivo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {loading && versiones.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-sm">
                        Cargando versiones...
                      </td>
                    </tr>
                  ) : versiones.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-sm">
                        No hay versiones registradas.
                      </td>
                    </tr>
                  ) : (
                    versiones.map((v) => (
                      <tr key={v.id} className={clsx("transition-colors", v.activa ? "bg-emerald-50/30" : "hover:bg-slate-50")}>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-slate-900">v{v.version}</div>
                          </div>
                          <div className="text-sm text-slate-500 mt-1 line-clamp-1 max-w-[200px]" title={v.descripcion}>
                            {v.descripcion}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5 text-sm text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-slate-400" />
                              {new Date(v.created_at).toLocaleDateString('es-PE')}
                            </div>
                            {v.archivo_url && (
                              <a 
                                href={v.archivo_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 text-xs font-medium"
                              >
                                <File className="w-3.5 h-3.5" />
                                Ver Documento
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {v.activa ? (
                            <span className="px-2.5 py-1 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Activa (Actual)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Inactiva
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {!v.activa && (
                            <button
                              onClick={() => handleSetActive(v.id)}
                              className="text-emerald-600 hover:text-emerald-900 hover:underline transition-colors"
                            >
                              Fijar como Activa
                            </button>
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
