import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {deleteSession} from "@/core/auth/auth";
import {getSessionCookieName} from "@/core/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (token) {
    await deleteSession(token);
    cookieStore.delete(getSessionCookieName());
  }

  return NextResponse.json({ success: true });
}
