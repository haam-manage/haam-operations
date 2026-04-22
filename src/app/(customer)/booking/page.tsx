import { requireAuth } from '../../../../lib/auth';
import { isPromotionActive } from '../../../../lib/promotions';
import { BookingClient } from './BookingClient';

export default async function BookingPage() {
  const [session, promotionActive] = await Promise.all([
    requireAuth(),
    isPromotionActive(),
  ]);
  return (
    <BookingClient
      customerId={session.id}
      name={session.name}
      phone={session.phone}
      email={session.email}
      promotionActive={promotionActive}
    />
  );
}
