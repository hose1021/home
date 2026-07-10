import {type NextRequest, NextResponse} from "next/server";
import {authenticateUser, createSession} from "@/core/auth/auth";
import {getSessionCookieName} from "@/core/auth/session";
import {db} from "@/core/db";
import {tenants} from "@/core/db/schema/tenants";
import {eq} from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const [tenant] = await db
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    const { token } = await createSession(
      user.id,
      user.tenantId,
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined,
    );

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        tenantId: user.tenantId,
        tenantSlug: tenant?.slug ?? null,
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
