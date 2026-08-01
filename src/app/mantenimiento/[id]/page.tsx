import { getTicketById } from '../actions';
import TicketDetail from '../components/TicketDetail';
import { notFound } from 'next/navigation';

export default async function TicketDetailPage(props: { params: Promise<{ id: string }> | { id: string } }) {
  // Await params for Next.js 15+ compatibility
  const params = props.params instanceof Promise ? await props.params : props.params;
  
  const ticket = await getTicketById(params.id);

  if (!ticket) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <TicketDetail ticket={ticket as any} />
    </div>
  );
}
