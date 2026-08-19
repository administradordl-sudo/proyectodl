"use client";

import { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function BiometriaAdminPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [kioskPin, setKioskPin] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  useEffect(() => {
    // Cargar empleados
    const fetchEmpleados = async () => {
      const { data } = await supabase.from('empleados').select('id, nombres, apellidos').order('apellidos');
      if (data) setEmpleados(data);
    };
    fetchEmpleados();

    // Cargar modelos
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setIsModelsLoaded(true);
      } catch (err) {
        console.error("Error loading models", err);
        toast.error("Error cargando modelos de IA. Revisa si están en /models");
      }
    };
    loadModels();
    
    // Cargar PIN
    const fetchPin = async () => {
      try {
        const res = await fetch('/api/config/kiosk-pin');
        const data = await res.json();
        if (data.pin) setKioskPin(data.pin);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPin();

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    }
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startCamera = async () => {
    if (!selectedEmpleadoId) {
      toast.error('Selecciona un empleado primero');
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
    } catch (err) {
      console.error("Error accessing camera", err);
      toast.error("Error accediendo a la cámara");
    }
  };

  const captureFace = async () => {
    if (!videoRef.current || !isModelsLoaded) return;
    
    setIsCapturing(true);
    toast.info("Analizando rostro...");
    
    try {
      const detection = await faceapi.detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error('No se detectó un rostro claro. Intenta de nuevo.');
        setIsCapturing(false);
        return;
      }

      // Convertir Float32Array a Array normal para JSON
      const descriptorArray = Array.from(detection.descriptor);

      const res = await fetch('/api/empleados/biometria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleado_id: selectedEmpleadoId,
          face_descriptor: descriptorArray
        })
      });

      if (!res.ok) throw new Error("Error en el servidor");
      
      toast.success('Rostro registrado exitosamente');
      
      // Apagar cámara
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setSelectedEmpleadoId('');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar el rostro');
    } finally {
      setIsCapturing(false);
    }
  };

  const savePin = async () => {
    if (!kioskPin || kioskPin.length < 4) {
      toast.error('El PIN debe tener al menos 4 caracteres');
      return;
    }
    setIsSavingPin(true);
    try {
      const res = await fetch('/api/config/kiosk-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_salida: kioskPin })
      });
      if (!res.ok) throw new Error();
      toast.success('PIN guardado correctamente');
    } catch (err) {
      toast.error('Error al guardar el PIN');
    } finally {
      setIsSavingPin(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Enrolamiento Biométrico</h1>
      
      {!isModelsLoaded && (
        <div className="mb-4 p-4 bg-yellow-100 text-yellow-800 rounded-lg">
          Cargando modelos de Inteligencia Artificial...
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Empleado</label>
        <select 
          className="w-full p-3 border border-gray-300 rounded-lg mb-4"
          value={selectedEmpleadoId}
          onChange={(e) => setSelectedEmpleadoId(e.target.value)}
          disabled={stream !== null}
        >
          <option value="">-- Seleccione --</option>
          {empleados.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.apellidos}, {emp.nombres}</option>
          ))}
        </select>

        {!stream ? (
          <button 
            onClick={startCamera}
            disabled={!isModelsLoaded || !selectedEmpleadoId}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
          >
            Iniciar Cámara
          </button>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative rounded-lg overflow-hidden border-4 border-gray-800 mb-4 bg-black">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className="w-full max-w-lg"
              />
              <div className="absolute top-4 left-0 right-0 text-center text-white font-semibold bg-black/50 py-1">
                Ubica el rostro frente a la cámara
              </div>
            </div>
            
            <div className="flex gap-4 w-full max-w-lg">
              <button 
                onClick={captureFace}
                disabled={isCapturing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {isCapturing ? 'Procesando...' : 'Capturar y Guardar'}
              </button>
              <button 
                onClick={() => {
                  stream.getTracks().forEach(track => track.stop());
                  setStream(null);
                }}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Configuración del Kiosco</h2>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">PIN de Salida (Modo Kiosco)</label>
          <div className="flex gap-2">
            <input 
              type="password" 
              value={kioskPin}
              onChange={(e) => setKioskPin(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-lg"
              placeholder="Ej. 1234"
            />
            <button 
              onClick={savePin}
              disabled={isSavingPin}
              className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
            >
              Guardar
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Este código se solicitará para cerrar el modo pantalla completa.
          </p>
        </div>
      </div>
    </div>
  );
}
