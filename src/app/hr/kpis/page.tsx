"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, FileSpreadsheet, Loader2, AlertCircle, TrendingUp, Clock, AlertTriangle, Building2, Users, Database, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

type KpiData = {
  topTardanzas: any[];
  topFaltas: any[];
  topHorasExtra: any[];
  topAreasFaltas: any[];
  topAreasTardanzas: any[];
  diasFaltas: any[];
  resumen: {
    totalFaltas: number;
    totalTardanzasHoras: number;
    totalExtrasHoras: number;
  };
};

type PreviewData = {
  count: number;
  faltasPreview: { nombre: string, fecha: string }[];
  tardanzasPreview: { nombre: string, fecha: string, minutos: number, hora_ingreso: string }[];
  asistenciasToUpsert: any[];
};

export default function KpisPage() {
  const [data, setData] = useState<KpiData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  // Uploader state
  const [showUploader, setShowUploader] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Preview & Upload state
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch("/api/kpis/stats");
      if (response.ok) {
        const resultData = await response.json();
        setData(resultData);
      }
    } catch (err) {
      console.error("Error fetching stats", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      handleNewFile(droppedFile);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleNewFile(e.target.files[0]);
    }
  };

  const handleNewFile = (newFile: File) => {
    if (newFile.name.endsWith('.xlsx') || newFile.name.endsWith('.xls')) {
      setFile(newFile);
      setUploadError(null);
      setUploadSuccess(null);
      setPreviewData(null);
    } else {
      setUploadError("Por favor, sube un archivo Excel válido (.xlsx o .xls)");
    }
  };

  const previewKpis = async () => {
    if (!file) return;

    setIsPreviewing(true);
    setUploadError(null);
    setUploadSuccess(null);
    setPreviewData(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/kpis/preview", {
        method: "POST",
        body: formData,
      });

      const resultData = await response.json();

      if (!response.ok) {
        throw new Error(resultData.error || "Error al leer el archivo. Verifica el formato.");
      }

      setPreviewData(resultData);
      
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const processKpis = async () => {
    if (!previewData || !previewData.asistenciasToUpsert) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await fetch("/api/kpis/process", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ asistenciasToUpsert: previewData.asistenciasToUpsert }),
      });

      const resultData = await response.json();

      if (!response.ok) {
        throw new Error(resultData.error || "Error al procesar el guardado");
      }

      setUploadSuccess(`¡Éxito! Se guardaron ${resultData.count} registros permanentemente.`);
      setFile(null);
      setPreviewData(null);
      
      // Refresh stats
      await fetchStats();
      
      // Hide uploader after a delay
      setTimeout(() => setShowUploader(false), 3000);
      
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de KPIs</h1>
          <p className="text-gray-500 mt-2">Analiza el rendimiento histórico de asistencia desde la base de datos.</p>
        </div>
        <button
          onClick={() => setShowUploader(!showUploader)}
          className="flex items-center gap-2 text-sm bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Database className="w-4 h-4" />
          {showUploader ? "Ocultar Importador" : "Importar Excel"}
        </button>
      </div>

      <AnimatePresence>
        {showUploader && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
              <div className="mb-4">
                <h3 className="text-lg font-bold">Importador y Previsualizador</h3>
                <p className="text-sm text-gray-500">
                  Sube el reporte de marcaciones. El sistema primero leerá el archivo y te mostrará una vista previa de lo que encontró, 
                  para que puedas confirmar antes de guardar en la Base de Datos.
                </p>
              </div>

              {!previewData && !uploadSuccess && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={clsx(
                    "relative group flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
                    isDragging ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50 hover:bg-gray-50",
                    file ? "bg-primary/5 border-primary/50" : ""
                  )}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx, .xls"
                    className="hidden"
                  />
                  
                  <AnimatePresence mode="wait">
                    {!file ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col items-center text-center space-y-4"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-base font-medium text-gray-700">Arrastra tu Excel aquí para importar</p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="file"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center space-y-4"
                      >
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            setUploadError(null);
                          }}
                          className="text-sm text-red-500 hover:text-red-700 hover:underline"
                        >
                          Quitar archivo
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Preview UI */}
              {previewData && !uploadSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                      <h4 className="text-lg font-bold text-blue-900">Vista Previa de Importación</h4>
                    </div>
                    
                    <p className="text-sm text-blue-800 mb-6">
                      Se han procesado correctamente <strong>{previewData.count} registros de asistencia</strong> del archivo. 
                      A continuación, un resumen de las incidencias detectadas (se descartaron feriados y permisos aprobados).
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Tardanzas List */}
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <h5 className="font-semibold text-gray-900">Tardanzas Detectadas ({previewData.tardanzasPreview.length})</h5>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                          {previewData.tardanzasPreview.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No hay tardanzas en este archivo.</p>
                          ) : (
                            previewData.tardanzasPreview.map((t, i) => (
                              <div key={i} className="text-sm flex justify-between p-2 hover:bg-gray-50 rounded">
                                <div>
                                  <p className="font-medium text-gray-800">{t.nombre}</p>
                                  <p className="text-xs text-gray-500">Fecha: {t.fecha} | Llegó: {t.hora_ingreso}</p>
                                </div>
                                <span className="font-bold text-orange-600">{t.minutos} min</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Faltas List */}
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-red-100">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <h5 className="font-semibold text-gray-900">Faltas Detectadas ({previewData.faltasPreview.length})</h5>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                          {previewData.faltasPreview.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No hay faltas en este archivo.</p>
                          ) : (
                            previewData.faltasPreview.map((f, i) => (
                              <div key={i} className="text-sm p-2 hover:bg-gray-50 rounded">
                                <p className="font-medium text-gray-800">{f.nombre}</p>
                                <p className="text-xs text-gray-500">Fecha: {f.fecha}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {uploadError && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 text-sm"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{uploadError}</p>
                </motion.div>
              )}

              {uploadSuccess && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-3 text-sm"
                >
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <p>{uploadSuccess}</p>
                </motion.div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                {previewData && !uploadSuccess && (
                  <button
                    onClick={() => {
                      setPreviewData(null);
                      setFile(null);
                    }}
                    className="px-6 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                )}

                {!previewData && !uploadSuccess && (
                  <button
                    disabled={!file || isPreviewing}
                    onClick={previewKpis}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPreviewing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Previsualizar Datos
                      </>
                    )}
                  </button>
                )}

                {previewData && !uploadSuccess && (
                  <button
                    disabled={isUploading}
                    onClick={processKpis}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Guardando en BD...
                      </>
                    ) : (
                      <>
                        <Database className="w-5 h-5" />
                        Confirmar y Guardar en BD
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {isLoadingStats && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-gray-500">Cargando métricas desde Supabase...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingStats && data && data.resumen.totalFaltas === 0 && data.resumen.totalTardanzasHoras === 0 && data.resumen.totalExtrasHoras === 0 && (
         <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <Database className="w-10 h-10 text-gray-300" />
           </div>
           <h3 className="text-xl font-bold text-gray-900 mb-2">No hay datos en la base de datos</h3>
           <p className="text-gray-500 mb-6 max-w-md mx-auto">Importa tu reporte Excel de marcaciones utilizando el botón de arriba para comenzar a generar los indicadores históricos.</p>
           <button
             onClick={() => setShowUploader(true)}
             className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
           >
             <Upload className="w-5 h-5" />
             Empezar a importar
           </button>
         </div>
      )}

      {/* Dashboard */}
      {!isLoadingStats && data && (data.resumen.totalFaltas > 0 || data.resumen.totalTardanzasHoras > 0 || data.resumen.totalExtrasHoras > 0) && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* General Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Tardanzas</p>
                <p className="text-3xl font-bold text-gray-900">{data.resumen.totalTardanzasHoras} <span className="text-base font-medium text-gray-400">hrs</span></p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium">Faltas Injustificadas</p>
                <p className="text-3xl font-bold text-gray-900">{data.resumen.totalFaltas} <span className="text-base font-medium text-gray-400">días</span></p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium">Horas Extra Totales</p>
                <p className="text-3xl font-bold text-gray-900">{data.resumen.totalExtrasHoras} <span className="text-base font-medium text-gray-400">hrs</span></p>
              </div>
            </div>
          </div>

          {/* Grids for Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Tardanzas */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-gray-900">Top 5: Personal con Mayor Tardanza</h3>
              </div>
              <div className="space-y-4">
                {data.topTardanzas.length === 0 ? (
                  <p className="text-gray-500 text-sm">No se encontraron tardanzas.</p>
                ) : (
                  data.topTardanzas.map((emp, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-sm font-bold text-gray-400">{i + 1}.</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{emp.nombre}</p>
                          <p className="text-xs text-gray-500">{emp.area} • {emp.sede}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-orange-600">{emp.tardanzasMins} min</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Faltas */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-gray-900">Top 5: Personal con Mayor Falta</h3>
              </div>
              <div className="space-y-4">
                {data.topFaltas.length === 0 ? (
                  <p className="text-gray-500 text-sm">No se encontraron faltas.</p>
                ) : (
                  data.topFaltas.map((emp, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-sm font-bold text-gray-400">{i + 1}.</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{emp.nombre}</p>
                          <p className="text-xs text-gray-500">{emp.area} • {emp.sede}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-red-600">{emp.faltasDias} días</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Areas Faltas */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-bold text-gray-900">Áreas con Mayor Falta</h3>
              </div>
              <div className="space-y-4">
                {data.topAreasFaltas.length === 0 ? (
                  <p className="text-gray-500 text-sm">No se encontraron faltas por área.</p>
                ) : (
                  data.topAreasFaltas.map((area, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-sm font-bold text-gray-400">{i + 1}.</span>
                        <p className="text-sm font-medium text-gray-900">{area.area}</p>
                      </div>
                      <span className="text-sm font-bold text-purple-600">{area.faltas} días</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Areas Tardanzas */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-gray-900">Áreas con Mayor Tardanza</h3>
              </div>
              <div className="space-y-4">
                {data.topAreasTardanzas.length === 0 ? (
                  <p className="text-gray-500 text-sm">No se encontraron tardanzas por área.</p>
                ) : (
                  data.topAreasTardanzas.map((area, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-sm font-bold text-gray-400">{i + 1}.</span>
                        <p className="text-sm font-medium text-gray-900">{area.area}</p>
                      </div>
                      <span className="text-sm font-bold text-indigo-600">{Math.round(area.tardanzas / 60)} hrs</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Dias de mayor recurrencia */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className="w-5 h-5 text-pink-500" />
                <h3 className="text-lg font-bold text-gray-900">Días con Mayor Recurrencia de Faltas</h3>
              </div>
              <div className="space-y-4">
                {data.diasFaltas.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay registros suficientes.</p>
                ) : (
                  data.diasFaltas.map((dia, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <p className="text-sm font-medium text-gray-900 w-24">{dia.dia}</p>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-pink-500 rounded-full" 
                          style={{ width: `${Math.min((dia.count / (data.resumen.totalFaltas || 1)) * 100, 100)}%` }} 
                        />
                      </div>
                      <span className="text-sm font-bold text-pink-600 w-12 text-right">{dia.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Horas Extra */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-bold text-gray-900">Top 5: Personal con Más Horas Extra</h3>
              </div>
              <div className="space-y-4">
                {data.topHorasExtra.length === 0 ? (
                  <p className="text-gray-500 text-sm">No se registraron horas extras.</p>
                ) : (
                  data.topHorasExtra.map((emp, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-sm font-bold text-gray-400">{i + 1}.</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{emp.nombre}</p>
                          <p className="text-xs text-gray-500">{emp.area} • {emp.sede}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-600">{Math.round(emp.horasExtraMins / 60)} hrs</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </div>
  );
}
