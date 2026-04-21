import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the token from the cookies
  const authToken = request.cookies.get("authToken")?.value

  // Get the current path
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const publicPaths = ["/auth/login", "/auth/forget-password", "/auth/reset-password", "/auth/verify-otp", "/client-overview"]
  const isPublicPath = publicPaths.includes(path)

  // If the path is public, allow access
  if (isPublicPath) {
    // If user is logged in and trying to access auth pages, redirect to dashboard
    if (authToken && path.startsWith("/auth")) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  // For protected routes, check for auth token
  if (!authToken) {
    // Save the original path to redirect back after login
    const from = request.nextUrl.pathname
    const url = new URL("/auth/login", request.url)
    url.searchParams.set("from", from)
    return NextResponse.redirect(url)
  }

  // Allow access to protected routes if token exists
  return NextResponse.next()
}

// Update the config to match all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}

