import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    const auth = req.headers.get('authorization');
    const expectedUser = process.env.ADMIN_USERNAME || '';
    const expectedPass = process.env.ADMIN_PASSWORD || '';
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
      // format: username:password
      const [user, ...rest] = decoded.split(':');
      const pass = rest.join(':');
      // Wajib: env harus tersedia dan cocok
      if (!expectedUser || !expectedPass || user !== expectedUser || pass !== expectedPass) {
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


