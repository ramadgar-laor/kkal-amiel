import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export type Role = "rep" | "kkal" | "amiel" | "admin";

// Which top-level route prefix each role is allowed into.
const ROLE_HOME: Record<Role, string> = {
  rep: "/rep",
  kkal: "/kkal",
  amiel: "/amiel",
  admin: "/admin",
};

const PUBLIC_PATHS = ["/login", "/register", "/auth"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/public")
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;
  const pathname = request.nextUrl.pathname;

  // Not logged in and hitting a protected route -> send to /login
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Logged in: figure out the role and enforce that each role only
  // reaches its own section of the app.
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile?.role as Role | undefined) ?? "rep";
    const home = ROLE_HOME[role];

    const onLoginOrRegister =
      pathname === "/login" || pathname.startsWith("/register");

    if (onLoginOrRegister || pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }

    const otherRoleRoots = Object.values(ROLE_HOME).filter((r) => r !== home);
    if (otherRoleRoots.some((root) => pathname.startsWith(root))) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
