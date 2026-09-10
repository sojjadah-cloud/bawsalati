/**
 * مسح بيانات التجربة التشغيلية ليبدو النظام كأنه جديد.
 *
 *   npm run reset:demo
 *
 * يحذف: جلسات الاختبار ونتائجها، والحجوزات وسجلّها وإشعاراتها،
 * وتنبيهات اللوحة، والأسئلة غير المُجابة.
 *
 * لا يمسّ: الحسابات، وبنية المقياس، وجداول التحويل، والمكتبة،
 * وبنك أسئلة جويب، ودليل الطالب، وسجل التدقيق.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log("\n🧹 مسح بيانات التجربة\n");

  const counts = {
    sessions: await prisma.assessmentSession.count(),
    appointments: await prisma.appointment.count(),
    notifications: await prisma.inAppNotification.count(),
    unanswered: await prisma.unansweredQuestion.count(),
  };

  // الحذف بالتسلسل يحترم القيود: النتائج والإجابات تسقط مع الجلسة (Cascade).
  await prisma.notificationDelivery.deleteMany({});
  await prisma.appointmentHistory.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.assessmentSession.deleteMany({});
  await prisma.inAppNotification.deleteMany({});
  await prisma.unansweredQuestion.deleteMany({});
  await prisma.faqEntry.updateMany({ data: { matchCount: 0 } });
  await prisma.libraryResource.updateMany({ data: { viewCount: 0 } });

  console.log(`  ✔ جلسات الاختبار: ${counts.sessions}`);
  console.log(`  ✔ الحجوزات: ${counts.appointments}`);
  console.log(`  ✔ التنبيهات: ${counts.notifications}`);
  console.log(`  ✔ الأسئلة غير المُجابة: ${counts.unanswered}`);
  console.log("  ✔ صُفّرت عدّادات المشاهدة والمطابقة");
  console.log("\n✅ النظام الآن بلا بيانات تشغيلية.\n");
}

main()
  .catch((e) => {
    console.error("❌ فشل المسح:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
