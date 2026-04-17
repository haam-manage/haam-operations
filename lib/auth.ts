/**
 * 세션 기반 인증 유틸리티
 *
 * 쿠키의 haam_session 토큰으로 고객을 식별한다.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '../db';
import { authSessions, customers } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';

export interface SessionCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

export async function getSession(): Promise<SessionCustomer | null> {
  const cookieStore = await cookies();
  const tokenValue = cookieStore.get('haam_session')?.value;
  if (!tokenValue) return null;

  const session = await db.query.authSessions.findFirst({
    where: and(
      eq(authSessions.token, tokenValue),
      gt(authSessions.expiresAt, new Date()),
    ),
  });

  if (!session || !session.customerId) return null;

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, session.customerId),
  });

  if (!customer) return null;

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
  };
}

export async function requireAuth(): Promise<SessionCustomer> {
  const customer = await getSession();
  if (!customer) redirect('/auth');
  return customer;
}
