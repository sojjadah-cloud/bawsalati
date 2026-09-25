/**
 * توليد غلاف من أوّل صفحة في ملف PDF، داخل المتصفح.
 *
 * يجري في جهاز الأخصائي لحظة الرفع، فلا يحمّل الخادم شيئاً، ولا يخرج الملف
 * إلى أي خدمة خارجية. وإن تعذّر التوليد لأي سبب تُعاد null وتبقى اللوحة
 * المرسومة داخل المنصة غلافاً، فلا يتعطّل الرفع.
 */
const COVER_WIDTH = 480;

export async function pdfFirstPageCover(file: File): Promise<File | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;
    const page = await doc.getPage(1);

    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: COVER_WIDTH / base.width });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) return null;

    // صفحات الكتب شفافة الخلفية، فتُملأ بالأبيض قبل الرسم
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85)
    );
    void doc.cleanup();
    if (!blob) return null;

    return new File([blob], "cover.webp", { type: "image/webp" });
  } catch {
    return null;
  }
}
