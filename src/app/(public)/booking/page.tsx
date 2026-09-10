import type { Metadata } from "next";
import { listActiveTopics, listBookableSpecialists } from "@/features/appointments/service";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { PageHero } from "@/components/public/PageHero";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "حجز موعد",
  description:
    "احجز استشارة فردية مع مختص التوجيه المهني في أحد الأوقات المتاحة، واختر موضوع الاستشارة.",
};

export default async function BookingPage() {
  const [specialists, topics] = await Promise.all([
    listBookableSpecialists(),
    listActiveTopics(),
  ]);

  return (
    <>
      <PageHero
        title="حجز موعد"
        description="اختر مختصاً ووقتاً متاحاً وموضوع الاستشارة. لا يحتاج حساباً."
      />

      <div className="container-narrow py-10 sm:py-14">
        <BookingWizard
          specialists={specialists.map((s) => ({
            id: s.id,
            name: s.name,
            title: s.title,
            bio: s.bio,
          }))}
          topics={topics.map((t) => ({
            id: t.id,
            name: t.name,
            requiresDetails: t.requiresDetails,
          }))}
        />
      </div>
    </>
  );
}
