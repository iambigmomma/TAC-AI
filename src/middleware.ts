import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import { routing } from './i18n/routing'; // Import routing config

// 1. Create the next-intl middleware using the routing config
const handleI18nRouting = createMiddleware(routing);

// 2. Define paths that should bypass Auth0 check (after i18n handling)
// Note: Public API routes might still need locale handling depending on design.
// Auth0's own /api/auth/* routes definitely should bypass auth check.
const authBypassPaths = ['/api/auth']; // Only Auth0 routes for now

// 3. Define paths that require authentication AFTER locale handling
const protectedPaths = [
  '/history',
  '/favorites',
  '/settings',
  // Add other protected paths here
];

export default async function middleware(request: NextRequest) {
  // --- Apply next-intl middleware first ---
  const response = handleI18nRouting(request);
  // If next-intl redirected, return its response
  if (response.status === 307 || response.status === 308) {
    return response;
  }

  // --- Apply Auth0 check AFTER intl middleware ---

  // Get pathname *after* potential locale prefix handling by next-intl
  // next-intl might add headers, but reading nextUrl.pathname after handleI18nRouting *should* be locale-stripped
  const pathname = request.nextUrl.pathname; // This path should ideally not have the locale prefix anymore

  // Check if the path should bypass the Auth0 check
  const isAuthBypassPath = authBypassPaths.some((path) =>
    pathname.startsWith(path),
  );
  if (isAuthBypassPath) {
    return response; // Allow access (response already processed by handleI18nRouting)
  }

  // Check if the path is protected (including root)
  const isProtectedPath =
    protectedPaths.some((path) => pathname.startsWith(path)) ||
    pathname === '/'; // Protect root path

  if (isProtectedPath) {
    const session = await getSession(request, response); // Pass response for session handling
    if (!session?.user) {
      const loginUrl = new URL('/api/auth/login', request.url);
      // returnTo should be the path *without* locale, as Auth0 redirects back there,
      // and then the middleware will add the locale prefix again.
      const returnToPath = pathname + request.nextUrl.search;
      loginUrl.searchParams.set('returnTo', returnToPath);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Allow the request processed by handleI18nRouting to proceed
  return response;
}

export const config = {
  // Matcher from next-intl docs (adjust if needed, e.g., for /api routes not handled by intl)
  // This will match all paths except for static files and specific API routes.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|icons|.*\\.).*)',
    // If you have API routes other than /api/auth that should *not* have locale handling,
    // you might need to exclude them here too, or handle them before handleI18nRouting.
  ],
  runtime: 'experimental-edge',
};
