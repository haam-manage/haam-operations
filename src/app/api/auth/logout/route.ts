import { NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { authSessions } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const tokenValue = cookieStore.get('haam_session')?.value;

    if (tokenValue) {
      await db.delete(authSessions).where(eq(authSessions.token, tokenValue));
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('haam_session');
    return response;
  } catch (error) {
    console.error('[logout] Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
