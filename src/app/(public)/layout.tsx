import { headers } from "next/headers";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { AskLauncher } from "@/components/faq/AskLauncher";
import { clientIp } from "@/lib/audit";
import { recordVisitSafely } from "@/features/analytics/visits";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // تُحصى الزيارة هنا مرةً واحدة لكل صفحة عامة. تُستدعى ولا تُنتظر،
  // فلا يتأخّر عرض الصفحة على كتابةٍ في قاعدة البيانات ولا يسقط بها.
  const h = await headers();
  recordVisitSafely({
    path: h.get("x-pathname") ?? "/",
    ip: clientIp(new Request("http://x", { headers: h })),
    userAgent: h.get("user-agent") ?? "",
    // Next يجلب الصفحة مسبقاً عند تمرير المؤشّر — وليست زيارة
    prefetch: h.get("next-router-prefetch") === "1" || h.get("purpose") === "prefetch",
  });

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        تخطّي إلى المحتوى
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <AskLauncher />
    </div>
  );
}
