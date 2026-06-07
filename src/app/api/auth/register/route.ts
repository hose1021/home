import { NextRequest, NextResponse } from "next/server";
import { createUser, createSession } from "@/core/auth/auth";
import { getSessionCookieName } from "@/core/auth/session";
import { db } from "@/core/db";
import { tenants } from "@/core/db/schema/tenants";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { username, password, name, tenantSlug } = await request.json();

    if (!username || !password || !name) {
      return NextResponse.json({ error: "Username, password, and name required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const slug = tenantSlug || "demo-mmmc";
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const user = await createUser({
      tenantId: tenant.id,
      username,
      password,
      fullName: name,
    });

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
        tenantSlug: tenant.slug,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
