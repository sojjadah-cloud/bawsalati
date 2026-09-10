import type { Metadata } from "next";
import { JawibChat } from "@/components/faq/JawibChat";
import { PageHero } from "@/components/public/PageHero";

export const metadata: Metadata = {
  title: "جويب",
  description:
    "اسأل جويب عن التخصصات والاختبار والمكتبة والمواعيد، واحصل على إجابة فورية أو تحويل إلى مختص التوجيه المهني.",
};

export default function AskPage() {
  return (
    <>
      <PageHero
        title="جويب"
        description="اكتب سؤالك بأي صيغة. جويب يبحث في بنك أسئلة أعدّه مختص التوجيه المهني، وما لا يجده يحيلك إليه."
      />

      <div className="container-narrow py-10 sm:py-14">
        <JawibChat />

        <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">
          جويب لا يؤلّف إجابات. يعرض ما هو مخزّن فقط، ويسجّل الأسئلة التي لا يجدها
          ليضيف المختص إجاباتها لاحقاً. لا يُحفظ مع سؤالك أي بيان يعرّف بك.
        </p>
      </div>
    </>
  );
}
