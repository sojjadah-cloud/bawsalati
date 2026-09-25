import type { Metadata } from "next";
import { AskChat } from "@/components/faq/AskChat";
import { PageHero } from "@/components/public/PageHero";

export const metadata: Metadata = {
  title: "اسألني",
  description:
    "اسألني عن التخصصات والاختبار والمكتبة والمواعيد، واحصل على إجابة فورية أو تحويل إلى أخصائي التوجيه المهني.",
};

export default function AskPage() {
  return (
    <>
      <PageHero
        back={{ href: "/", label: "رجوع إلى الرئيسية" }}
        title="اسألني"
        description="اكتب سؤالك بأي صيغة. «اسألني» يبحث في بنك أسئلة أعدّه أخصائي التوجيه المهني، وما لا يجده يحيلك إليه."
      />

      <div className="container-narrow py-10 sm:py-14">
        <AskChat />

        <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">
          «اسألني» لا يؤلّف إجابات. يعرض ما هو مخزّن فقط، ويسجّل الأسئلة التي لا يجدها
          ليضيف الأخصائي إجاباتها لاحقاً. لا يُحفظ مع سؤالك أي بيان يعرّف بك.
        </p>
      </div>
    </>
  );
}
