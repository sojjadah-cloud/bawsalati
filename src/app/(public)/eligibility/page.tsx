import type { Metadata } from "next";
import { programCount } from "@/features/programs/service";
import { PageHero } from "@/components/public/PageHero";
import { EligibilityWizard } from "@/components/programs/EligibilityWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "أي تخصص أستطيع دخوله؟",
  description:
    "اختر صفّك وموادك ودرجاتك، لتعرف التخصصات التي تنطبق عليك شروطها ومعدّلك التنافسي في كل برنامج.",
};

export default async function EligibilityPage() {
  const total = await programCount();

  return (
    <>
      <PageHero
        title="أي تخصص أستطيع دخوله؟"
        description={`اختر صفّك وموادك، فتُطابَق شروط ${total} برنامجاً في الدليل بما تدرسه ودرجاتك.`}
      />
      <div className="container-x py-10 sm:py-14">
        <EligibilityWizard />
      </div>
    </>
  );
}
