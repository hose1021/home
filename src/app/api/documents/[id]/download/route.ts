import {NextResponse} from "next/server";
import {hasPermission} from "@/core/auth/permissions";
import {getSession} from "@/core/auth/session";
import {DocumentError, getDocumentObject} from "@/modules/document/document.service";

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({error: "Not authenticated"}, {status: 401});
  }
  const allowed = session.user.roles.some((role) => hasPermission(role, "document:read"));
  if (!allowed) {
    return NextResponse.json({error: "Forbidden"}, {status: 403});
  }

  const {id} = await params;
  try {
    const {document, bytes} = await getDocumentObject(session.user.tenantId, id);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(document.sizeBytes),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.originalFileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof DocumentError && err.code === "not_found") {
      return NextResponse.json({error: "Not found"}, {status: 404});
    }
    throw err;
  }
}
