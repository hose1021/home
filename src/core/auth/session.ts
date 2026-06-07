import { cookies } from "next/headers";
import { getSessionFromToken } from "./auth";

const SESSION_COOKIE = "session_token";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const user = await getSessionFromToken(token);
  if (!user) return null;

  return { user };
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
