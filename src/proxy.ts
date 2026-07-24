import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware(async (auth, req) => {
    const { pathname } = req.nextUrl;
    
    // Only /sign-in and /sign-up are public routes
    const isPublic = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
    
    if (!isPublic) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for Clerk-specific frontend API routes
        '/__clerk/(.*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
