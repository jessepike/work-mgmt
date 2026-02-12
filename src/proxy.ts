import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Defensive redirect for accidentally pasted route labels like:
    // /portfolio (health/trust clarity + clickable footer chips)
    if (pathname.startsWith('/portfolio ') || pathname.startsWith('/portfolio%20')) {
        const url = request.nextUrl.clone()
        url.pathname = '/portfolio'
        url.search = ''
        return NextResponse.redirect(url)
    }

    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
