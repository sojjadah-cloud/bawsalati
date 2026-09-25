import type { PublicResource } from "@/features/library/service";

/**
 * مصدر صورة الغلاف:
 *   1. غلاف مولَّد من أوّل صفحة في الملف عند رفعه.
 *   2. النشرة المصوّرة غلافها صورتها نفسها، فلا داعي لتوليد شيء.
 *   3. رابط خارجي إن كُتب يدوياً.
 * وإن لم يوجد شيء، تُرسم لوحة داخل المنصة بلا صورة.
 */
export function coverSrc(
  r: Pick<PublicResource, "id" | "type" | "hasFile" | "hasCover" | "coverUrl">
): string | null {
  if (r.hasCover) return `/api/files/library/${r.id}?kind=cover`;
  if (r.type === "IMAGE" && r.hasFile) return `/api/files/library/${r.id}?kind=file`;
  return r.coverUrl || null;
}
