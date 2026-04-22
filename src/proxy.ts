import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPass) {
    return new NextResponse('Admin credentials not configured', { status: 503 });
  }

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const sep = decoded.indexOf(':');
      if (sep > 0) {
        const user = decoded.slice(0, sep);
        const pass = decoded.slice(sep + 1);
        if (user === expectedUser && pass === expectedPass) {
          return NextResponse.next();
        }
      }
    } catch {}
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="HAAM Admin", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/contracts/:path*',
    '/promotions/:path*',
    '/api/admin/:path*',
  ],
};
