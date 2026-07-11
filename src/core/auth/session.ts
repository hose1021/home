import {cookies} from "next/headers";
import {getSessionFromToken} from "./auth";
import type {Permission, Role} from "./permissions";
import {hasPermission} from "./permissions";
import {ForbiddenError, UnauthorizedError} from "@/core/errors/app-error";

const SESSION_COOKIE = "session_token";

export type Session = {
  user: {
    id: string;
    tenantId: string;
    username: string;
    fullName: string;
    roles: Role[];
  };
};

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const user = await getSessionFromToken(token);
  if (!user) return null;

  return { user };
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

export async function requirePermission(permission: Permission): Promise<Session> {
  const session = await requireAuth();
  const allowed = session.user.roles.some((role) => hasPermission(role, permission));
  if (!allowed) throw new ForbiddenError(`Missing permission "${permission}"`);
  return session;
}

export async function requireTenantContext(): Promise<{ session: Session; tenantId: string }> {
  const session = await requireAuth();
  return { session, tenantId: session.user.tenantId };
}

export async function requireTenantPermission(permission: Permission): Promise<{ session: Session; tenantId: string }> {
  const { session, tenantId } = await requireTenantContext();
  const allowed = session.user.roles.some((role) => hasPermission(role, permission));
  if (!allowed) throw new ForbiddenError(`Missing permission "${permission}"`);
  return { session, tenantId };
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
