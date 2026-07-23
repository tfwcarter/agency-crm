import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const userType = req.auth?.user?.userType;
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isPortal = req.nextUrl.pathname.startsWith("/portal") && !req.nextUrl.pathname.startsWith("/portal/login");

  if (isDashboard && (!isLoggedIn || userType !== "staff")) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (isPortal && (!isLoggedIn || userType !== "client")) {
    return NextResponse.redirect(new URL("/portal/login", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*"],
};
