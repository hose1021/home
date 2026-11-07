import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {ForbiddenError} from "@/core/errors/app-error";
import {getSessionFromToken, getSessionUserById, type SessionUser} from "./auth";
import {sessionAllows, type Permission} from "./permissions";
import {canActAs, parseViewAs, VIEW_AS_COOKIE, type ViewAs, applyViewAs} from "./view-as";

const SESSION_COOKIE = "session_token";

export type Session = {
  /** Effective identity: the actor, or the identity the actor is viewing as. */
  user: SessionUser;
  /** The real signed-in user, always authoritative for switching back. */
  actor: SessionUser;
  viewAs: ViewAs | null;
};

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const actor = await getSessionFromToken(token);
  if (!actor) return null;

  const mode = canActAs(actor) ? parseViewAs(cookieStore.get(VIEW_AS_COOKIE)?.value) : null;
  if (!mode) return {user: actor, actor, viewAs: null};

  const target = mode.kind === "user" ? await getSessionUserById(mode.userId, actor.tenantId) : null;
  const effective = applyViewAs(actor, mode, target);
  if (!effective) return {user: actor, actor, viewAs: null};

  return {user: effective, actor, viewAs: mode};
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireTenantContext(): Promise<{session: Session; tenantId: string}> {
  const session = await requireAuth();
  return {session, tenantId: session.user.tenantId};
}

export async function requireTenantPermission(permission: Permission): Promise<{session: Session; tenantId: string}> {
  const ctx = await requireTenantContext();
  if (!sessionAllows(ctx.session, permission)) throw new ForbiddenError(`Missing permission "${permission}"`);
  return ctx;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
