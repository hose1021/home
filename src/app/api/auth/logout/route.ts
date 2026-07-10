import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {getSessionCookieName} from "@/core/auth/session";
import {deleteSession} from "@/core/auth/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (token) {
    await deleteSession(token);
    cookieStore.delete(getSessionCookieName());
  }

  return NextResponse.json({ success: true });
}
