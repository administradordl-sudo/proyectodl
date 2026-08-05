'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, Users, User, Briefcase, MapPin, PersonStanding, CheckSquare, Square, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'

type FilterOption = {
  id: string
  label: string
}

export function SendNotificationForm({ moduleName }: { moduleName: string }) {
  const [audience, setAudience] = useState('Todos')
  const [audienceValue, setAudienceValue] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sendPush, setSendPush] = useState(true)
  const [sendEmail, setSendEmail] = useState(true)

  const [areas, setAreas] = useState<string[]>([])
  const [puestos, setPuestos] = useState<string[]>([])
  const [generos, setGeneros] = useState<string[]>([])
  const [personas, setPersonas] = useState<{dni: string, nombre: string}[]>([])
  
  const [isFetching, setIsFetching] = useState(true)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true)
      try {
        const { data, error } = await supabase.from('empleados').select('dni, nombres, apellidos, area, puesto, genero')
        if (error) throw error

        if (data) {
          const uniqueAreas = Array.from(new Set(data.map(e => e.area).filter(Boolean))).sort()
          const uniquePuestos = Array.from(new Set(data.map(e => e.puesto).filter(Boolean))).sort()
          const uniqueGeneros = Array.from(new Set(data.map(e => e.genero).filter(Boolean))).sort()
          
          setAreas(uniqueAreas as string[])
          setPuestos(uniquePuestos as string[])
          setGeneros(uniqueGeneros as string[])
          
          setPersonas(
            data.map(e => ({
              dni: e.dni,
              nombre: `${e.nombres} ${e.apellidos} - DNI: ${e.dni}`
            })).sort((a, b) => a.nombre.localeCompare(b.nombre))
          )
        }
      } catch (error) {
        console.error("Error fetching employee data for form", error)
        toast.error("Error al cargar los filtros de la base de datos")
      } finally {
        setIsFetching(false)
      }
    }

    fetchData()
  }, [])

  // Reset value when audience changes
  useEffect(() => {
    setAudienceValue('')
  }, [audience])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sendPush && !sendEmail) {
      toast.error('Debes seleccionar al menos un medio de notificación (Push o Correo)')
      return
    }

    if (audience !== 'Todos' && !audienceValue) {
      toast.error('Por favor selecciona el destinatario específico')
      return
    }

    if (!title || !message) {
      toast.error('El título y el mensaje son obligatorios')
      return
    }

    setIsSending(true)
    const toastId = toast.loading('Calculando destinatarios y enviando notificaciones...')

    try {
      const res = await fetch('/api/notifications/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience,
          audienceValue,
          title,
          message,
          sendPush,
          sendEmail
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Error desconocido')
      }

      toast.success(
        `Notificaciones enviadas a ${data.matchingEmployees} empleados. (Push: ${data.results.pushesSent}, Emails: ${data.results.emailsSent})`, 
        { id: toastId, duration: 8000 }
      )
      
      setTitle('')
      setMessage('')
      setAudience('Todos')
    } catch (error: any) {
      console.error(error)
      toast.error(`Error: ${error.message}`, { id: toastId })
    } finally {
      setIsSending(false)
    }
  }

  const audienceTypes = [
    { id: 'Todos', label: 'Todos los empleados', icon: Users },
    { id: 'Por Persona', label: 'Persona Específica', icon: User },
    { id: 'Por Puesto', label: 'Por Puesto / Cargo', icon: Briefcase },
    { id: 'Por Área', label: 'Por Área', icon: MapPin },
    { id: 'Por Género', label: 'Por Género', icon: PersonStanding }
  ]

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Enviar Nueva Notificación</h2>
        <p className="text-gray-500 text-sm">
          Este panel permite enviar alertas instantáneas (Push) o Correos Electrónicos a segmentos específicos de empleados.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Paso 1: Filtro */}
        <div className="space-y-4">
          <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">1. ¿A quién deseas enviar?</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {audienceTypes.map(type => {
              const Icon = type.icon
              const isSelected = audience === type.id
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setAudience(type.id)}
                  className={clsx(
                    "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                    isSelected 
                      ? "border-blue-600 bg-blue-50 text-blue-700" 
                      : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <Icon className={clsx("w-6 h-6", isSelected && "animate-bounce")} />
                  <span className="text-xs font-medium text-center">{type.label}</span>
                </button>
              )
            })}
          </div>

          {/* Dinamic Select based on Audience */}
          {audience !== 'Todos' && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
              {isFetching ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 p-3 bg-gray-50 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando opciones...
                </div>
              ) : (
                <select
                  value={audienceValue}
                  onChange={(e) => setAudienceValue(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="">Selecciona {audience.replace('Por ', 'el ')}...</option>
                  
                  {audience === 'Por Área' && areas.map(a => <option key={a} value={a}>{a}</option>)}
                  {audience === 'Por Puesto' && puestos.map(p => <option key={p} value={p}>{p}</option>)}
                  {audience === 'Por Género' && generos.map(g => <option key={g} value={g}>{g}</option>)}
                  {audience === 'Por Persona' && personas.map(p => <option key={p.dni} value={p.dni}>{p.nombre}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Paso 2: Medios */}
        <div className="space-y-4">
          <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">2. Medio de Notificación</label>
          <div className="flex flex-wrap gap-4">
            <label className={clsx(
              "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all w-full sm:w-auto",
              sendPush ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200 text-gray-500"
            )}>
              <input type="checkbox" checked={sendPush} onChange={(e) => setSendPush(e.target.checked)} className="hidden" />
              {sendPush ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
              <div className="flex flex-col">
                <span className={clsx("font-medium", sendPush ? "text-blue-900" : "text-gray-700")}>Notificación Push (App)</span>
                <span className="text-xs">Directo al celular o PC</span>
              </div>
            </label>

            <label className={clsx(
              "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all w-full sm:w-auto",
              sendEmail ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200 text-gray-500"
            )}>
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="hidden" />
              {sendEmail ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-gray-400" />}
              <div className="flex flex-col">
                <span className={clsx("font-medium", sendEmail ? "text-emerald-900" : "text-gray-700")}>Correo Electrónico</span>
                <span className="text-xs">Bandeja de entrada personal/corporativa</span>
              </div>
            </label>
          </div>
        </div>

        {/* Paso 3: Contenido */}
        <div className="space-y-4">
          <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">3. Contenido del Mensaje</label>
          
          <input
            type="text"
            placeholder="Ej. Cambio de Horario Aprobado"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-medium text-lg placeholder:font-normal"
            required
            maxLength={60}
          />

          <textarea
            placeholder="Escribe el detalle del mensaje aquí..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors min-h-[120px] resize-none"
            required
          />
        </div>

        {/* Action Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-200 disabled:opacity-70"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {isSending ? 'Enviando...' : 'Enviar Notificación'}
          </button>
        </div>
      </form>
    </div>
  )
}
