import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    const auth = req.headers.get('authorization');
    const expected = process.env.ADMIN_PASSWORD || '';
    if (!auth || !auth.startsWith('Basic ')) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Auth required' }, {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
        });
      }
      return new NextResponse('Auth required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
      });
    }
    try {
      const [, base64] = auth.split(' ');
      // Edge runtime friendly base64 decode
      const decoded = atob(base64);
      // format: username:password → kita hanya cek password
      const pass = decoded.split(':').slice(1).join(':');
      if (!expected || pass !== expected) {
        if (path.startsWith('/api/')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return new NextResponse('Unauthorized', { status: 401 });
      }
    } catch {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};


