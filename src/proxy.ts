import type {NextRequest} from "next/server";
import createMiddleware from "next-intl/middleware";
import {routing} from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Every /api route bypasses intl routing and must authenticate itself
// (getSession + permission check in the route handler, as /api/auth does).
const publicPaths = ["/api", "/_next", "/favicon.ico"];

export function proxy(request: NextRequest) {
  const {pathname} = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
