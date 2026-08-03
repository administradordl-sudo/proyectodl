'use client';

import React, { useState } from 'react';
import { createTicket } from '../actions';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Select from '@/components/ui/Select';

export default function TicketForm() {
  const router = useRouter();
  const [categoria, setCategoria] = useState('');
  const [prioridad, setPrioridad] = useState('Media');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('mantenimiento_evidencias')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('mantenimiento_evidencias')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      let evidenciaUrl = null;
      if (file) {
        evidenciaUrl = await uploadFile(file);
        if (!evidenciaUrl) {
          throw new Error('Hubo un problema subiendo la evidencia fotográfica.');
        }
      }

      const formData = new FormData(e.currentTarget);
      const result = await createTicket(formData, evidenciaUrl);

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: 'Ticket de mantenimiento creado exitosamente.' });
        (e.target as HTMLFormElement).reset();
        setCategoria('');
        setPrioridad('Media');
        setFile(null);
        setTimeout(() => {
          router.push('/mantenimiento');
        }, 1500);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error desconocido' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 max-w-2xl w-full mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/mantenimiento" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">Nuevo Ticket de Mantenimiento</h2>
      </div>
      
      {message && (
        <div className={`p-4 mb-6 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">Título del Problema *</label>
          <input
            type="text"
            id="titulo"
            name="titulo"
            required
            placeholder="Ej. Fuga de agua en almacén principal"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">Descripción Detallada *</label>
          <textarea
            id="descripcion"
            name="descripcion"
            required
            rows={4}
            placeholder="Describe el problema con el mayor detalle posible..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <Select
              name="categoria"
              required
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Selecciona una categoría"
              options={[
                { value: 'Infraestructura', label: 'Infraestructura' },
                { value: 'Reparaciones', label: 'Reparaciones' },
                { value: 'Mantenimiento General', label: 'Mantenimiento General' },
                { value: 'Mantenimiento Preventivo', label: 'Mantenimiento Preventivo' },
                { value: 'Mantenimiento de Unidades', label: 'Mantenimiento de Unidades' }
              ]}
              triggerClassName="px-4 py-2 border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="prioridad" className="block text-sm font-medium text-gray-700 mb-1">Prioridad *</label>
            <Select
              name="prioridad"
              required
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              options={[
                { value: 'Baja', label: 'Baja' },
                { value: 'Media', label: 'Media' },
                { value: 'Alta', label: 'Alta' },
                { value: 'Emergencia', label: 'Emergencia' }
              ]}
              triggerClassName="px-4 py-2 border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ubicacion" className="block text-sm font-medium text-gray-700 mb-1">Ubicación / Sede *</label>
          <input
            type="text"
            id="ubicacion"
            name="ubicacion"
            required
            placeholder="Ej. Almacén Norte, Zona de Carga"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>

        {categoria === 'Mantenimiento de Unidades' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <label htmlFor="placa_vehiculo" className="block text-sm font-medium text-gray-700 mb-1">Placa del Vehículo / Unidad *</label>
            <input
              type="text"
              id="placa_vehiculo"
              name="placa_vehiculo"
              required
              placeholder="Ej. ABC-123"
              className="w-full px-4 py-2 border border-blue-300 bg-blue-50 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
          </div>
        )}

        <div>
          <label htmlFor="evidencia" className="block text-sm font-medium text-gray-700 mb-1">Evidencia Fotográfica (Opcional)</label>
          <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${file ? 'border-green-300 bg-green-50' : 'border-gray-300 border-dashed'} rounded-md hover:bg-gray-50 transition-colors`}>
            <div className="space-y-1 text-center">
              {file ? (
                <div className="text-sm text-green-700 font-medium flex flex-col items-center">
                  <svg className="mx-auto h-8 w-8 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Archivo seleccionado: {file.name}
                  <button type="button" onClick={() => setFile(null)} className="mt-2 text-xs text-red-500 hover:text-red-700 underline">Quitar archivo</button>
                </div>
              ) : (
                <>
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="evidencia" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Sube un archivo</span>
                      <input id="evidencia" name="evidencia" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                    </label>
                    <p className="pl-1">o arrastra y suelta</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 5MB</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Enviando Ticket...
              </>
            ) : (
              'Crear Ticket de Mantenimiento'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
