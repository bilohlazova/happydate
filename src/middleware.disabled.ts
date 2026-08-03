import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSupabasePublicConfig } from "@/lib/supabase/publicConfig";

export async function middleware(req: NextRequest) {
  // Дозволені публічні маршрути
  const publicRoutes = ["/", "/auth/login", "/auth/callback", "/pricing"];
  if (publicRoutes.some((path) => req.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Supabase client на сервері
  const publicSupabaseConfig = requireSupabasePublicConfig();
  const supabase = createClient(
    publicSupabaseConfig.url,
    publicSupabaseConfig.key,
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    }
  );

  // Перевіряємо сесію
  const { data } = await supabase.auth.getUser();

  if (!data?.user) {
    // Якщо немає користувача — відправляємо на /auth/login
    const loginUrl = new URL("/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
