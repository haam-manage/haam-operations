import { NextResponse } from 'next/server';

/**
 * GET /api/health — 시스템 상태 확인
 */
export async function GET() {
  const checks: Record<string, string> = {};

  // Supabase/DB 연결 확인
  try {
    const dbUrl = process.env.DATABASE_URL;
    checks.database = dbUrl ? 'configured' : 'not_configured';
  } catch {
    checks.database = 'error';
  }

  // 토스 설정 확인
  checks.toss = process.env.TOSS_SECRET_KEY ? 'configured' : 'not_configured';

  // Solapi 설정 확인
  checks.solapi = process.env.SOLAPI_API_KEY ? 'configured' : 'not_configured';

  // Telegram 설정 확인
  checks.telegram = process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not_configured';

  const allConfigured = Object.values(checks).every(v => v === 'configured');

  return NextResponse.json({
    status: allConfigured ? 'healthy' : 'partial',
    timestamp: new Date().toISOString(),
    checks,
  }, { status: 200 });
}
