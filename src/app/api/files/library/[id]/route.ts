import { errorResponse, ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { readStoredFile, safeDownloadName } from "@/lib/storage";
import { getResourceFile, touchResource } from "@/features/library/service";

/**
 * تقديم ملف مورد من المكتبة.
 * مفتاح التخزين لا يظهر للمتصفح إطلاقاً — الوصول بمعرّف المورد فقط،
 * وبعد فحص النشر وصلاحية التنزيل.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") === "download" ? "download" : "view";
    const kind = url.searchParams.get("kind") === "audio" ? "audio" : "file";

    const found = await getResourceFile(id, kind);
    if (!found) throw new ApiError("الملف غير موجود", 404);

    const session = await getSession();
    const isStaff = !!session;

    if (!found.resource.published && !isStaff) {
      throw new ApiError("هذا المورد غير متاح حالياً", 404);
    }
    if (mode === "download" && !found.resource.downloadable && !isStaff) {
      throw new ApiError("تنزيل هذا المورد غير متاح", 403);
    }

    const buffer = await readStoredFile(found.file.storageKey);
    if (mode === "view") touchResource(id);

    const ext = found.file.mimeType.split("/")[1] ?? "bin";
    const filename = safeDownloadName(found.resource.title, ext);

    const headers = new Headers({
      "Content-Type": found.file.mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `${mode === "download" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });

    // دعم الطلب الجزئي حتى يمكن التنقّل داخل الملفات الصوتية.
    const range = req.headers.get("range");
    if (range && kind === "audio") {
      const match = /bytes=(\d*)-(\d*)/u.exec(range);
      if (match) {
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Number(match[2]) : buffer.length - 1;
        if (start < buffer.length && end < buffer.length && start <= end) {
          const slice = buffer.subarray(start, end + 1);
          headers.set("Content-Length", String(slice.length));
          headers.set("Content-Range", `bytes ${start}-${end}/${buffer.length}`);
          headers.set("Accept-Ranges", "bytes");
          return new Response(new Uint8Array(slice), { status: 206, headers });
        }
      }
    }
    if (kind === "audio") headers.set("Accept-Ranges", "bytes");

    return new Response(new Uint8Array(buffer), { status: 200, headers });
  } catch (e) {
    return errorResponse(e);
  }
}
