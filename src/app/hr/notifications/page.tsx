import { SendNotificationForm } from '@/components/ui/SendNotificationForm'

export default function NotificationsHRPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Centro de Notificaciones</h1>
        <p className="text-slate-500 mt-1">Módulo de Recursos Humanos</p>
      </div>
      
      <SendNotificationForm moduleName="RRHH" />
    </div>
  )
}
