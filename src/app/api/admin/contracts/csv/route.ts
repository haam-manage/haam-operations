import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../db';
import { contracts, customers, cabinets } from '../../../../../../db/schema';
import { and, desc, eq, ilike, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const VALID_STATUS = new Set(['reserved', 'active', 'expired', 'archived']);

const STATUS_LABEL: Record<string, string> = {
  reserved: '결제대기',
  active: '활성',
  expired: '만료',
  archived: '아카이빙',
};

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const statusRaw = req.nextUrl.searchParams.get('status') ?? '';
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  const status = VALID_STATUS.has(statusRaw) ? (statusRaw as 'reserved' | 'active' | 'expired' | 'archived') : null;

  const whereClause = and(
    status ? eq(contracts.status, status) : undefined,
    q
      ? or(
          ilike(customers.name, `%${q}%`),
          ilike(customers.phone, `%${q}%`),
          ilike(cabinets.number, `%${q}%`),
        )
      : undefined,
  );

  const rows = await db
    .select({
      customerName: customers.name,
      customerPhone: customers.phone,
      cabinetNumber: cabinets.number,
      cabinetSize: cabinets.size,
      status: contracts.status,
      renewal: contracts.renewal,
      months: contracts.months,
      startDate: contracts.startDate,
      expiryDate: contracts.expiryDate,
      rentalAmount: contracts.rentalAmount,
      depositAmount: contracts.depositAmount,
      securityCode: contracts.securityCode,
      remark: contracts.remark,
      createdAt: contracts.createdAt,
    })
    .from(contracts)
    .innerJoin(customers, eq(contracts.customerId, customers.id))
    .innerJoin(cabinets, eq(contracts.cabinetId, cabinets.id))
    .where(whereClause)
    .orderBy(desc(contracts.createdAt));

  const header = [
    '고객명', '전화번호', '보관함', '사이즈',
    '상태', '재계약상태', '개월',
    '시작일', '만료일',
    '렌탈료', '보증금', '보안코드',
    '비고', '생성일시',
  ];

  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push([
      csvCell(r.customerName),
      csvCell(r.customerPhone),
      csvCell(r.cabinetNumber),
      csvCell(r.cabinetSize),
      csvCell(STATUS_LABEL[r.status] ?? r.status),
      csvCell(r.renewal ?? ''),
      csvCell(r.months),
      csvCell(r.startDate),
      csvCell(r.expiryDate),
      csvCell(r.rentalAmount),
      csvCell(r.depositAmount),
      csvCell(r.securityCode),
      csvCell(r.remark ?? ''),
      csvCell(r.createdAt ? new Date(r.createdAt).toISOString() : ''),
    ].join(','));
  }

  const bom = '﻿';
  const csv = bom + lines.join('\r\n');
  const ts = new Date().toISOString().slice(0, 10);
  const filename = `haam-contracts-${status ?? 'all'}-${ts}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
