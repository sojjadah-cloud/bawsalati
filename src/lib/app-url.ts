/**
 * العنوان العام للتطبيق.
 * منصات الاستضافة تحقن عنوان الخدمة تلقائياً، فلا حاجة لضبطه يدوياً عند النشر.
 */
export function appUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    "http://localhost:3000"
  );
}
