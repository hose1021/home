import {NextResponse} from "next/server";
import {getPermissionsForRoles} from "@/core/auth/permissions";
import {getSession} from "@/core/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      ...session.user,
      permissions: getPermissionsForRoles(session.user.roles),
    },
  });
}
