import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

/**
 * طبقة تسبق كل طلب: ترويسات الأمان + فحص مبدئي للصلاحية.
 *
 * الفحص هنا تفاؤلي لتحسين تجربة التنقّل فقط.
 * التفويض الحقيقي يجري في كل مسار وخدمة على حدة (requireRole / requireSpecialist).
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isDev = process.env.NODE_ENV === "development";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // أنماط سطرية مسموحة: React يمرّر خصائص style، وخطر حقنها أدنى بكثير من السكربتات
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "connect-src 'self'",
    // عارض المستندات يحتاج إطاراً من المصدر نفسه فقط — لا شيء خارجي
    "object-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const protectedArea = pathname.startsWith("/specialist") || pathname.startsWith("/admin");

  let response: NextResponse;

  if (protectedArea) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      response = NextResponse.redirect(url);
    } else if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
      response = NextResponse.redirect(new URL("/specialist", req.url));
    } else if (pathname.startsWith("/specialist") && session.role !== "SPECIALIST") {
      response = NextResponse.redirect(new URL("/admin", req.url));
    } else {
      response = NextResponse.next({ request: { headers: requestHeaders } });
    }
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  response.headers.set("Content-Security-Policy", csp);
  // الصفحات المحمية لا تُخزَّن في الوسيط ولا في المتصفح
  if (protectedArea) {
    response.headers.set("Cache-Control", "no-store, must-revalidate");
  }

  return response;
}

export const config = {
  // يستثني الأصول الثابتة وملفات التحسين حتى لا تُعالَج بلا داعٍ
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)",
  ],
};
