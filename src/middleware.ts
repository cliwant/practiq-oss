import { NextRequest, NextResponse } from "next/server";
// import { getToken } from "next-auth/jwt";

// TODO: Re-enable auth middleware after mockup phase
// Currently bypassed so UI mockups can be viewed without auth setup
export async function middleware(request: NextRequest) {
  return NextResponse.next();

  /* Original auth check — re-enable when ready:
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
  */
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/clients/:path*",
    "/api/chat/:path*",
    "/api/documents/:path*",
  ],
};
