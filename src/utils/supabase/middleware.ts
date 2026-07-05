import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

function getJwtClaims(token: string) {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = JSON.parse(
      Buffer.from(
        parts[1].replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      ).toString("utf-8")
    )
    const org_id =
      payload.org_id ??
      payload.app_metadata?.org_id ??
      payload.user_metadata?.org_id ??
      null
    const user_role =
      payload.user_role ??
      payload.role ??
      payload.app_metadata?.user_role ??
      payload.app_metadata?.role ??
      payload.user_metadata?.role ??
      payload.user_metadata?.user_role ??
      null
    return { org_id, user_role }
  } catch {
    return null
  }
}

export async function updateSession(request: NextRequest) {
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

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user ?? null
  const { pathname } = request.nextUrl

  // Define route check helpers
  const isAuthRoute = pathname === "/login" || pathname === "/signup"
  const isInviteRoute = pathname.startsWith("/invite/")
  const isStaticFile =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/static/") ||
    pathname === "/favicon.ico"

  if (isStaticFile) {
    return supabaseResponse
  }

  // 1. If unauthenticated
  if (!user) {
    if (!isAuthRoute && !isInviteRoute && pathname !== "/") {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // 2. If authenticated, check for profile
  let orgId = null
  if (session?.access_token) {
    const claims = getJwtClaims(session.access_token)
    if (claims && claims.org_id) {
      orgId = claims.org_id
    }
  }

  // Fallback to database query ONLY if claims don't have orgId
  let hasProfile = orgId !== null
  if (!hasProfile) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle()
    if (profile?.org_id) {
      hasProfile = true
    }
  }

  if (hasProfile) {
    // Authenticated and has profile
    if (isAuthRoute || pathname === "/") {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  } else {
    // Authenticated but does NOT have profile
    if (pathname !== "/signup" && !isInviteRoute) {
      const url = request.nextUrl.clone()
      url.pathname = "/signup"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
