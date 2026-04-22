import { NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { contracts, customers, cabinets, depositRefunds, coUserInvites, alimtalkLogs } from '../../../../../db/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { getNextTransition } from '../../../../../lib/status';
import { sendExpiryD7Alimtalk, sendExpiryD0Alimtalk, sendAlimtalk, TEMPLATE_IDS } from '../../../../../lib/alimtalk';
import { notifyEvent, sendDailySummary } from '../../../../../lib/telegram';

/**
 * GET /api/cron/daily
 *
 * Vercel Cron으로 매일 09:00 KST 실행
 * vercel.json: { "crons": [{ "path": "/api/cron/daily", "schedule": "0 0 * * *" }] }
 * (UTC 00:00 = KST 09:00)
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getTodayKST();
  const results = {
    processed: 0,
    transitions: [] as string[],
    alimtalkSent: 0,
    alimtalkFailed: 0,
    tokensExpired: 0,
    errors: [] as string[],
  };

  try {
    // 1. 활성 계약 중 만료 관련 전이 대상 조회
    const activeContracts = await db.query.contracts.findMany({
      where: eq(contracts.status, 'active'),
      with: { customer: true, cabinet: true },
    });

    // 만료된 계약도 포함 (아카이빙 대상)
    const expiredContracts = await db.query.contracts.findMany({
      where: eq(contracts.status, 'expired'),
      with: { customer: true, cabinet: true },
    });

    const allContracts = [...activeContracts, ...expiredContracts];

    for (const contract of allContracts) {
      try {
        const transition = getNextTransition(
          {
            id: contract.id,
            expiryDate: contract.expiryDate,
            renewal: contract.renewal,
            status: contract.status,
          },
          today,
        );

        if (!transition) continue;

        // 멱등성 가드: 오늘 이미 같은 템플릿 발송했는지 확인
        if (transition.alimtalkTemplate) {
          const alreadySent = await db.query.alimtalkLogs.findFirst({
            where: and(
              eq(alimtalkLogs.contractId, contract.id),
              eq(alimtalkLogs.templateName, transition.alimtalkTemplate),
              sql`DATE(${alimtalkLogs.sentAt} AT TIME ZONE 'Asia/Seoul') = ${today}`,
            ),
          });

          if (alreadySent) continue;
        }

        // 상태 전이 적용
        const updateData: Record<string, unknown> = {
          renewal: transition.newRenewal,
          updatedAt: new Date(),
        };
        if (transition.newStatus) {
          updateData.status = transition.newStatus;
        }
        if (transition.newStatus === 'archived') {
          updateData.archivedAt = new Date();
        }

        await db.update(contracts)
          .set(updateData)
          .where(eq(contracts.id, contract.id));

        // 아카이빙 시 보관함 해제
        if (transition.newStatus === 'archived') {
          await db.update(cabinets)
            .set({ isAvailable: true })
            .where(eq(cabinets.id, contract.cabinetId));
        }

        // 보증금 반환 토큰 발급
        if (transition.generateDepositToken) {
          const tokenExpiry = new Date();
          tokenExpiry.setDate(tokenExpiry.getDate() + 7);

          await db.insert(depositRefunds).values({
            contractId: contract.id,
            tokenExpiresAt: tokenExpiry,
          });
        }

        // 알림톡 발송
        if (transition.alimtalkTemplate && contract.customer) {
          let alimtalkResult;

          if (transition.alimtalkTemplate === 'EXPIRY_D7') {
            const renewUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://haam.co.kr'}/renew/${contract.myPageToken}`;
            alimtalkResult = await sendExpiryD7Alimtalk({
              phone: contract.customer.phone,
              customerName: contract.customer.name,
              cabinetNumber: contract.cabinet!.number,
              expiryDate: contract.expiryDate,
              renewUrl,
              contractId: contract.id,
            });
          } else if (transition.alimtalkTemplate === 'EXPIRY_D0') {
            const refund = await db.query.depositRefunds.findFirst({
              where: eq(depositRefunds.contractId, contract.id),
            });
            const refundUrl = refund
              ? `${process.env.NEXT_PUBLIC_BASE_URL || 'https://haam.co.kr'}/refund/${refund.token}`
              : '';

            alimtalkResult = await sendExpiryD0Alimtalk({
              phone: contract.customer.phone,
              customerName: contract.customer.name,
              cabinetNumber: contract.cabinet!.number,
              refundUrl,
              contractId: contract.id,
            });
          } else {
            // 연체 알림톡 (OVERDUE_D1/D3/D7)
            const templateId = TEMPLATE_IDS[transition.alimtalkTemplate as keyof typeof TEMPLATE_IDS] || '';
            alimtalkResult = await sendAlimtalk({
              templateId,
              recipientPhone: contract.customer.phone,
              variables: {
                '#{고객명}': contract.customer.name,
                '#{보관함번호}': contract.cabinet!.number,
              },
              contractId: contract.id,
            });
          }

          // 발송 로그 기록
          await db.insert(alimtalkLogs).values({
            contractId: contract.id,
            templateId: transition.alimtalkTemplate,
            templateName: transition.alimtalkTemplate,
            recipientPhone: contract.customer.phone,
            success: alimtalkResult.success,
            resultId: alimtalkResult.resultId,
            errorMessage: alimtalkResult.errorMessage,
          });

          if (alimtalkResult.success) {
            results.alimtalkSent++;
          } else {
            results.alimtalkFailed++;
          }
        }

        results.processed++;
        results.transitions.push(`${contract.cabinet?.number}: ${transition.action}`);
      } catch (err) {
        results.errors.push(`${contract.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. 만료된 초대 토큰 정리 (24시간)
    const expiredInvites = await db.delete(coUserInvites)
      .where(and(
        lte(coUserInvites.expiresAt, new Date()),
        sql`${coUserInvites.usedAt} IS NULL`,
      ))
      .returning();
    results.tokensExpired += expiredInvites.length;

    // 3. 만료된 보증금 반환 토큰 정리 (7일)
    // 토큰만 무효화, 레코드는 유지 (감사 추적)

    // 텔레그램 배치 완료 알림 — 처리·오류·토큰 만료 중 하나라도 있을 때만
    const hasActivity =
      results.processed > 0 ||
      results.errors.length > 0 ||
      results.tokensExpired > 0;
    if (hasActivity) {
      await notifyEvent('batch_complete', {
        날짜: today,
        처리건수: results.processed,
        알림톡발송: results.alimtalkSent,
        토큰만료: results.tokensExpired,
        오류: results.errors.length,
      });
    }

  } catch (err) {
    await notifyEvent('batch_failed', {
      날짜: today,
      오류: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json({ error: '배치 실행 실패', detail: String(err) }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    date: today,
    ...results,
  });
}

function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}
