import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {deleteSession} from "@/core/auth/auth";
import {getSessionCookieName} from "@/core/auth/session";
import {VIEW_AS_COOKIE} from "@/core/auth/view-as";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  cookieStore.delete(VIEW_AS_COOKIE);
  if (token) {
    await deleteSession(token);
    cookieStore.delete(getSessionCookieName());
  }

  return NextResponse.json({ success: true });
}
