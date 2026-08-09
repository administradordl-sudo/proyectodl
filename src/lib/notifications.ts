const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  return await navigator.serviceWorker.register('/sw.js');
}

export async function subscribeToPushNotifications(email: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications no son soportadas por el navegador.')
  }

  // Register service worker
  const registration = await registerServiceWorker()
  if (!registration) throw new Error('Service worker registration failed');

  // Get push subscription
  let subscription = await registration.pushManager.getSubscription()

  // If not subscribed, subscribe
  if (!subscription) {
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicVapidKey) {
      throw new Error('No se ha configurado la llave pública VAPID')
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    })
  }

  // Extract browser and OS information
  let os = 'Unknown'
  let browser = 'Unknown'
  
  if (typeof window !== 'undefined' && window.navigator) {
    const ua = window.navigator.userAgent
    if (ua.indexOf('Win') !== -1) os = 'Windows'
    else if (ua.indexOf('Mac') !== -1) os = 'MacOS'
    else if (ua.indexOf('Linux') !== -1) os = 'Linux'
    else if (ua.indexOf('Android') !== -1) os = 'Android'
    else if (ua.indexOf('like Mac') !== -1) os = 'iOS'
    
    if (ua.indexOf('Chrome') !== -1) browser = 'Chrome'
    else if (ua.indexOf('Safari') !== -1) browser = 'Safari'
    else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox'
    else if (ua.indexOf('Edge') !== -1) browser = 'Edge'
  }

  // Send subscription to our backend
  const response = await fetch('/api/notifications/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscription,
      email,
      os,
      browser,
      device_model: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown'
    }),
  })

  if (!response.ok) {
    throw new Error('Error al guardar la suscripción en el servidor')
  }

  return true
}

export function isIOS() {
  if (typeof window === 'undefined') return false;
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  // iPad on iOS 13 detection
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  // @ts-ignore
  return ('standalone' in window.navigator && window.navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches
}
