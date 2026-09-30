/**
 * تجهيز كتب المكتبة: نسخها بأسماء ثابتة وتوليد غلاف من أوّل صفحة.
 *
 *   npm i -g @napi-rs/canvas            # أو في أي مجلد، ويُمرَّر مساره
 *   CANVAS_PKG=<مسار @napi-rs/canvas> node scripts/make-library-covers.mjs <مجلد الكتب>
 *
 * يُشغَّل مرةً عند إضافة كتب جديدة، لا في كل نشر: الملفات والأغلفة تُحفظ في
 * content/library ثم يدخلها npm run library:import إلى القاعدة والتخزين.
 *
 * الرسم خارج المتصفّح يحتاج مكتبة canvas أصيلة، ولذلك لا تُثبَّت في المشروع:
 * البناء لا يحتاجها، ولا داعي لأن يحملها الخادم.
 */
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const SRC = process.argv[2] ?? ".books-src";
const OUT = "content/library";
const COVER_WIDTH = 480;

/** جزءٌ مميِّز من اسم الملف الأصلي ← الاسم الثابت في المستودع */
const BOOKS = [
  ["002 أساليب المشاركة", "decision-participation"],
  ["101 مهارة تخاطب", "talking-skills-101"],
  ["إدارة الاعمال", "business-administration"],
  ["إعرف شخصيتك", "know-personalities"],
  ["اتخاذ القرار 3", "decision-making"],
  ["اعرف نفسك", "know-yourself"],
  ["انهض لوحدك", "rise-on-your-own"],
  ["تخطي الصعاب", "overcoming-hardship"],
  ["دليل التفوق", "student-excellence-guide"],
  ["صناعة واتخاذ القرار", "decision-craft"],
  ["فن واسرار اتخاذ القرار", "decision-art"],
  ["كيف تختار تخصصك", "choose-your-major"],
  ["الإقناع", "persuasion"],
];

const canvasPath = process.env.CANVAS_PKG ?? "@napi-rs/canvas";
const canvasPkg = await import(canvasPath).catch(() => {
  console.error(
    "لم تُوجد @napi-rs/canvas. ثبّتها ومرّر مسارها:\n" +
      "  CANVAS_PKG=file:///…/node_modules/@napi-rs/canvas/index.js node scripts/make-library-covers.mjs"
  );
  process.exit(1);
});

// pdfjs يرسم بواجهات المتصفّح، فتُعار من مكتبة الرسم قبل تحميله
for (const name of ["Path2D", "DOMMatrix", "ImageData", "DOMPoint"]) {
  if (canvasPkg[name] && !globalThis[name]) globalThis[name] = canvasPkg[name];
}
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

await mkdir(join(OUT, "covers"), { recursive: true });
const files = await readdir(SRC);

for (const [needle, slug] of BOOKS) {
  const name = files.find((f) => f.includes(needle));
  if (!name) {
    console.log(`✗ لم يوجد: ${needle}`);
    continue;
  }
  const buffer = await readFile(join(SRC, name));
  await writeFile(join(OUT, `${slug}.pdf`), buffer);

  // disableFontFace: خارج المتصفّح لا FontFace، فتُرسم الحروف مساراتٍ وإلا خرجت بيضاء
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    verbosity: 0,
    disableFontFace: true,
    useSystemFonts: false,
  }).promise;

  // بعض الكتب تبدأ بصفحة بيضاء، فيُجرَّب ما بعدها حتى تُوجد صفحة فيها أثر حبر
  let webp = null;
  let used = 0;
  for (let p = 1; p <= Math.min(4, doc.numPages); p++) {
    const page = await doc.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: COVER_WIDTH / base.width });
    const canvas = canvasPkg.createCanvas(
      Math.round(viewport.width),
      Math.round(viewport.height)
    );
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    webp = await canvas.encode("webp", 82);
    used = p;
    if (webp.length > 4096) break;
  }

  // غلافٌ خرج أبيض لا يُحفظ: لوحة المنصة المرسومة خيرٌ من صورة فارغة
  if (webp.length > 4096) {
    await writeFile(join(OUT, "covers", `${slug}.webp`), webp);
  }

  console.log(
    `✔ ${slug}: ${doc.numPages} صفحة | ${(buffer.length / 1048576).toFixed(1)}MB | ` +
      (webp.length > 4096 ? `غلاف من ص${used}` : "بلا غلاف (الصفحات لم تُرسَم)")
  );
  await doc.cleanup();
}
