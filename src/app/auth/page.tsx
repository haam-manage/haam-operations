import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import AuthClient from './AuthClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function AuthPage({ searchParams }: PageProps) {
  const { redirect: redirectTo } = await searchParams;
  const session = await getSession();

  // 이미 로그인된 경우 즉시 리다이렉트
  if (session) {
    redirect(redirectTo || '/my');
  }

  return <AuthClient redirectTo={redirectTo || '/my'} />;
}
