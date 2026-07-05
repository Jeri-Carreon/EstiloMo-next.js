import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });

          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedRoute =
    req.nextUrl.pathname.startsWith("/appointment") ||
    req.nextUrl.pathname.startsWith("/reviews") ||
    req.nextUrl.pathname.startsWith("/myAppointments") ||
    req.nextUrl.pathname.startsWith("/myReviews") ||
    req.nextUrl.pathname.startsWith("/loyaltyCard") ||
    req.nextUrl.pathname.startsWith("/profile");

  if (isProtectedRoute && !user) {
    const loginUrl = req.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/appointment",
    "/appointment/:path*",
    "/reviews",
    "/reviews/:path*",
    "/myAppointments",
    "/myAppointments/:path*",
    "/myReviews",
    "/myReviews/:path*",
    "/loyaltyCard",
    "/loyaltyCard/:path*",
    "/profile",
    "/profile/:path*",
  ],
};