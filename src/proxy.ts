/**
 * @file src/proxy.ts
 * @description Global Next.js Edge Middleware for authentication routing and security header enforcement.
 * 
 * FLOW OF EXECUTION:
 * 1. The middleware is triggered for every incoming request matching the `config.matcher` pattern.
 * 2. It checks the request URL pathname to determine if the target route is public or private.
 * 3. If private, Clerk's `auth.protect()` is called to verify user authentication.
 * 4. If public, the check is skipped, allowing static pages, sign-in, or sign-up routes to render.
 * 5. Finally, it constructs a response and injects HTTP security headers to protect the client side.
 * 
 * CONNECTIONS:
 * - Integrates with `@clerk/nextjs` for session authentication.
 * - Protects pages under `src/app/(protected)/*` and API endpoints under `/api/trpc/*`.
 */

import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware(async (auth, req) => {
    // Extract the URL pathname from the request (e.g., "/dashboard", "/api/trpc/user.getUsers")
    const { pathname } = req.nextUrl;
    
    // Determine if the route is public (accessible without logging in)
    // - '/': The landing/marketing homepage.
    // - '/sign-in': Clerk's sign-in route.
    // - '/sign-up': Clerk's sign-up route.
    const isPublic = pathname === '/' || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
    
    // If route is not public, call auth.protect()
    // This will redirect unauthenticated users to the Clerk sign-in page.
    if (!isPublic) {
        await auth.protect();
    }

    // Initialize the default response flow, preparing it to proceed to the page route/handler.
    const response = NextResponse.next();

    // INJECT SECURITY HEADERS:
    // 1. X-Frame-Options: Prevent website from being rendered inside an iframe, protecting against Clickjacking.
    response.headers.set('X-Frame-Options', 'DENY');
    
    // 2. X-Content-Type-Options: Prevent the browser from MIME-sniffing files away from their declared content-type.
    response.headers.set('X-Content-Type-Options', 'nosniff');
    
    // 3. Referrer-Policy: Control referrer information sent in HTTP headers (strict policy when jumping origins).
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // 4. Permissions-Policy: Restrict browser hardware features (camera, microphone, geolocation) for this origin.
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    return response;
});

/**
 * Middleware Configuration
 * Defines which routes this middleware should execute on.
 */
export const config = {
    matcher: [
        // Skip Next.js internals and all static asset files (.png, .css, etc.) unless specified in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always execute for Clerk-specific authentication frontend URLs
        '/__clerk/(.*)',
        // Always run for API routes (Next.js serverless functions & tRPC routing)
        '/(api|trpc)(.*)',
    ],
};

