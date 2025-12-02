import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { rateLimit } from '@/middleware/rate-limit';

const DEFAULT_RATE_LIMIT_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? '60000'); // 1 minute
const DEFAULT_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX ?? '120');

const AUTH_RATE_LIMIT_WINDOW_MS = Number(process.env.API_AUTH_RATE_LIMIT_WINDOW_MS ?? '900000'); // 15 minutes
const AUTH_RATE_LIMIT_MAX = Number(process.env.API_AUTH_RATE_LIMIT_MAX ?? '10');

const defaultLimiter = rateLimit({
  windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
  max: DEFAULT_RATE_LIMIT_MAX,
});

const writeLimiter = rateLimit({
  windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
  max: Math.max(1, Math.floor(DEFAULT_RATE_LIMIT_MAX / 2)),
});

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
});

const rewriteMap: Record<string, string> = {
  '/api/inventory': '/api/internal/inventory',
  '/api/ai/chat': '/api/internal/ai/chat',
  '/api/ai/agents': '/api/internal/ai/agents',
  '/api/analytics': '/api/internal/analytics',
  '/api/field/stats': '/api/internal/field/stats',
  '/api/schedule': '/api/internal/schedule',
  '/api/reports': '/api/internal/reports',
};

const PUBLIC_API_PATHS = new Set<string>([
  '/api/health',
  '/api/system/health',
  '/api/system/auth-health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/login',
  '/api/register',
]);

function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_API_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/api/public/')) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rate limiting for all API routes (Upstash-backed where configured, memory fallback otherwise)
  if (pathname.startsWith('/api/')) {
    const isHealthCheck = pathname === '/api/health';
    const isInternal = pathname.startsWith('/api/internal/');
    const isAuthSessionSync = pathname === '/api/auth/session';

    // Health/internal routes and auth sync endpoint are exempt from rate limiting
    if (!isHealthCheck && !isInternal && !isAuthSessionSync) {
      let limiter = defaultLimiter;

      if (
        pathname.startsWith('/api/auth/') ||
        pathname === '/api/login' ||
        pathname === '/api/register'
      ) {
        limiter = authLimiter;
      } else if (request.method !== 'GET') {
        limiter = writeLimiter;
      }

      const limitedResponse = await limiter(request);
      if (limitedResponse) {
        return limitedResponse;
      }
    }
  }

  const response = NextResponse.next();

  // Centralized authentication enforcement for API routes
  if (pathname.startsWith('/api/') && !isPublicApiPath(pathname)) {
    // Check for E2E bypass token before enforcing Supabase auth
    const bypassEnabled = ['true', '1'].includes(
      (process.env.PLAYWRIGHT_BYPASS_AUTH || process.env.E2E_BYPASS_AUTH || '').toLowerCase()
    );

    if (bypassEnabled) {
      const expectedBypassToken =
        process.env.PLAYWRIGHT_E2E_BYPASS_TOKEN?.trim() ||
        process.env.E2E_BYPASS_TOKEN?.trim();
      
      const requestBypassToken =
        request.headers.get('x-e2e-bypass-token')?.trim() ||
        request.cookies.get('e2e-bypass-token')?.value?.trim();

      // Only allow bypass if token is configured AND matches
      if (expectedBypassToken && requestBypassToken && requestBypassToken === expectedBypassToken) {
        // Valid bypass token - allow request through without Supabase auth
        return response;
      }
    }

    const supabase = createMiddlewareClient({ req: request, res: response });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // For API routes, return a JSON 401 instead of redirecting to login UI.
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  const target = rewriteMap[pathname];

  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.rewrite(url);
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
