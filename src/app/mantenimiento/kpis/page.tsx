import { supabase } from '@/lib/supabase';
import KPIDashboard from '../components/KPIDashboard';

// Revalidar cada 0 segundos para que siempre traiga lo último al entrar
export const revalidate = 0;

export default async function KPIsPage() {
  const { data: tickets, error } = await supabase
    .from('tickets_mantenimiento')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching tickets for KPIs:", error);
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-xl font-bold mb-2">Error al cargar datos</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">KPIs y Métricas</h1>
        <p className="text-gray-500 mt-1 text-sm">Análisis de demoras y rendimiento del módulo de mantenimiento.</p>
      </div>

      <KPIDashboard initialTickets={tickets || []} />
    </div>
  );
}
