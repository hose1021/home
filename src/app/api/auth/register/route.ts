import {type NextRequest, NextResponse} from "next/server";
import {createSession, createUser} from "@/core/auth/auth";
import {getSessionCookieName} from "@/core/auth/session";
import {getTenantSlug} from "@/core/config";
import {db} from "@/core/db";
import {tenants} from "@/core/db/schema/tenants";
import {and, eq} from "drizzle-orm";
import {z} from "zod";

const registrationSchema = z.object({
  username: z.string().trim().min(3).max(100).regex(/^\p{L}+\.\p{L}+$/u),
  password: z.string().min(8).max(1024),
  name: z.string().trim().min(2).max(255),
});

export async function POST(request: NextRequest) {
  if (process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
    return NextResponse.json({ error: "Public registration is disabled" }, { status: 403 });
  }

  try {
    const parsed = registrationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid registration data" }, { status: 400 });
    }

    const { username, password, name } = parsed.data;
    const slug = getTenantSlug();
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, slug), eq(tenants.status, "active")))
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
      getClientIp(request),
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
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

function getClientIp(request: NextRequest): string | undefined {
  const value = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return value?.slice(0, 45) || undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
