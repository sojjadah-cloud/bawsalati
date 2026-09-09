import { json, errorResponse, assertSameOrigin } from "@/lib/api";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const session = await getSession();
    await clearSessionCookie();
    if (session) {
      await audit("LOGOUT", "User", { actor: session, entityId: session.id, ip: clientIp(req) });
    }
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
