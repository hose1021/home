import {type NextRequest, NextResponse} from "next/server";
import {z} from "zod";
import {createSession, createUser} from "@/core/auth/auth";
import {applySessionCookie, clientIp} from "@/core/auth/http";
import {getTenantSlug} from "@/core/config";
import {resolveTenantId} from "@/core/multi-tenant";
import {passwordSchema, usernameSchema} from "@/core/validation/action-schemas";
import {getTenantById} from "@/modules/tenant/tenant.service";

const registrationSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
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
    const tenantId = await resolveTenantId(getTenantSlug());
    const tenant = tenantId ? await getTenantById(tenantId) : null;

    if (!tenant || tenant.status !== "active") {
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
      clientIp(request),
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

    applySessionCookie(response, token);
    return response;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
