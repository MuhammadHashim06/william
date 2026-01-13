import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get('session');
    let user = null;

    if (sessionCookie) {
        try {
            const payload = await decrypt(sessionCookie.value);
            user = payload.user;
        } catch (e) {
            // Invalid token
        }
    }

    // 1. Bridge: If user is authenticated, ensure existing API/Functions get the expected header
    const requestHeaders = new Headers(request.headers);
    if (user) {
        requestHeaders.set('x-actor-user-id', user.id);
    }

    // 2. Protected Routes (e.g. /dashboard, /admin)
    if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // Pass the modified headers to the backend
        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    }

    // 3. Public Routes restricted for authenticated users (e.g. /login)
    if (request.nextUrl.pathname === '/login') {
        if (user) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    // For all other routes, just pass the headers if we have them (so API routes can use them)
    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
