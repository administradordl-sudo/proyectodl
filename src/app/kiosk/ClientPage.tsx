"use client";

import { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { createClient } from '@supabase/supabase-js';
import { toast, Toaster } from 'sonner';
import { LogOut, X, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function KioskPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
  const [recognizedEmployee, setRecognizedEmployee] = useState<{ id: string; label: string; distance: number } | null>(null);
  const [isProcessingMark, setIsProcessingMark] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Asistencia del día para habilitar/deshabilitar botones
  const [employeeAttendance, setEmployeeAttendance] = useState<any>(null);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);

  // Modal de PIN
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Cargar modelos y descriptores
  useEffect(() => {
    const init = async () => {
      try {
        toast.info('Cargando sistema biométrico...');
        
        // 1. Cargar Modelos
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setIsModelsLoaded(true);

        // 2. Obtener Descriptores de la BD
        const { data: biometriaData, error } = await supabase
          .from('empleado_biometria')
          .select('empleado_id, face_descriptor, empleados(nombres, apellidos)');

        if (error) throw error;

        if (biometriaData && biometriaData.length > 0) {
          const labeledDescriptors = biometriaData.map((record: any) => {
            const arr = Array.isArray(record.face_descriptor) 
              ? record.face_descriptor 
              : JSON.parse(record.face_descriptor);
            const float32Array = new Float32Array(arr);
            const label = `${record.empleado_id}|${record.empleados?.nombres} ${record.empleados?.apellidos}`;
            return new faceapi.LabeledFaceDescriptors(label, [float32Array]);
          });

          // Usamos una distancia máxima de 0.55 para evitar falsos rechazos por cambios de luz
          const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.55);
          setFaceMatcher(matcher);
          toast.success('Sistema listo para marcar');
        } else {
          toast.warning('No hay empleados registrados con biometría aún.');
        }

        startCamera();

      } catch (err) {
        console.error("Error al iniciar Kiosco", err);
        toast.error("Error al inicializar Kiosco. Verifica la consola.");
      }
    };

    init();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err) {
      console.error("Error accessing camera", err);
      toast.error("Error accediendo a la cámara del Kiosco");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Temporizador de inactividad (20 segundos)
  useEffect(() => {
    if (!isCameraActive || recognizedEmployee) return;

    const timer = setTimeout(() => {
      stopCamera();
      toast.info("Cámara suspendida por inactividad", { duration: 2000 });
    }, 20000);

    return () => clearTimeout(timer);
  }, [isCameraActive, recognizedEmployee, stream]);

  // Loop de detección
  useEffect(() => {
    if (!isModelsLoaded || !faceMatcher || cooldown) return;

    const detectInterval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      const detection = await faceapi.detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        // Encontrar coincidencia
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        
        if (bestMatch.label !== 'unknown') {
          const [id, nombre] = bestMatch.label.split('|');
          setRecognizedEmployee({ id, label: nombre, distance: bestMatch.distance });
          setCooldown(true); // Pausar detecciones mientras decide
        }
      }
    }, 1000); // 1 FPS para no saturar

    return () => clearInterval(detectInterval);
  }, [isModelsLoaded, faceMatcher, cooldown]);

  // Cargar estado de asistencia del empleado reconocido
  useEffect(() => {
    if (!recognizedEmployee) {
      setEmployeeAttendance(null);
      return;
    }

    const fetchAttendance = async () => {
      setIsFetchingAttendance(true);
      try {
        const todayLocal = new Date();
        // Ajuste horario básico local (AAAA-MM-DD)
        const tzOffset = todayLocal.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(todayLocal.getTime() - tzOffset)).toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('asistencias')
          .select('*')
          .eq('empleado_id', recognizedEmployee.id)
          .eq('fecha', localISOTime)
          .maybeSingle();
        
        setEmployeeAttendance(data || {});
      } catch (err) {
        console.error("Error obteniendo asistencia", err);
        setEmployeeAttendance({});
      } finally {
        setIsFetchingAttendance(false);
      }
    };

    fetchAttendance();
  }, [recognizedEmployee]);

  const handleMark = async (tipo_marca: string) => {
    if (!recognizedEmployee) return;
    setIsProcessingMark(true);

    try {
      const res = await fetch('/api/tareo/mark-biometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleado_id: recognizedEmployee.id,
          tipo_marca
        })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Error al marcar');
      } else {
        toast.success(data.message || 'Marca registrada con éxito');
      }
    } catch (err) {
      toast.error('Error de red al marcar asistencia');
    } finally {
      setIsProcessingMark(false);
      setRecognizedEmployee(null);
      // Mantener el cooldown unos segundos para que la persona se retire
      setTimeout(() => setCooldown(false), 4000); 
    }
  };

  const handleExitKiosk = () => {
    setPinInput('');
    setShowPinModal(true);
  };

  const verifyPin = async () => {
    if (pinInput.length < 4) return;
    setIsVerifyingPin(true);
    try {
      toast.info("Verificando autorización...", { id: 'pin-toast' });
      const res = await fetch('/api/config/kiosk-pin');
      const data = await res.json();
      
      if (data.pin === pinInput) {
        toast.success("Autorizado", { id: 'pin-toast' });
        stopCamera();
        router.push('/');
      } else {
        toast.error("PIN incorrecto. Acceso denegado.", { id: 'pin-toast' });
        setPinInput('');
      }
    } catch (err) {
      toast.error("Error al verificar el PIN.", { id: 'pin-toast' });
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Logica de botones
  const hasIngreso = !!employeeAttendance?.hora_ingreso;
  const hasInicioRef = !!employeeAttendance?.hora_inicio_refrigerio;
  const hasFinRef = !!employeeAttendance?.hora_fin_refrigerio;
  const hasSalida = !!employeeAttendance?.hora_salida;

  const canIngreso = !hasIngreso;
  const canInicioRef = hasIngreso && !hasInicioRef && !hasSalida;
  const canFinRef = hasInicioRef && !hasFinRef && !hasSalida;
  const canSalida = hasIngreso && !hasSalida && (!hasInicioRef || hasFinRef);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-gray-900 to-black flex flex-col items-center justify-between p-4 md:p-8">
      {/* Decorative background blur */}
      <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <Toaster position="top-center" richColors />
      
      <div className="text-center mt-2 mb-4 z-10 shrink-0">
        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 tracking-tight mb-1 drop-shadow-lg">
          MARCADOR BIOMÉTRICO
        </h1>
        <p className="text-gray-400 text-sm md:text-base font-medium">Acerque su rostro a la cámara para registrar su asistencia</p>
      </div>

      <div className="relative rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-gray-700/50 bg-black w-full max-w-5xl flex-1 flex items-center justify-center z-10 backdrop-blur-sm">
        {!isModelsLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/80">
            <div className="text-white flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Iniciando sistema...</p>
            </div>
          </div>
        )}

        {!isCameraActive && isModelsLoaded && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-900/95 cursor-pointer transition-all hover:bg-gray-800/95"
            onClick={startCamera}
          >
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.6)] animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-white text-3xl font-black tracking-tight mb-2">Cámara Suspendida</h2>
            <p className="text-gray-400 text-lg">Toca la pantalla para activar y marcar asistencia</p>
          </div>
        )}
        
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline
          className={`w-full h-full object-cover ${recognizedEmployee ? 'blur-md scale-110 brightness-50 transition-all duration-500' : ''}`}
        />

        {/* Overlay de Reconocimiento y Botones */}
        {recognizedEmployee && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-in fade-in zoom-in duration-300 p-4">
            
            <div className="bg-gray-900/90 backdrop-blur-2xl p-8 rounded-[2rem] shadow-2xl border border-gray-700/50 text-center w-full max-w-lg">
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)] rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-10 h-10 text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">¡Hola, {recognizedEmployee.label}!</h2>
              <p className="text-gray-400 mb-8 text-sm">Selecciona el tipo de marca que deseas registrar</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button 
                  onClick={() => handleMark('ingreso')}
                  disabled={isProcessingMark || isFetchingAttendance || !canIngreso}
                  className="relative group bg-blue-950/40 border border-blue-500/30 hover:border-blue-400 text-blue-400 font-bold py-4 rounded-2xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95 disabled:opacity-50 disabled:grayscale overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10">{isFetchingAttendance ? '...' : 'Ingreso'}</span>
                </button>
                <button 
                  onClick={() => handleMark('inicio_refrigerio')}
                  disabled={isProcessingMark || isFetchingAttendance || !canInicioRef}
                  className="relative group bg-orange-950/40 border border-orange-500/30 hover:border-orange-400 text-orange-400 font-bold py-4 rounded-2xl transition-all shadow-[0_0_15px_rgba(249,115,22,0.1)] hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] active:scale-95 disabled:opacity-50 disabled:grayscale overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10">{isFetchingAttendance ? '...' : 'Inicio Refrigerio'}</span>
                </button>
                <button 
                  onClick={() => handleMark('fin_refrigerio')}
                  disabled={isProcessingMark || isFetchingAttendance || !canFinRef}
                  className="relative group bg-teal-950/40 border border-teal-500/30 hover:border-teal-400 text-teal-400 font-bold py-4 rounded-2xl transition-all shadow-[0_0_15px_rgba(20,184,166,0.1)] hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] active:scale-95 disabled:opacity-50 disabled:grayscale overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/10 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10">{isFetchingAttendance ? '...' : 'Fin Refrigerio'}</span>
                </button>
                <button 
                  onClick={() => handleMark('fin_turno')}
                  disabled={isProcessingMark || isFetchingAttendance || !canSalida}
                  className="relative group bg-red-950/40 border border-red-500/30 hover:border-red-400 text-red-400 font-bold py-4 rounded-2xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95 disabled:opacity-50 disabled:grayscale overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10">{isFetchingAttendance ? '...' : 'Fin de Turno'}</span>
                </button>
              </div>

              <button 
                onClick={() => {
                  setRecognizedEmployee(null);
                  setTimeout(() => setCooldown(false), 1000);
                  stopCamera();
                  startCamera();
                }}
                disabled={isProcessingMark}
                className="text-gray-500 hover:text-gray-300 font-medium text-sm w-full py-2 disabled:opacity-50 transition-colors"
              >
                Cancelar (No soy yo)
              </button>
            </div>

          </div>
        )}
      </div>
      
      <div className="mt-4 mb-2 flex flex-col items-center gap-3 text-gray-500 text-sm z-10 shrink-0">
        <p className="tracking-widest opacity-60 text-xs">AUTO_TAREO KIOSK MODE</p>
        <button 
          onClick={handleExitKiosk}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-full transition-all border border-gray-600/50 hover:border-gray-500 hover:text-white backdrop-blur-md shadow-lg"
        >
          <Lock className="w-4 h-4" />
          <span>Administración</span>
        </button>
      </div>

      {/* Modal de PIN Customizado */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-gray-800 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                <LogOut className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Autorización</h3>
              <p className="text-gray-400 text-sm">Ingresa el PIN maestro para salir del Kiosco</p>
            </div>

            {/* Indicadores de PIN */}
            <div className="mb-8 flex justify-center gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    pinInput.length > i 
                      ? 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] scale-110' 
                      : 'bg-gray-800 border border-gray-700'
                  }`} 
                />
              ))}
            </div>

            {/* Teclado Numérico */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button 
                  key={num}
                  onClick={() => setPinInput(prev => (prev.length < 4 ? prev + num : prev))}
                  className="h-16 bg-gray-800/80 hover:bg-gray-700 text-white text-2xl font-medium rounded-2xl transition-all active:scale-95 border border-gray-700/50 hover:border-gray-600"
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => setShowPinModal(false)}
                className="h-16 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold rounded-2xl transition-all active:scale-95 border border-red-500/20"
              >
                Cancelar
              </button>
              <button 
                onClick={() => setPinInput(prev => (prev.length < 4 ? prev + 0 : prev))}
                className="h-16 bg-gray-800/80 hover:bg-gray-700 text-white text-2xl font-medium rounded-2xl transition-all active:scale-95 border border-gray-700/50 hover:border-gray-600"
              >
                0
              </button>
              <button 
                onClick={() => setPinInput(prev => prev.slice(0, -1))}
                className="h-16 bg-gray-800/80 hover:bg-gray-700 text-gray-400 flex items-center justify-center rounded-2xl transition-all active:scale-95 border border-gray-700/50 hover:border-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <button 
              onClick={verifyPin}
              disabled={pinInput.length < 4 || isVerifyingPin}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95"
            >
              {isVerifyingPin ? 'Verificando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
