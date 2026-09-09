import type { Metadata } from "next";
import { listActiveTopics, listBookableSpecialists } from "@/features/appointments/service";
import { BookingWizard } from "@/components/booking/BookingWizard";

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
    <div className="container-narrow py-10 sm:py-14">
      <p className="section-kicker">استشارة فردية</p>
      <h1 className="section-title">حجز موعد مع أخصائي التوجيه المهني</h1>
      <p className="section-lead">
        اختر المختص واليوم والوقت الذي يناسبك من الفترات المتاحة، وحدّد موضوع
        الاستشارة. الحجز لا يستغرق أكثر من دقيقة، ولا يحتاج حساباً.
      </p>

      <div className="mt-8">
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
    </div>
  );
}
