import { Users } from "lucide-react";
import { totalVisitors } from "@/features/analytics/visits";

/**
 * عدّاد الزوّار في التذييل.
 *
 * رقمٌ واحد لا أكثر: كم زائراً مختلفاً زار المنصة. وإن تعذّرت القاعدة
 * لم يظهر العدّاد ولم تسقط الصفحة — تذييلٌ بلا رقم خيرٌ من موقعٍ ساقط.
 */
export async function VisitorCounter() {
  let total = 0;
  try {
    total = await totalVisitors();
  } catch {
    return null;
  }

  if (total === 0) return null;

  return (
    <p className="flex items-center gap-1.5" title="عدد من زار المنصة">
      <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        زارنا{" "}
        <span className="font-bold tabular-nums text-[var(--color-muted)]">
          {new Intl.NumberFormat("ar-OM").format(total)}
        </span>{" "}
        {total === 1 ? "زائر" : total === 2 ? "زائران" : total <= 10 ? "زوّار" : "زائراً"}
      </span>
    </p>
  );
}
