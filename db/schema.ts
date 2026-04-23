import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  uniqueIndex,
  index,
  jsonb,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────

export const cabinetSizeEnum = pgEnum('cabinet_size', ['M', 'L', 'XL']);

export const contractStatusEnum = pgEnum('contract_status', [
  'reserved',  // 예약 (결제 대기)
  'active',    // 계약 중 (결제 완료)
  'expired',   // 만료
  'archived',  // 아카이빙 (D+3)
]);

export const renewalStatusEnum = pgEnum('renewal_status', [
  'guide_sent_d7',      // D-7 만료 예고 발송 완료
  'expired',            // D-0 만료 처리
  'overdue_management', // 연체관리 (수동 설정)
  'overdue_d1',         // 연체 D+1
  'overdue_d3',         // 연체 D+3
  'overdue_d7',         // 연체 D+7
  'renewed',            // 재계약 완료
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',    // 결제 대기
  'completed',  // 결제 완료
  'failed',     // 결제 실패
  'cancelled',  // 취소
  'refunded',   // 환불
]);

export const qrStatusEnum = pgEnum('qr_status', [
  'pending',     // 등록 대기
  'registered',  // 등록 완료
  'failed',      // 등록 실패
]);

export const promotionTypeEnum = pgEnum('promotion_type', [
  'discount_rate',        // 할인율 (%) — 계약 전체 동일 비율
  'free_months',          // 무료 개월
  'fixed_discount',       // 금액 할인
  'per_month_schedule',   // 월별 구간 할인율 (예: 1개월=50%, 2~3개월=20%)
]);

// ─────────────────────────────────────────
// 1. customers — 고객
// ─────────────────────────────────────────

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 100 }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('customers_phone_idx').on(table.phone),
]);

// ─────────────────────────────────────────
// 2. cabinets — 보관함 마스터 (61개 고정)
// ─────────────────────────────────────────

export const cabinets = pgTable('cabinets', {
  id: uuid('id').defaultRandom().primaryKey(),
  number: varchar('number', { length: 10 }).notNull().unique(), // M01, L13, XL02
  size: cabinetSizeEnum('size').notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
  branchId: varchar('branch_id', { length: 20 }).default('sungsil').notNull(), // 복수 지점 확장용
}, (table) => [
  index('cabinets_size_available_idx').on(table.size, table.isAvailable),
]);

// ─────────────────────────────────────────
// 3. contracts — 계약 (Active + Archive 통합)
// ─────────────────────────────────────────

export const contracts = pgTable('contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  cabinetId: uuid('cabinet_id').notNull().references(() => cabinets.id),
  startDate: date('start_date').notNull(),
  months: integer('months').notNull(),           // 계약 개월수
  expiryDate: date('expiry_date').notNull(),
  status: contractStatusEnum('status').default('reserved').notNull(),
  renewal: renewalStatusEnum('renewal'),          // null = 활성 (알림 미발송)
  rentalAmount: integer('rental_amount').notNull(), // 총 렌탈료 (보증금 제외)
  depositAmount: integer('deposit_amount').notNull(), // 보증금
  securityCode: varchar('security_code', { length: 5 }).notNull(),
  myPageToken: uuid('my_page_token').defaultRandom().notNull(), // 마이페이지 URL 토큰
  remark: text('remark'),                         // 비고 (누적 이용 개월 등)
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('contracts_customer_idx').on(table.customerId),
  index('contracts_cabinet_idx').on(table.cabinetId),
  index('contracts_status_idx').on(table.status),
  index('contracts_expiry_idx').on(table.expiryDate),
  index('contracts_my_page_token_idx').on(table.myPageToken),
  check('security_code_check', sql`length(${table.securityCode}) = 5 AND left(${table.securityCode}, 1) != '0'`),
]);

// ─────────────────────────────────────────
// 4. payments — 결제 이력
// ─────────────────────────────────────────

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  orderId: varchar('order_id', { length: 100 }).notNull().unique(), // 토스 주문 ID
  paymentKey: varchar('payment_key', { length: 200 }),              // 토스 결제 키
  amount: integer('amount').notNull(),                              // 총 결제금액 (렌탈+보증금)
  status: paymentStatusEnum('status').default('pending').notNull(),
  method: varchar('method', { length: 50 }),                        // 카드, 간편결제 등
  receiptUrl: text('receipt_url'),
  failReason: text('fail_reason'),
  webhookReceivedAt: timestamp('webhook_received_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('payments_contract_idx').on(table.contractId),
  index('payments_status_idx').on(table.status),
]);

// ─────────────────────────────────────────
// 5. co_users — 공동사용자
// ─────────────────────────────────────────

export const coUsers = pgTable('co_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  name: varchar('name', { length: 50 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  securityCode: varchar('security_code', { length: 5 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('co_users_contract_idx').on(table.contractId),
]);

// ─────────────────────────────────────────
// 6. co_user_invites — 공동사용자 초대 (24시간 토큰)
// ─────────────────────────────────────────

export const coUserInvites = pgTable('co_user_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  token: uuid('token').defaultRandom().notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('co_user_invites_token_idx').on(table.token),
]);

// ─────────────────────────────────────────
// 7. deposit_refunds — 보증금 반환
// ─────────────────────────────────────────

export const depositRefunds = pgTable('deposit_refunds', {
  id: uuid('id').defaultRandom().primaryKey(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  token: uuid('token').defaultRandom().notNull().unique(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }).notNull(), // 7일 유효
  bankName: varchar('bank_name', { length: 50 }),
  accountNumber: varchar('account_number', { length: 50 }),
  accountHolder: varchar('account_holder', { length: 50 }),
  isRegistered: boolean('is_registered').default(false).notNull(),
  isRefunded: boolean('is_refunded').default(false).notNull(),
  refundedAt: timestamp('refunded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('deposit_refunds_token_idx').on(table.token),
  index('deposit_refunds_contract_idx').on(table.contractId),
]);

// ─────────────────────────────────────────
// 8. qr_queue — QR 등록 대기열 (pywinauto 봇용)
// ─────────────────────────────────────────

export const qrQueue = pgTable('qr_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  cabinetNumber: varchar('cabinet_number', { length: 10 }).notNull(),
  securityCode: varchar('security_code', { length: 5 }).notNull(),
  userName: varchar('user_name', { length: 50 }).notNull(),
  userType: varchar('user_type', { length: 10 }).default('primary').notNull(), // primary | co_user
  status: qrStatusEnum('status').default('pending').notNull(),
  registeredAt: timestamp('registered_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('qr_queue_status_idx').on(table.status),
]);

// ─────────────────────────────────────────
// 9. alimtalk_logs — 알림톡 발송 이력
// ─────────────────────────────────────────

export const alimtalkLogs = pgTable('alimtalk_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  contractId: uuid('contract_id').references(() => contracts.id),
  templateId: varchar('template_id', { length: 50 }).notNull(),
  templateName: varchar('template_name', { length: 50 }).notNull(),
  recipientPhone: varchar('recipient_phone', { length: 20 }).notNull(),
  variables: jsonb('variables'),                    // 발송 변수 JSON
  success: boolean('success').notNull(),
  resultId: varchar('result_id', { length: 100 }),  // Solapi 결과 ID
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('alimtalk_logs_contract_idx').on(table.contractId),
  index('alimtalk_logs_sent_at_idx').on(table.sentAt),
  index('alimtalk_logs_template_date_idx').on(table.contractId, table.templateName, table.sentAt),
]);

// ─────────────────────────────────────────
// 10. promotions — 프로모션 엔진
// ─────────────────────────────────────────

export const promotions = pgTable('promotions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  // 고객 사이즈 카드 뱃지 문구 (예: "첫 달 반값"). 비우면 자동 생성.
  // Step 1 상단 배너는 별도 banners 테이블에서 관리 — 프로모션과 독립된 시즌 메시지.
  badgeLabel: varchar('badge_label', { length: 50 }),
  type: promotionTypeEnum('type').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  priority: integer('priority').default(0).notNull(), // 높을수록 우선
  // 적용 조건
  applicableSizes: jsonb('applicable_sizes'),    // ['M','L','XL'] or null=전체
  applicableMonths: jsonb('applicable_months'),  // [3,6,12] or null=전체
  isNewOnly: boolean('is_new_only').default(false).notNull(), // 신규 계약만
  // 값
  discountRate: numeric('discount_rate', { precision: 5, scale: 4 }), // 0.15 = 15%
  freeMonths: integer('free_months'),
  discountAmount: integer('discount_amount'),
  // per_month_schedule 전용 — [{ months: [1], rate: 0.5 }, { months: [2,3], rate: 0.2 }]
  monthlySchedule: jsonb('monthly_schedule'),
  // 유효 기간
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────
// 10-b. banners — 시즌·캠페인 배너 (Step 1 상단 문구)
// ─────────────────────────────────────────
// 프로모션과 독립. 한 시즌에 여러 프로모션이 걸려도 배너는 하나의 문구로 통일됨.
// 활성 배너 중 priority 최상위 1개가 노출. 없으면 배너 영역 숨김.

export const banners = pgTable('banners', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: varchar('label', { length: 100 }).notNull(),     // 고객 노출 문구 (예: "봄맞이 특별 할인")
  isActive: boolean('is_active').default(true).notNull(),
  priority: integer('priority').default(0).notNull(),      // 높을수록 우선
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────
// 11. phone_otps — 전화번호 OTP 인증
// ─────────────────────────────────────────

export const phoneOtps = pgTable('phone_otps', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  verified: boolean('verified').default(false).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('phone_otps_phone_idx').on(table.phone),
]);

// ─────────────────────────────────────────
// 12. auth_sessions — 로그인 세션
// ─────────────────────────────────────────

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id),
  phone: varchar('phone', { length: 20 }).notNull(),
  token: uuid('token').defaultRandom().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('auth_sessions_token_idx').on(table.token),
]);

// ─────────────────────────────────────────
// Relations
// ─────────────────────────────────────────

export const customersRelations = relations(customers, ({ many }) => ({
  contracts: many(contracts),
  authSessions: many(authSessions),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  customer: one(customers, {
    fields: [authSessions.customerId],
    references: [customers.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  customer: one(customers, {
    fields: [contracts.customerId],
    references: [customers.id],
  }),
  cabinet: one(cabinets, {
    fields: [contracts.cabinetId],
    references: [cabinets.id],
  }),
  payments: many(payments),
  coUsers: many(coUsers),
  coUserInvites: many(coUserInvites),
  depositRefunds: many(depositRefunds),
  qrQueue: many(qrQueue),
  alimtalkLogs: many(alimtalkLogs),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  contract: one(contracts, {
    fields: [payments.contractId],
    references: [contracts.id],
  }),
}));

export const coUsersRelations = relations(coUsers, ({ one }) => ({
  contract: one(contracts, {
    fields: [coUsers.contractId],
    references: [contracts.id],
  }),
}));

export const coUserInvitesRelations = relations(coUserInvites, ({ one }) => ({
  contract: one(contracts, {
    fields: [coUserInvites.contractId],
    references: [contracts.id],
  }),
}));

export const depositRefundsRelations = relations(depositRefunds, ({ one }) => ({
  contract: one(contracts, {
    fields: [depositRefunds.contractId],
    references: [contracts.id],
  }),
}));

export const qrQueueRelations = relations(qrQueue, ({ one }) => ({
  contract: one(contracts, {
    fields: [qrQueue.contractId],
    references: [contracts.id],
  }),
}));

export const alimtalkLogsRelations = relations(alimtalkLogs, ({ one }) => ({
  contract: one(contracts, {
    fields: [alimtalkLogs.contractId],
    references: [contracts.id],
  }),
}));
