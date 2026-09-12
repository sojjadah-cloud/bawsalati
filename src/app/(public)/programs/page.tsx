import { redirect } from "next/navigation";

/**
 * دُمج دليل التخصصات في صفحة دليل الطالب: مصدرهما واحد، فلا معنى لصفحتين.
 * يبقى هذا المسار محوّلاً كي لا ينكسر رابط قديم أو مشاركة سابقة.
 */
export default async function ProgramsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string" && value) query.set(key, value);
  }
  const qs = query.toString();
  redirect(qs ? `/guide?${qs}` : "/guide");
}
