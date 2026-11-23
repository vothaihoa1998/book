import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabasePublicEnv } from "./lib/supabase/env";
import type { Database } from "./lib/supabase/types";

export async function proxy(request: NextRequest) {
  // Keep OAuth PKCE cookies, bookmarks and reading history on one origin.
  // Redirect only public browser navigation to our production deployment URLs;
  // preview deployments stay independently testable.
  const hostname = request.nextUrl.hostname;
  if (
    process.env.VERCEL_ENV === "production" &&
    request.method === "GET" &&
    hostname !== "mangainkrail.vercel.app" &&
    (hostname === "book-thvapp.vercel.app" ||
      hostname === "book-git-main-thvapp.vercel.app" ||
      /^book-[a-z0-9]+-thvapp\.vercel\.app$/.test(hostname)) &&
    !request.nextUrl.pathname.startsWith("/api/")
  ) {
    const canonical = new URL(request.nextUrl.pathname + request.nextUrl.search, "https://mangainkrail.vercel.app");
    return NextResponse.redirect(canonical, 308);
  }

  const env = getSupabasePublicEnv();
  if (!env) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!api/public/image(?:/|$)|_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|manifest.webmanifest|robots.txt|sitemap.xml|rss.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
