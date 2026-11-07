import type {NextRequest, NextResponse} from "next/server";
import {SESSION_DURATION_MS} from "./auth";
import {getSessionCookieName} from "./session";

export function clientIp(request: NextRequest): string | undefined {
  const value = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return value?.slice(0, 45) || undefined;
}

export function applySessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}
