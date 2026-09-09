import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { EmptyState, PageHeading } from "@/components/ui/primitives";
import { Pagination } from "@/components/dashboard/FilterBar";

export const metadata: Metadata = {
  title: "سجل النظام",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        actorName: true,
        action: true,
        entity: true,
        meta: true,
        ip: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeading
        title="سجل النظام"
        description="سجل غير قابل للتعديل بالعمليات الحسّاسة. لا يحتوي إجابات طلاب ولا أرقام هواتف."
      />

      {entries.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="السجل فارغ" description="ستظهر هنا العمليات فور حدوثها." />
        </div>
      ) : (
        <div className="table-wrap mt-6">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">الوقت</th>
                <th scope="col">المستخدم</th>
                <th scope="col">العملية</th>
                <th scope="col">الكيان</th>
                <th scope="col">تفاصيل</th>
                <th scope="col">IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap tabular-nums text-xs">
                    {e.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="text-xs">{e.actorName ?? "—"}</td>
                  <td className="text-xs font-bold" dir="ltr">
                    {e.action}
                  </td>
                  <td className="text-xs" dir="ltr">
                    {e.entity}
                  </td>
                  <td className="max-w-64 truncate text-xs text-[var(--color-muted)]" dir="ltr">
                    {e.meta ? JSON.stringify(e.meta) : "—"}
                  </td>
                  <td className="text-xs" dir="ltr">
                    {e.ip ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} className="mt-8" />
    </>
  );
}
