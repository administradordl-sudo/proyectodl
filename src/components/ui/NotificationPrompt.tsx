'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, AlertTriangle } from 'lucide-react'
import { subscribeToPushNotifications, isIOS, isStandalone } from '@/lib/notifications'
import { supabase } from '@/lib/supabase'

export function NotificationPrompt() {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [iosInstructions, setIosInstructions] = useState(false)
  const [emailInput, setEmailInput] = useState('')

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return

    // Check if notifications are supported
    if (!('Notification' in window)) return

    // Check if permission is already granted or denied
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return
    }

    // Check if it's iOS and not standalone
    if (isIOS() && !isStandalone()) {
      setIosInstructions(true)
    }

    // Show modal if not decided yet
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleActivate = async () => {
    try {
      setIsLoading(true)
      const permission = await Notification.requestPermission()
      
      if (permission === 'granted') {
        // Get real user from Supabase auth
        const { data: { session } } = await supabase.auth.getSession()
        const userEmail = session?.user?.email || emailInput
        
        if (!userEmail) {
          throw new Error('Necesitas ingresar un correo para suscribirte')
        }

        await subscribeToPushNotifications(userEmail)
        setIsVisible(false)
      } else {
        setIsVisible(false)
      }
    } catch (error) {
      console.error('Error activating notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -z-10" />
            
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
                <Bell className="w-8 h-8" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900">Activar Notificaciones</h3>
              <p className="text-gray-600">
                Mantente al día con tus aprobaciones, cambios de horario y comunicados importantes, incluso si la app está cerrada.
              </p>

              {iosInstructions && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-2 flex gap-3 text-left">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    Estás usando iOS. Para recibir notificaciones, primero debes tocar el botón de "Compartir" en Safari y seleccionar <strong>"Añadir a la pantalla de inicio"</strong>. Luego abre la app desde allí.
                  </p>
                </div>
              )}

              <div className="w-full mt-2 text-left">
                 <label className="text-sm font-medium text-gray-700 mb-1 block">Tu correo (para pruebas):</label>
                 <input 
                   type="email" 
                   value={emailInput}
                   onChange={e => setEmailInput(e.target.value)}
                   placeholder="ejemplo@empresa.com"
                   className="w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                 />
                 <p className="text-xs text-gray-400 mt-1">Si ya iniciaste sesión, no es necesario llenar esto.</p>
              </div>

              <div className="w-full flex gap-3 mt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 px-4 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors"
                >
                  Más tarde
                </button>
                {!iosInstructions && (
                  <button
                    onClick={handleActivate}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {isLoading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Permitir'
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
