import { prisma } from "@/lib/prisma";
import { json, errorResponse, requireStaff, assertSameOrigin, ApiError } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import {
  inspectUpload,
  saveFile,
  UploadError,
  type StorageKind,
} from "@/lib/storage";

const ACCEPT: Record<StorageKind, string[]> = {
  LIBRARY: ["application/pdf"],
  GUIDE: ["application/pdf"],
  AUDIO: ["audio/mpeg", "audio/mp4"],
  COVER: ["image/jpeg", "image/png", "image/webp"],
  BULLETIN: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
};

/**
 * رفع ملف.
 * لا يُوثق بالنوع الذي يرسله العميل — يُقرأ التوقيع الثنائي للملف نفسه،
 * ويُولَّد اسم التخزين داخلياً، ويُكتب خارج المجلد العام.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const session = await requireStaff();

    const form = await req.formData().catch(() => {
      throw new ApiError("صيغة الطلب غير صحيحة", 400);
    });

    const kindRaw = String(form.get("kind") ?? "");
    if (!(kindRaw in ACCEPT)) throw new ApiError("نوع الرفع غير معروف", 400);
    const kind = kindRaw as StorageKind;

    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError("لم يتم إرفاق ملف", 400);

    const detected = await inspectUpload(file, kind, ACCEPT[kind]);
    const storageKey = await saveFile(detected, kind);

    const stored = await prisma.storedFile.create({
      data: {
        storageKey,
        // الاسم الأصلي يُحفظ للعرض فقط ولا يُستخدم في أي مسار
        originalName: file.name.slice(0, 200),
        mimeType: detected.mimeType,
        size: detected.size,
        checksum: detected.checksum,
        kind,
        uploadedById: session.id,
      },
      select: { id: true, originalName: true, size: true, mimeType: true },
    });

    await audit("FILE_UPLOAD", "StoredFile", {
      actor: session,
      entityId: stored.id,
      meta: { kind, size: detected.size, mimeType: detected.mimeType },
      ip: clientIp(req),
    });

    return json({ file: stored }, 201);
  } catch (e) {
    if (e instanceof UploadError) return errorResponse(new ApiError(e.message, e.status));
    return errorResponse(e);
  }
}
