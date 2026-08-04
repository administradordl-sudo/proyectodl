"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Users, Search, ChevronDown, ChevronUp, X, Upload, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import clsx from "clsx";
import Select from "@/components/ui/Select";

const formatDateLocal = (dateString?: string | null) => {
  if (!dateString) return '-';
  const parts = dateString.split('T')[0].split('-');
  if (parts.length !== 3) return '-';
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

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
  status?: string;
  fecha_inicio_contrato?: string;
  fecha_fin_contrato?: string;
  estado_civil?: string;
  correo_personal?: string;
  entidad_bancaria?: string;
  tipo_cuenta?: string;
  fecha_cese?: string;
};

const initialForm = {
  nombres: "", apellidos: "", dni: "", direccion: "", telefono: "", telefono_corporativo: "",
  email: "", puesto: "", jefe: "", area: "", fecha_ingreso: "", cumpleanos: "", genero: "",
  hijos: "", carrera: "", distrito: "", nro_cta: "", tipo_cta: "", afp: "", cuspp: "",
  vida_ley: "No Entregado", sede: "", status: "Activo", fecha_inicio_contrato: "", 
  fecha_fin_contrato: "", estado_civil: "", correo_personal: "", entidad_bancaria: "", 
  tipo_cuenta: "", fecha_cese: ""
};

export default function EmployeesPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("Activo");
  const [filterArea, setFilterArea] = useState("Todas");
  const [sortBy, setSortBy] = useState("fin_contrato_asc");
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);

  const uniqueAreas = useMemo(() => {
    const hasDesconocida = empleados.some(e => !e.area || e.area.trim() === "");
    const areas = new Set(empleados.map(e => e.area).filter(Boolean));
    const result = Array.from(areas).sort();
    if (hasDesconocida) result.push("Desconocida");
    return result;
  }, [empleados]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      
      const existingDnis = new Set(empleados.map(e => e.dni));
      const excelDnis = new Set();
      const duplicateDnis: string[] = [];
      const importedEmpleados: any[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const getVal = (col: number) => {
          const cell = row.getCell(col);
          if (cell.type === ExcelJS.ValueType.Date) {
             const date = cell.value as Date;
             return date.toISOString().split('T')[0];
          }
          
          let strVal = cell.value?.toString().trim() || '';
          
          // Convert DD/MM/YYYY strings to YYYY-MM-DD for DB
          if (strVal.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const [day, month, year] = strVal.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          
          return strVal;
        };

        const getDateVal = (col: number) => {
          const val = getVal(col);
          if (!val || val === '-' || val.toUpperCase() === 'N/A' || val.toUpperCase() === 'NA') return null;
          return val;
        };

        const rawStatus = getVal(1);
        let finalStatus = "Activo";
        if (rawStatus.toLowerCase().includes('cesad')) finalStatus = "Cesado";
        else if (rawStatus.toLowerCase().includes('licencia')) finalStatus = "Licencia";
        else if (rawStatus.trim() !== '') {
          finalStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
        }

        const empleado: any = {
          status: finalStatus,
          fecha_ingreso: getDateVal(2),
          dni: getVal(3),
          apellidos: getVal(4),
          nombres: getVal(5),
          puesto: getVal(6),
          jefe: getVal(7),
          area: getVal(8),
          fecha_inicio_contrato: getDateVal(9),
          fecha_fin_contrato: getDateVal(10),
          cumpleanos: getDateVal(11),
          estado_civil: getVal(12),
          genero: getVal(13), // sexo
          hijos: getVal(14),
          telefono: getVal(15), // celular
          telefono_corporativo: getVal(16),
          email: getVal(17), // correo corporativo
          correo_personal: getVal(18),
          carrera: getVal(19), // carrera profesional
          direccion: getVal(20), // direccion de domicilio
          distrito: getVal(21),
          entidad_bancaria: getVal(22),
          nro_cta: getVal(23), // nro de cta o cci
          tipo_cuenta: getVal(24), // tipo de cuenta
          afp: getVal(25),
          cuspp: getVal(26),
          vida_ley: getVal(27).toLowerCase() === 'verdadero' || getVal(27).toLowerCase() === 'true' ? 'Entregado' : 'No Entregado',
          sede: getVal(28)
        };
        
        // Remove empty fields to avoid sending empty strings for dates
        if (!empleado.fecha_ingreso) delete empleado.fecha_ingreso;
        if (!empleado.fecha_inicio_contrato) delete empleado.fecha_inicio_contrato;
        if (!empleado.fecha_fin_contrato) delete empleado.fecha_fin_contrato;
        if (!empleado.cumpleanos) delete empleado.cumpleanos;

        // Ensure DNI and Nombres are present
        if (empleado.dni && empleado.nombres) {
          if (existingDnis.has(empleado.dni) || excelDnis.has(empleado.dni)) {
             duplicateDnis.push(empleado.dni);
          } else {
             excelDnis.add(empleado.dni);
             importedEmpleados.push(empleado);
          }
        }
      });

      if (duplicateDnis.length > 0) {
        alert(`Se omitieron ${duplicateDnis.length} registros por DNI duplicado: ${duplicateDnis.join(", ")}`);
      }

      if (importedEmpleados.length === 0) {
        alert("No se encontraron registros nuevos válidos para importar.");
        return;
      }

      const { error } = await supabase.from('empleados').insert(importedEmpleados);
      
      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      alert(`Se importaron ${importedEmpleados.length} empleados correctamente.`);
      
    } catch (error) {
      console.error("Error importando excel:", error);
      alert("Hubo un error al importar el archivo Excel.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Plantilla Empleados');

      worksheet.columns = [
        { header: 'Status (Activo/Cesado/Licencia)', width: 25 },
        { header: 'Fecha de Ingreso (DD/MM/YYYY)', width: 25 },
        { header: 'DNI', width: 15 },
        { header: 'Apellidos', width: 30 },
        { header: 'Nombres', width: 30 },
        { header: 'Puesto', width: 25 },
        { header: 'Jefe Directo', width: 25 },
        { header: 'Área', width: 20 },
        { header: 'Inicio Contrato (DD/MM/YYYY)', width: 25 },
        { header: 'Fin Contrato (DD/MM/YYYY)', width: 25 },
        { header: 'Cumpleaños (DD/MM/YYYY)', width: 25 },
        { header: 'Estado Civil', width: 15 },
        { header: 'Género (Masculino/Femenino)', width: 25 },
        { header: 'Hijos', width: 10 },
        { header: 'Teléfono Personal', width: 20 },
        { header: 'Teléfono Corporativo', width: 20 },
        { header: 'Email Corporativo', width: 30 },
        { header: 'Correo Personal', width: 30 },
        { header: 'Carrera Profesional', width: 25 },
        { header: 'Dirección', width: 40 },
        { header: 'Distrito', width: 20 },
        { header: 'Entidad Bancaria', width: 20 },
        { header: 'Nro de Cuenta / CCI', width: 25 },
        { header: 'Tipo de Cuenta', width: 20 },
        { header: 'AFP / ONP', width: 20 },
        { header: 'CUSPP', width: 20 },
        { header: 'Vida Ley (Verdadero/Falso)', width: 25 },
        { header: 'Sede', width: 20 }
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Plantilla_Empleados.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar plantilla", error);
      alert("Hubo un error al generar la plantilla.");
    }
  };

  const [sedesOptions, setSedesOptions] = useState<{value: string, label: string}[]>([]);
  const [bancosOptions, setBancosOptions] = useState<{value: string, label: string}[]>([]);

  // Estados para modales de añadir opciones
  const [addOptionModal, setAddOptionModal] = useState<{ type: 'sede' | 'banco' | null, title: string }>({ type: null, title: '' });
  const [newOptionValue, setNewOptionValue] = useState("");
  const [isAddingOptionLoading, setIsAddingOptionLoading] = useState(false);

  const handleAddOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionValue.trim()) return;
    
    setIsAddingOptionLoading(true);
    const newValue = newOptionValue.trim();
    
    try {
      if (addOptionModal.type === 'sede') {
        const { error } = await supabase.from('config_sedes').insert([{ nombre: newValue }]);
        if (error && error.code !== '23505') throw error; // Ignorar si ya existe
        setSedesOptions(prev => {
          if (prev.find(o => o.value === newValue)) return prev;
          return [...prev, { value: newValue, label: newValue }];
        });
        setFormData(prev => ({ ...prev, sede: newValue }));
      } else if (addOptionModal.type === 'banco') {
        const { error } = await supabase.from('config_bancos').insert([{ nombre: newValue }]);
        if (error && error.code !== '23505') throw error; // Ignorar si ya existe
        setBancosOptions(prev => {
          if (prev.find(o => o.value === newValue)) return prev;
          return [...prev, { value: newValue, label: newValue }];
        });
        setFormData(prev => ({ ...prev, entidad_bancaria: newValue }));
      }
      setAddOptionModal({ type: null, title: '' });
      setNewOptionValue("");
    } catch (error) {
      console.error("Error al añadir opción:", error);
      alert("Hubo un error al añadir la opción.");
    } finally {
      setIsAddingOptionLoading(false);
    }
  };

  const handleDeleteOption = async (type: 'sede' | 'banco', value: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${value}"?`)) return;
    
    try {
      if (type === 'sede') {
        const { error } = await supabase.from('config_sedes').delete().eq('nombre', value);
        if (error) throw error;
        setSedesOptions(prev => prev.filter(o => o.value !== value));
      } else {
        const { error } = await supabase.from('config_bancos').delete().eq('nombre', value);
        if (error) throw error;
        setBancosOptions(prev => prev.filter(o => o.value !== value));
      }
    } catch (error) {
      console.error("Error al eliminar opción:", error);
      alert("Hubo un error al eliminar la opción. Quizás esté en uso.");
    }
  };

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
    fetchOptions();
    
    const channel = supabase
      .channel('realtime-employees')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'empleados' }, (payload) => {
        setEmpleados(prev => {
          if (prev.find(e => e.id === payload.new.id)) return prev;
          return [payload.new as Empleado, ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'empleados' }, (payload) => {
        setEmpleados(prev => prev.map(e => e.id === payload.new.id ? payload.new as Empleado : e));
        setSelectedEmpleado(prev => prev?.id === payload.new.id ? payload.new as Empleado : prev);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'empleados' }, (payload) => {
        setEmpleados(prev => prev.filter(e => e.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOptions = async () => {
    try {
      const [sedesRes, bancosRes] = await Promise.all([
        supabase.from('config_sedes').select('nombre').order('nombre'),
        supabase.from('config_bancos').select('nombre').order('nombre')
      ]);
      
      if (sedesRes.data) {
        setSedesOptions(sedesRes.data.map(s => ({ value: s.nombre, label: s.nombre })));
      }
      if (bancosRes.data) {
        setBancosOptions(bancosRes.data.map(b => ({ value: b.nombre, label: b.nombre })));
      }
    } catch (error) {
      console.error("Error fetching options", error);
    }
  };

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
    
    if (!editingId && empleados.some(emp => emp.dni === formData.dni)) {
      alert("El DNI ingresado ya se encuentra registrado.");
      return;
    } else if (editingId && empleados.some(emp => emp.dni === formData.dni && emp.id !== editingId)) {
      alert("El DNI ingresado ya se encuentra registrado por otro empleado.");
      return;
    }

    setIsSubmitting(true);
    try {
      const dataToSubmit = { ...formData };
      
      // Clean empty strings for date fields to prevent Supabase errors
      if (!dataToSubmit.fecha_ingreso) delete (dataToSubmit as any).fecha_ingreso;
      if (!dataToSubmit.cumpleanos) delete (dataToSubmit as any).cumpleanos;
      if (!dataToSubmit.fecha_inicio_contrato) delete (dataToSubmit as any).fecha_inicio_contrato;
      if (!dataToSubmit.fecha_fin_contrato) delete (dataToSubmit as any).fecha_fin_contrato;
      
      if (formData.status !== 'Cesado') {
        (dataToSubmit as any).fecha_cese = null;
      } else if (!dataToSubmit.fecha_cese) {
        delete (dataToSubmit as any).fecha_cese;
      }

      if (editingId) {
        const { error } = await supabase.from("empleados").update(dataToSubmit).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("empleados").insert([dataToSubmit]);
        if (error) throw error;
      }
      
      setEditingId(null);
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

  const filteredEmpleados = useMemo(() => {
    let result = empleados.filter(e => 
      `${e.nombres} ${e.apellidos} ${e.dni}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterStatus !== "Todos") {
      result = result.filter(e => (e.status || "Activo") === filterStatus);
    }

    if (filterArea !== "Todas") {
      if (filterArea === "Desconocida") {
        result = result.filter(e => !e.area || e.area.trim() === "");
      } else {
        result = result.filter(e => e.area === filterArea);
      }
    }

    result.sort((a, b) => {
      const timeA = a.fecha_fin_contrato ? new Date(a.fecha_fin_contrato).getTime() : 0;
      const timeB = b.fecha_fin_contrato ? new Date(b.fecha_fin_contrato).getTime() : 0;
      const timeInicioA = a.fecha_inicio_contrato ? new Date(a.fecha_inicio_contrato).getTime() : 0;
      const timeInicioB = b.fecha_inicio_contrato ? new Date(b.fecha_inicio_contrato).getTime() : 0;

      if (sortBy === "fin_contrato_asc") {
        if (!a.fecha_fin_contrato) return 1;
        if (!b.fecha_fin_contrato) return -1;
        return timeA - timeB;
      }
      if (sortBy === "fin_contrato_desc") {
        if (!a.fecha_fin_contrato) return 1;
        if (!b.fecha_fin_contrato) return -1;
        return timeB - timeA;
      }
      if (sortBy === "inicio_contrato_asc") {
        if (!a.fecha_inicio_contrato) return 1;
        if (!b.fecha_inicio_contrato) return -1;
        return timeInicioA - timeInicioB;
      }
      if (sortBy === "inicio_contrato_desc") {
        if (!a.fecha_inicio_contrato) return 1;
        if (!b.fecha_inicio_contrato) return -1;
        return timeInicioB - timeInicioA;
      }
      return 0; 
    });

    return result;
  }, [empleados, searchTerm, filterStatus, filterArea, sortBy]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Directorio de Empleados</h1>
          <p className="text-gray-500 mt-2">Gestiona el personal, contratos y datos corporativos.</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button
            onClick={handleDownloadTemplate}
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap text-sm h-10"
          >
            <Download className="w-4 h-4" />
            Descargar Plantilla
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap text-sm h-10 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? "Importando..." : "Cargar Excel"}
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData(initialForm);
              setIsAdding(!isAdding);
            }}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap text-sm h-10"
          >
            <Plus className="w-4 h-4" />
            Nuevo Empleado
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20, height: 0, overflow: "hidden" }}
            animate={{ opacity: 1, y: 0, height: 'auto', transitionEnd: { overflow: "visible" } }}
            exit={{ opacity: 0, y: -20, height: 0, overflow: "hidden" }}
            className="w-full"
          >
            <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 relative">
              <button 
                type="button" 
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setFormData(initialForm);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-2"
              >
                Cerrar
              </button>
              
              <h2 className="text-xl font-bold text-gray-800 mb-6">{editingId ? "Editar Empleado" : "Registrar Nuevo Empleado"}</h2>
              
              <form onSubmit={handleAdd} className="space-y-6">
                
                {/* 1. Datos Personales */}
                <div className="border border-gray-200 rounded-xl">
                  <button type="button" onClick={() => toggleSection('personales')} className={`w-full px-4 py-3 bg-gray-50 flex justify-between items-center text-sm font-semibold text-gray-700 transition-colors ${expandedSections.personales ? 'border-b border-gray-200 rounded-t-xl' : 'rounded-xl'}`}>
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
                        <Select 
                          name="genero" 
                          value={formData.genero} 
                          onChange={handleChange} 
                          options={[
                            { value: "Masculino", label: "Masculino" },
                            { value: "Femenino", label: "Femenino" }
                          ]}
                          placeholder="Seleccionar..."
                          triggerClassName="w-full px-3 py-2 border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 bg-white" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Estado Civil</label>
                        <Select 
                          name="estado_civil" 
                          value={formData.estado_civil} 
                          onChange={handleChange} 
                          options={[
                            { value: "Soltero(a)", label: "Soltero(a)" },
                            { value: "Casado(a)", label: "Casado(a)" },
                            { value: "Divorciado(a)", label: "Divorciado(a)" },
                            { value: "Viudo(a)", label: "Viudo(a)" },
                            { value: "Conviviente", label: "Conviviente" }
                          ]}
                          placeholder="Seleccionar..."
                          triggerClassName="w-full px-3 py-2 border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 bg-white" 
                        />
                      </div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Hijos</label><input placeholder="Cantidad o Si/No" name="hijos" value={formData.hijos || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Correo Personal</label><input type="email" name="correo_personal" value={formData.correo_personal || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Teléfono Personal</label><input name="telefono" value={formData.telefono || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label><input name="direccion" value={formData.direccion || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Distrito</label><input name="distrito" value={formData.distrito || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div className="sm:col-span-3"><label className="block text-xs font-medium text-gray-600 mb-1">Carrera / Formación</label><input name="carrera" value={formData.carrera || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                    </div>
                  )}
                </div>

                {/* 2. Datos Corporativos */}
                <div className="border border-gray-200 rounded-xl">
                  <button type="button" onClick={() => toggleSection('corporativos')} className={`w-full px-4 py-3 bg-gray-50 flex justify-between items-center text-sm font-semibold text-gray-700 transition-colors ${expandedSections.corporativos ? 'border-b border-gray-200 rounded-t-xl' : 'rounded-xl'}`}>
                    2. Datos Corporativos
                    {expandedSections.corporativos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSections.corporativos && (
                    <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status *</label>
                        <Select 
                          name="status" 
                          value={formData.status} 
                          onChange={handleChange} 
                          options={[
                            { value: "Activo", label: "Activo" },
                            { value: "Cesado", label: "Cesado" },
                            { value: "Licencia", label: "Licencia" }
                          ]}
                          triggerClassName="w-full px-3 py-2 border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 bg-white" 
                        />
                      </div>
                      {formData.status === "Cesado" && (
                        <div className="animate-in fade-in duration-200">
                          <label className="block text-xs font-bold text-red-600 mb-1">Fecha de Cese *</label>
                          <input 
                            required={formData.status === "Cesado"}
                            type="date" 
                            name="fecha_cese" 
                            value={formData.fecha_cese || ""} 
                            onChange={handleChange} 
                            className="w-full px-3 py-2 border border-red-300 rounded-md text-sm focus:ring-1 focus:ring-red-500 bg-red-50 text-red-900" 
                          />
                        </div>
                      )}
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Email (Corp)</label><input type="email" name="email" value={formData.email || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Teléfono Corp.</label><input name="telefono_corporativo" value={formData.telefono_corporativo || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Ingreso *</label><input required type="date" name="fecha_ingreso" value={formData.fecha_ingreso || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Inicio de Contrato</label><input type="date" name="fecha_inicio_contrato" value={formData.fecha_inicio_contrato || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Fin de Contrato</label><input type="date" name="fecha_fin_contrato" value={formData.fecha_fin_contrato || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Puesto *</label><input required name="puesto" value={formData.puesto || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Área *</label><input required name="area" value={formData.area || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Sede *</label>
                        <Select 
                          required 
                          name="sede" 
                          value={formData.sede} 
                          onChange={handleChange} 
                          options={sedesOptions}
                          placeholder="Seleccionar..."
                          triggerClassName="w-full px-3 py-2 border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 bg-white" 
                          actionLabel="Añadir Sede"
                          onActionClick={() => {
                            setAddOptionModal({ type: 'sede', title: 'Añadir Nueva Sede' });
                            setNewOptionValue('');
                          }}
                          onOptionDelete={(val) => handleDeleteOption('sede', val)}
                        />
                      </div>
                      <div className="sm:col-span-3"><label className="block text-xs font-medium text-gray-600 mb-1">Jefe Directo</label><input name="jefe" value={formData.jefe || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                    </div>
                  )}
                </div>

                {/* 3. Bancarios y Seguros */}
                <div className="border border-gray-200 rounded-xl">
                  <button type="button" onClick={() => toggleSection('seguros')} className={`w-full px-4 py-3 bg-gray-50 flex justify-between items-center text-sm font-semibold text-gray-700 transition-colors ${expandedSections.seguros ? 'border-b border-gray-200 rounded-t-xl' : 'rounded-xl'}`}>
                    3. Bancos y Seguros
                    {expandedSections.seguros ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSections.seguros && (
                    <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Entidad Bancaria</label>
                        <Select 
                          name="entidad_bancaria" 
                          value={formData.entidad_bancaria} 
                          onChange={handleChange} 
                          options={bancosOptions}
                          placeholder="Seleccionar..."
                          triggerClassName="w-full px-3 py-2 border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 bg-white" 
                          actionLabel="Añadir Banco"
                          onActionClick={() => {
                            setAddOptionModal({ type: 'banco', title: 'Añadir Nuevo Banco' });
                            setNewOptionValue('');
                          }}
                          onOptionDelete={(val) => handleDeleteOption('banco', val)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Cuenta</label>
                        <Select 
                          name="tipo_cuenta" 
                          value={formData.tipo_cuenta} 
                          onChange={handleChange} 
                          options={[
                            { value: "Ahorros", label: "Ahorros" },
                            { value: "Sueldo", label: "Sueldo" },
                            { value: "Corriente", label: "Corriente" }
                          ]}
                          placeholder="Seleccionar..."
                          triggerClassName="w-full px-3 py-2 border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 bg-white" 
                        />
                      </div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Nro Cuenta o CCI</label><input name="nro_cta" value={formData.nro_cta || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">AFP / ONP</label><input placeholder="Ej. Integra, Prima, ONP..." name="afp" value={formData.afp || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">CUSPP</label><input name="cuspp" value={formData.cuspp || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" /></div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Vida Ley</label>
                        <Select 
                          name="vida_ley" 
                          value={formData.vida_ley} 
                          onChange={handleChange} 
                          options={[
                            { value: "No Entregado", label: "No Entregado" },
                            { value: "Entregado", label: "Entregado" }
                          ]}
                          triggerClassName="w-full px-3 py-2 border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 bg-white" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 gap-3">
                  <button type="button" onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setFormData(initialForm);
                  }} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-50">
                    {isSubmitting ? "Guardando..." : (editingId ? "Actualizar Empleado" : "Guardar Empleado")}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal para añadir nueva Sede/Banco */}
      <AnimatePresence>
        {addOptionModal.type && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                <h3 className="font-semibold text-gray-800">{addOptionModal.title}</h3>
                <button onClick={() => setAddOptionModal({ type: null, title: '' })} className="text-gray-400 hover:text-gray-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddOptionSubmit} className="p-5">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newOptionValue}
                    onChange={(e) => setNewOptionValue(e.target.value)}
                    placeholder={`Ej. ${addOptionModal.type === 'sede' ? 'Planta Sur' : 'Scotiabank'}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setAddOptionModal({ type: null, title: '' })} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isAddingOptionLoading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {isAddingOptionLoading ? "Guardando..." : "Añadir y Seleccionar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 flex-1 w-full bg-white px-3 py-2 rounded-lg border border-gray-200 focus-within:ring-1 focus-within:ring-blue-500 transition-shadow">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar por nombre, apellido o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm w-full"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Todos">Todos (Estado)</option>
              <option value="Activo">Activos</option>
              <option value="Cesado">Cesados</option>
              <option value="Licencia">Licencia</option>
            </select>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Todas">Todas (Áreas)</option>
              {uniqueAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="fin_contrato_asc">Próximos a vencer</option>
              <option value="fin_contrato_desc">Vencimiento lejano</option>
              <option value="inicio_contrato_desc">Recientes (Inicio)</option>
              <option value="inicio_contrato_asc">Antiguos (Inicio)</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[700px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Empleado</th>
                <th className="px-4 py-3 font-medium text-gray-500">DNI</th>
                <th className="px-4 py-3 font-medium text-gray-500">Puesto / Área</th>
                <th className="px-4 py-3 font-medium text-gray-500">Fin de Contrato</th>
                <th className="px-4 py-3 font-medium text-gray-500">Sede</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Cargando directorio...</td>
                </tr>
              ) : filteredEmpleados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center flex flex-col items-center justify-center text-gray-400 gap-2">
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
                        <div className="text-xs text-gray-500">Ingreso: {formatDateLocal(empleado.fecha_ingreso)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 text-xs">{empleado.dni}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800">{empleado.puesto}</div>
                      <div className="text-xs text-gray-500">{empleado.area}</div>
                    </td>
                    <td className="px-4 py-3">
                      {empleado.fecha_fin_contrato ? (
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {formatDateLocal(empleado.fecha_fin_contrato)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
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
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Estado Civil</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.estado_civil || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Cumpleaños</dt><dd className="col-span-2 text-gray-900">{formatDateLocal(selectedEmpleado.cumpleanos)}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Hijos</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.hijos || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Teléfono</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.telefono || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Correo Personal</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.correo_personal || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Dirección</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.direccion || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Distrito</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.distrito || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Carrera</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.carrera || '-'}</dd></div>
                    </dl>
                  </div>
                  
                  {/* Datos Corporativos */}
                  <div>
                    <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Datos Corporativos</h4>
                    <dl className="space-y-3 text-sm">
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Status</dt><dd className="col-span-2 font-medium text-gray-900">{selectedEmpleado.status || 'Activo'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Sede</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.sede}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Área</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.area}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Puesto</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.puesto}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Jefe</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.jefe || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Ingreso</dt><dd className="col-span-2 text-gray-900">{formatDateLocal(selectedEmpleado.fecha_ingreso)}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Inicio Contrato</dt><dd className="col-span-2 text-gray-900">{formatDateLocal(selectedEmpleado.fecha_inicio_contrato)}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Fin Contrato</dt><dd className="col-span-2 text-gray-900">{formatDateLocal(selectedEmpleado.fecha_fin_contrato)}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Email</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.email || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Tel. Corp</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.telefono_corporativo || '-'}</dd></div>
                    </dl>
                  </div>

                  {/* Bancos y Seguros */}
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Bancos y Seguros</h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-sm">
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Cuenta</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.nro_cta || '-'} ({selectedEmpleado.tipo_cuenta || selectedEmpleado.tipo_cta || '-'})</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Entidad Bancaria</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.entidad_bancaria || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">AFP/ONP</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.afp || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">CUSPP</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.cuspp || '-'}</dd></div>
                      <div className="grid grid-cols-3"><dt className="text-gray-500">Vida Ley</dt><dd className="col-span-2 text-gray-900">{selectedEmpleado.vida_ley || '-'}</dd></div>
                    </dl>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => {
                    handleDelete(selectedEmpleado.id);
                    setSelectedEmpleado(null);
                  }}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors border border-transparent hover:border-red-100"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => {
                    setFormData({
                      nombres: selectedEmpleado.nombres || "",
                      apellidos: selectedEmpleado.apellidos || "",
                      dni: selectedEmpleado.dni || "",
                      direccion: selectedEmpleado.direccion || "",
                      telefono: selectedEmpleado.telefono || "",
                      telefono_corporativo: selectedEmpleado.telefono_corporativo || "",
                      email: selectedEmpleado.email || "",
                      puesto: selectedEmpleado.puesto || "",
                      jefe: selectedEmpleado.jefe || "",
                      area: selectedEmpleado.area || "",
                      fecha_ingreso: selectedEmpleado.fecha_ingreso || "",
                      cumpleanos: selectedEmpleado.cumpleanos || "",
                      genero: selectedEmpleado.genero || "",
                      hijos: selectedEmpleado.hijos || "",
                      carrera: selectedEmpleado.carrera || "",
                      distrito: selectedEmpleado.distrito || "",
                      nro_cta: selectedEmpleado.nro_cta || "",
                      tipo_cta: selectedEmpleado.tipo_cta || "",
                      afp: selectedEmpleado.afp || "",
                      cuspp: selectedEmpleado.cuspp || "",
                      vida_ley: selectedEmpleado.vida_ley || "No Entregado",
                      sede: selectedEmpleado.sede || "",
                      status: selectedEmpleado.status || "Activo",
                      fecha_inicio_contrato: selectedEmpleado.fecha_inicio_contrato || "",
                      fecha_fin_contrato: selectedEmpleado.fecha_fin_contrato || "",
                      estado_civil: selectedEmpleado.estado_civil || "",
                      correo_personal: selectedEmpleado.correo_personal || "",
                      entidad_bancaria: selectedEmpleado.entidad_bancaria || "",
                      tipo_cuenta: selectedEmpleado.tipo_cuenta || ""
                    });
                    setEditingId(selectedEmpleado.id);
                    setSelectedEmpleado(null);
                    setIsAdding(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
                >
                  Editar Empleado
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
