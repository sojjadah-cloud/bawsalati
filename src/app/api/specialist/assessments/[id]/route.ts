import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireSpecialist, ApiError } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";

const patchSchema = z.object({
  specialistNotes: z.string().trim().max(4000).optional().or(z.literal("")),
  recommendation: z.string().trim().max(4000).optional().or(z.literal("")),
  /** true = اعتماد النتيجة، false = سحب الاعتماد، غياب الحقل = حفظ بلا تغيير الاعتماد */
  approve: z.boolean().optional(),
});

/**
 * تحليل الأخصائي وتوصيته واعتماد النتيجة.
 * التحليل يكتبه الأخصائي بنفسه؛ النظام لا يولّده ولا يقترحه.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSpecialist();
    const { id } = await params;
    const input = await parseBody(req, patchSchema);

    const result = await prisma.assessmentResult.findUnique({
      where: { sessionId: id },
      select: { id: true, approvedAt: true },
    });
    if (!result) throw new ApiError("النتيجة غير موجودة", 404);

    const approvalChange =
      input.approve === undefined
        ? {}
        : input.approve
          ? { approvedById: session.id, approvedAt: new Date() }
          : { approvedById: null, approvedAt: null };

    await prisma.assessmentResult.update({
      where: { id: result.id },
      data: {
        specialistNotes: input.specialistNotes?.trim() || null,
        recommendation: input.recommendation?.trim() || null,
        ...approvalChange,
      },
    });

    await audit(
      input.approve === undefined
        ? "RESULT_NOTES"
        : input.approve
          ? "RESULT_APPROVE"
          : "RESULT_UNAPPROVE",
      "AssessmentResult",
      { actor: session, entityId: result.id, ip: clientIp(req) }
    );

    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
