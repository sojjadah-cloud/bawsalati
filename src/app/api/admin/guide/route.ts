import { json, errorResponse, parseBody, requireAdmin } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { guideSchema, publishGuideVersion } from "@/features/guide/service";

/** نشر إصدار جديد من دليل الطالب. */
export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const input = await parseBody(req, guideSchema);
    const created = await publishGuideVersion(input, session.id);

    await audit("GUIDE_PUBLISH", "GuideDocument", {
      actor: session,
      entityId: created.id,
      meta: { version: created.version },
      ip: clientIp(req),
    });
    return json({ guide: created }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
