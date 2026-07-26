import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { GATE_COOKIE, isGateEnabled, verifyGateToken } from "@/lib/site-gate";

export default auth(async (req) => {
  const { pathname, search, origin } = req.nextUrl;

  // --- Site access gate: one shared password in front of the whole app ---
  if (isGateEnabled() && !pathname.startsWith("/gate")) {
    const ok = await verifyGateToken(req.cookies.get(GATE_COOKIE)?.value);
    if (!ok) {
      const url = new URL("/gate", origin);
      if (pathname !== "/") url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  }

  // --- Per-user auth (staff dashboard / client portal) ---
  const isLoggedIn = !!req.auth;
  const userType = req.auth?.user?.userType;
  const isDashboard = pathname.startsWith("/dashboard");
  const isPortal = pathname.startsWith("/portal") && !pathname.startsWith("/portal/login");

  if (isDashboard && (!isLoggedIn || userType !== "staff")) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  if (isPortal && (!isLoggedIn || userType !== "client")) {
    return NextResponse.redirect(new URL("/portal/login", origin));
  }
});

export const config = {
  // Run on everything except Next internals and static asset files, so the gate
  // covers the whole site (the callback itself exempts the /gate route).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
