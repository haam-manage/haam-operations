import { requireAuth } from '../../../../lib/auth';
import { BookingClient } from './BookingClient';

export default async function BookingPage() {
  const session = await requireAuth();
  return (
    <BookingClient
      customerId={session.id}
      name={session.name}
      phone={session.phone}
      email={session.email}
    />
  );
}
