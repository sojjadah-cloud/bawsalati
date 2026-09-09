import { errorResponse, ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { readStoredFile, safeDownloadName } from "@/lib/storage";
import { getPublishedGuide } from "@/features/guide/service";

/** تقديم ملف دليل الطالب المنشور. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") === "download" ? "download" : "view";

    const guide = await getPublishedGuide();
    if (!guide?.file) throw new ApiError("الدليل غير متاح حالياً", 404);

    if (mode === "download" && !guide.downloadable && !(await getSession())) {
      throw new ApiError("تنزيل الدليل غير متاح حالياً", 403);
    }

    const buffer = await readStoredFile(guide.file.storageKey);
    const filename = safeDownloadName(guide.title, "pdf");

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": guide.file.mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=600",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `${mode === "download" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
