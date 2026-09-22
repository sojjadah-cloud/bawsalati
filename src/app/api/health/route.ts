/**
 * فحص حياة الخادم. لا يلمس قاعدة البيانات ولا يقرأ جلسة، فهو أرخص مسار يوقظ
 * الخدمة على خطة Render المجانية التي تُنيم الخادم بعد ربع ساعة من السكون.
 * يُنادى من خدمة فحص خارجية كل عشر دقائق ليبقى الموقع مستيقظاً.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(JSON.stringify({ ok: true, at: new Date().toISOString() }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
