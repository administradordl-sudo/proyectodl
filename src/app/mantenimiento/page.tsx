import { getTickets } from './actions';
import TicketDashboard from './components/TicketDashboard';

export default async function MantenimientoPage(props: { searchParams?: Promise<{ categoria?: string, estado?: string }> | { categoria?: string, estado?: string } }) {
  // Await searchParams for Next.js 15+ compatibility
  const searchParams = props.searchParams ? await props.searchParams : {};
  
  const categoria = typeof searchParams.categoria === 'string' ? searchParams.categoria : undefined;
  const estado = typeof searchParams.estado === 'string' ? searchParams.estado : undefined;

  const tickets = await getTickets(categoria, estado);

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Módulo de Mantenimiento</h1>
        <p className="text-gray-500 mt-2">Gestiona las incidencias de infraestructura y flota vehicular.</p>
      </div>

      <TicketDashboard initialTickets={tickets} />
    </div>
  );
}
