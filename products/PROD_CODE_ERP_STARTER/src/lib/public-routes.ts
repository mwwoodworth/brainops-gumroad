const STATIC_PUBLIC_ROUTES = ['/', '/about', '/services', '/contact', '/apply', '/blog'];
const PREFIX_PUBLIC_ROUTES = ['/auth/', '/blog/', '/portal'];

/**
 * Determines whether the given pathname should be treated as a public/marketing route.
 * Public routes do not require the heavy ERP providers or authentication wrappers.
 */
export function isPublicRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  if (STATIC_PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }
  return PREFIX_PUBLIC_ROUTES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export const PUBLIC_ROUTES = STATIC_PUBLIC_ROUTES;
export const PUBLIC_ROUTE_PREFIXES = PREFIX_PUBLIC_ROUTES;
