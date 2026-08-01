import {type NextRequest, NextResponse} from "next/server";
import {authenticateUser, createSession} from "@/core/auth/auth";
import {getSessionCookieName} from "@/core/auth/session";
import {z} from "zod";
import {clearLoginFailures, isLoginRateLimited, recordLoginFailure} from "@/core/auth/login-rate-limit";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(1024),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const ip = getClientIp(request);
    if (isLoginRateLimited(ip, parsed.data.username)) {
      return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
    }

    const user = await authenticateUser(parsed.data.username, parsed.data.password);
    if (!user) {
      recordLoginFailure(ip, parsed.data.username);
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    clearLoginFailures(ip, parsed.data.username);

    const { token } = await createSession(
      user.id,
      user.tenantId,
      ip,
      request.headers.get("user-agent") ?? undefined,
    );

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        tenantId: user.tenantId,
      },
    });

    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

function getClientIp(request: NextRequest): string | undefined {
  const value = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return value?.slice(0, 45) || undefined;
}
