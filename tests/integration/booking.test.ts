/**
 * اختبارات تكامل تلمس قاعدة البيانات فعلاً.
 * تنشئ بياناتها الخاصة تحت بادئة test- وتحذفها بعد الانتهاء،
 * ولا تمسّ أي بيانات أخرى.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { isoDateToUtc, addDaysIso, todayIso } from "@/lib/time";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SUFFIX = `test-${Date.now()}`;
let userId = "";
let specialistId = "";
let topicId = "";
const testDate = addDaysIso(todayIso(), 30);

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      name: "مختص اختبار",
      email: `${SUFFIX}@example.test`,
      passwordHash: "x".repeat(60),
      role: "SPECIALIST",
      specialistProfile: { create: { title: "اختبار", notifyPhone: null } },
    },
    select: { id: true, specialistProfile: { select: { id: true } } },
  });
  userId = user.id;
  specialistId = user.specialistProfile!.id;

  topicId = (
    await prisma.consultationTopic.create({
      data: { name: "موضوع اختبار", slug: SUFFIX, displayOrder: 999, active: true },
      select: { id: true },
    })
  ).id;
});

afterAll(async () => {
  await prisma.appointment.deleteMany({ where: { specialistId } });
  await prisma.specialistAvailability.deleteMany({ where: { specialistId } });
  await prisma.consultationTopic.deleteMany({ where: { slug: SUFFIX } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

function appointmentData(startTime: string, studentName: string) {
  return {
    specialistId,
    studentName,
    grade: "11",
    phone: "92000000",
    topicId,
    scheduledDate: isoDateToUtc(testDate),
    startTime,
    endTime: "09:00",
    tokenHash: `${SUFFIX}-${startTime}-${studentName}`,
  };
}

describe("منع الحجز المزدوج على مستوى قاعدة البيانات", () => {
  it("يرفض حجزين على نفس المختص والتاريخ والوقت", async () => {
    await prisma.appointment.create({ data: appointmentData("08:00", "طالب أول") });

    await expect(
      prisma.appointment.create({ data: appointmentData("08:00", "طالب ثانٍ") })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("يسمح بفترة مختلفة في اليوم نفسه", async () => {
    const created = await prisma.appointment.create({
      data: appointmentData("09:30", "طالب ثالث"),
    });
    expect(created.startTime).toBe("09:30");
  });

  it("يمنع التزاحم حتى عند إرسال طلبين في اللحظة نفسها", async () => {
    const results = await Promise.allSettled([
      prisma.appointment.create({ data: appointmentData("11:00", "متزامن أ") }),
      prisma.appointment.create({ data: appointmentData("11:00", "متزامن ب") }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });
});

describe("تخزين التواريخ", () => {
  it("يحفظ التاريخ ويقرؤه بلا انزلاق يوم", async () => {
    const row = await prisma.appointment.findFirst({
      where: { specialistId, startTime: "09:30" },
      select: { scheduledDate: true },
    });
    expect(row?.scheduledDate.toISOString().slice(0, 10)).toBe(testDate);
  });
});

describe("سلامة العلاقات", () => {
  it("يمنع حذف موضوع مرتبط بحجز", async () => {
    // القاعدة ترفض الحذف بقيد RESTRICT، وتظهر الرسالة من محرّك PostgreSQL مباشرة.
    await expect(prisma.consultationTopic.delete({ where: { id: topicId } })).rejects.toThrow(
      /RESTRICT|foreign key/iu
    );
  });
});
