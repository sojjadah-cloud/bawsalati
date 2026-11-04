/**
 * العنوان العام للتطبيق.
 *
 * يُستعمل في الروابط المطلقة: خريطة الموقع، وrobots، والرابط المعياري
 * (canonical)، وصور المشاركة، وروابط البريد. ولذلك يجب أن يكون **عنواناً
 * واحداً** لا يتبدّل: إن تبدّل رأت محرّكات البحث الصفحة نفسها على عناوين
 * عدّة فتوزّع وزنها بينها، أو فهرست عنواناً ميتاً.
 *
 * الترتيب مقصود:
 *   1. APP_URL إن ضُبط — الكلمة الأخيرة لصاحب النشر.
 *   2. دومين المنصة الرسمي في الإنتاج — فلا يتسرّب عنوان المنصة المستضيفة
 *      (onrender.com) إلى الفهرسة ولو نُشرت نسخةٌ ثانية.
 *   3. عنوان المنصة المستضيفة، للمعاينات والنسخ التجريبية.
 *   4. localhost للتطوير.
 */

/** الدومين الرسمي الوحيد للمنصة. */
export const CANONICAL_URL = "https://www.bawsalati.com";

/** نسخة معاينةٍ من فرعٍ غير main — عنوانها عنوان المعاينة لا الدومين. */
function isPreviewDeploy(): boolean {
  return process.env.RENDER_SERVICE_TYPE === "preview" || process.env.VERCEL_ENV === "preview";
}

/**
 * عنوان الخدمة الذي تحقنه المنصة المستضيفة. وجوده دليلُ نشرٍ حقيقي،
 * وغيابه دليلُ تشغيلٍ محلي — وهذا أوثق من NODE_ENV، فقيمته تختلف بين
 * `next start` ومشغّلات المعاينة وأدوات الاختبار.
 */
function platformUrl(): string {
  return clean(process.env.RENDER_EXTERNAL_URL) || clean(process.env.VERCEL_PROJECT_PRODUCTION_URL);
}

function clean(url: string | undefined): string {
  if (!url) return "";
  const withScheme = /^https?:\/\//u.test(url) ? url : `https://${url}`;
  return withScheme.replace(/\/+$/u, "");
}

export function appUrl(): string {
  const explicit = clean(process.env.APP_URL);
  if (explicit) return explicit;

  const platform = platformUrl();

  // معاينةٌ مؤقّتة: عنوانها هو عنوانها، ولا تُنسب صفحاتها إلى الدومين
  if (platform && isPreviewDeploy()) return platform;

  // نشرٌ حقيقي بلا APP_URL: الدومين الرسمي لا عنوان المنصة المستضيفة،
  // فعنوانها لو تسرّب إلى الفهرسة نافَس الدومين على الصفحات نفسها —
  // أو فُهرس عنوانُ خدمةٍ محذوفة كما حدث مع bawsalati-1.onrender.com.
  if (platform) return CANONICAL_URL;

  return "http://localhost:3000";
}
