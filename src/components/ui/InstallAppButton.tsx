'use client'

import { useState, useEffect } from 'react'
import { Download, Smartphone } from 'lucide-react'
import { isIOS, isStandalone, registerServiceWorker } from '@/lib/notifications'
import { toast } from 'sonner'

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showButton, setShowButton] = useState(false)
  const [isIosDevice, setIsIosDevice] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Don't show if already installed (standalone mode)
    if (isStandalone()) {
      return
    }

    // iOS detection
    if (isIOS()) {
      setIsIosDevice(true)
      setShowButton(true)
      return
    }

    // Android / Desktop Chrome detection
    // First, register service worker to meet PWA criteria
    registerServiceWorker().catch(console.error)

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      // Update UI notify the user they can install the PWA
      setShowButton(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIosDevice) {
      toast.info(
        'Para instalar en iOS: Toca el botón "Compartir" en Safari (el cuadrado con la flecha hacia arriba) y selecciona "Añadir a la pantalla de inicio".',
        { duration: 8000, position: 'top-center' }
      )
      return
    }

    if (!deferredPrompt) {
      toast.info('La aplicación ya está instalada o tu navegador no soporta la instalación automática.')
      return
    }

    // Show the install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
      setShowButton(false)
    } else {
      console.log('User dismissed the install prompt')
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null)
  }

  if (!showButton) return null

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center justify-center gap-2 w-full p-3 mt-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100"
    >
      {isIosDevice ? <Smartphone className="w-4 h-4" /> : <Download className="w-4 h-4" />}
      <span>Instalar App</span>
    </button>
  )
}
