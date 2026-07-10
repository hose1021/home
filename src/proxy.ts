import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";

const publicPaths = ["/login", "/register", "/api/auth", "/_next", "/favicon.ico"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const response = NextResponse.next();

  if (pathname.startsWith("/api/")) {
    const tenantId = request.headers.get("x-tenant-id");
    if (tenantId) {
      response.headers.set("x-tenant-id", tenantId);
    }
  }

  const slugMatch = pathname.match(/^\/([^/]+)\//);
  if (slugMatch) {
    response.headers.set("x-tenant-slug", slugMatch[1]);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
