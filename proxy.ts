import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes accessible without a session
const PUBLIC_PATHS = ['/', '/login', '/signup', '/onboarding', '/auth/callback', '/forgot-password', '/reset-password']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do not add any logic between createServerClient and getUser
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.includes(pathname)
    || pathname.startsWith('/invite/')
    || pathname.startsWith('/api/auth/')
    || pathname.startsWith('/api/invite/')
    || pathname === '/api/billing/webhook'
  const isSuperAdmin = pathname.startsWith('/superadmin')

  // Redirect unauthenticated users to login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login/signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Super admin gate — check against SUPER_ADMIN_EMAILS env var
  if (isSuperAdmin && user) {
    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)
    if (!superAdminEmails.includes(user.email ?? '')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
