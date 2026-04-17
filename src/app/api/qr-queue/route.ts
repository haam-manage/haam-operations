import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../db';
import { qrQueue } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/qr-queue?status=pending
 * pywinauto 봇이 폴링하는 읽기 전용 엔드포인트
 */
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status') || 'pending';

  const items = await db.query.qrQueue.findMany({
    where: eq(qrQueue.status, status as 'pending' | 'registered' | 'failed'),
    orderBy: (qr, { asc }) => [asc(qr.createdAt)],
  });

  return NextResponse.json(items);
}

/**
 * PATCH /api/qr-queue
 * pywinauto 봇이 등록 완료/실패 시 상태 업데이트
 *
 * Body: { id, status: "registered" | "failed", errorMessage? }
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, status, errorMessage } = body;

  if (!id || !status) {
    return NextResponse.json({ error: 'id와 status 필수' }, { status: 400 });
  }

  if (status !== 'registered' && status !== 'failed') {
    return NextResponse.json({ error: 'status는 registered 또는 failed만 허용' }, { status: 400 });
  }

  await db.update(qrQueue)
    .set({
      status,
      registeredAt: status === 'registered' ? new Date() : undefined,
      errorMessage: errorMessage || null,
    })
    .where(eq(qrQueue.id, id));

  return NextResponse.json({ success: true });
}
