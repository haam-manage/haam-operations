import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../db';
import { customers, contracts, payments, cabinets } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { calculatePrice, extractCabinetSize } from '../../../../lib/price';
import { validatePhone, validateCabinetNumber, validateSecurityCode, generateSecurityCode, calculateExpiryDate } from '../../../../lib/validation';
import { generateOrderId } from '../../../../lib/toss';

/**
 * POST /api/orders — 주문(예약) 생성
 *
 * 프론트에서 예약 폼 제출 → 주문 생성 → 토스 위젯 데이터 반환
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, phone, email, cabinetNumber, months, startDate } = body;

  // 입력 검증
  if (!name || !phone || !cabinetNumber || !months || !startDate) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  if (!validatePhone(phone)) {
    return NextResponse.json({ error: '유효하지 않은 전화번호' }, { status: 400 });
  }

  if (!validateCabinetNumber(cabinetNumber)) {
    return NextResponse.json({ error: '유효하지 않은 보관함 번호' }, { status: 400 });
  }

  // 보관함 가용성 확인
  const cabinet = await db.query.cabinets.findFirst({
    where: eq(cabinets.number, cabinetNumber.toUpperCase()),
  });

  if (!cabinet) {
    return NextResponse.json({ error: '보관함을 찾을 수 없습니다' }, { status: 404 });
  }

  if (!cabinet.isAvailable) {
    return NextResponse.json({ error: '이미 사용 중인 보관함입니다' }, { status: 409 });
  }

  // 가격 계산
  const cabinetSize = extractCabinetSize(cabinetNumber);
  // TODO: DB에서 활성 프로모션 조회
  const priceResult = calculatePrice({
    cabinetSize,
    months: Number(months),
    promotionActive: true, // 현재 프로모션 활성 상태
  });

  // 보안코드 생성
  const securityCode = generateSecurityCode();

  // 만료일 계산
  const expiryDate = calculateExpiryDate(startDate, Number(months));

  // 고객 upsert (전화번호 기준)
  let customer = await db.query.customers.findFirst({
    where: eq(customers.phone, phone.replace(/[-\s]/g, '')),
  });

  if (!customer) {
    const [newCustomer] = await db.insert(customers).values({
      name,
      phone: phone.replace(/[-\s]/g, ''),
      email: email || null,
    }).returning();
    customer = newCustomer;
  }

  // 계약 생성
  const [contract] = await db.insert(contracts).values({
    customerId: customer.id,
    cabinetId: cabinet.id,
    startDate,
    months: Number(months),
    expiryDate,
    status: 'reserved',
    rentalAmount: priceResult.totalRental,
    depositAmount: priceResult.deposit,
    securityCode,
  }).returning();

  // 주문 생성
  const orderId = generateOrderId();
  await db.insert(payments).values({
    contractId: contract.id,
    orderId,
    amount: priceResult.totalAmount,
    status: 'pending',
  });

  // 프론트엔드로 결제 위젯 초기화 데이터 반환
  return NextResponse.json({
    orderId,
    contractId: contract.id,
    amount: priceResult.totalAmount,
    orderName: `도심창고:함 ${cabinetNumber} 보관함 ${months}개월`,
    customerName: name,
    customerPhone: phone,
    priceBreakdown: {
      basePrice: priceResult.basePrice,
      monthlyPrice: priceResult.monthlyPrice,
      billableMonths: priceResult.billableMonths,
      freeMonths: priceResult.freeMonths,
      totalRental: priceResult.totalRental,
      deposit: priceResult.deposit,
      totalAmount: priceResult.totalAmount,
      discountRate: priceResult.discountRate,
    },
  });
}
