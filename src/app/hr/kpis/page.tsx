"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, AlertCircle, TrendingUp, Clock, AlertTriangle, Building2, Users } from "lucide-react";
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

export default function KpisPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<KpiData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Por favor, sube un archivo Excel válido (.xlsx o .xls)");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const processKpis = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setData(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/kpis/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Error al procesar el archivo");
      }

      const resultData = await response.json();
      setData(resultData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setData(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de KPIs</h1>
          <p className="text-gray-500 mt-2">Analiza el rendimiento de asistencia a partir de los reportes biométricos.</p>
        </div>
        {data && (
          <button
            onClick={reset}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Subir nuevo archivo
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!data ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
          >
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "relative group flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
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
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-700">Arrastra tu Excel aquí para analizar KPIs</p>
                      <p className="text-sm text-gray-400 mt-1">Soporta archivos .xlsx con marcaciones</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setError(null);
                      }}
                      className="text-sm text-red-500 hover:text-red-700 hover:underline"
                    >
                      Quitar archivo
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 text-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                disabled={!file || isProcessing}
                onClick={processKpis}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analizando Datos...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    Generar KPIs
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : (
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
      </AnimatePresence>
    </div>
  );
}
