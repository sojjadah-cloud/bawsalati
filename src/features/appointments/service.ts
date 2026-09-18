// خدمة الحجوزات: إنشاء آمن ضد التزاحم، وتغيير حالة موثّق.
import { Prisma, type AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { generateAccessToken, hashToken } from "@/lib/tokens";
import { isoDateToUtc } from "@/lib/time";
import {
  sendBookingNotification,
  sendBookingSummary,
  notifySpecialistInApp,
} from "@/lib/notifications";
import { GRADE_LABELS } from "@/lib/constants";
import { formatArabicDate, formatArabicTime } from "@/lib/time";
import { isSlotOffered } from "./availability";
import type { CreateAppointmentInput } from "./schemas";

/** المختصون المتاحون للحجز — بلا أي بيانات تواصل خاصة. */
export async function listBookableSpecialists() {
  const rows = await prisma.specialistProfile.findMany({
    where: { bookable: true, user: { active: true } },
    select: {
      id: true,
      title: true,
      bio: true,
      photoUrl: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.user.name,
    title: r.title,
    bio: r.bio,
    photoUrl: r.photoUrl,
  }));
}

export async function listActiveTopics() {
  return prisma.consultationTopic.findMany({
    where: { active: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, requiresDetails: true },
  });
}

export interface CreatedAppointment {
  id: string;
  token: string;
  date: string;
  startTime: string;
  endTime: string;
  specialistName: string;
  topicName: string;
}

/**
 * إنشاء حجز.
 *
 * ثلاث طبقات تمنع الحجز المزدوج:
 *   1. الفترات المعروضة تُولَّد في الخادم وتستثني المحجوز.
 *   2. إعادة تحقق من العرض لحظة الإرسال.
 *   3. قيد فريد في قاعدة البيانات على (المختص، التاريخ، وقت البداية) — الفاصل الحاسم عند التزاحم.
 */
export async function createAppointment(
  input: CreateAppointmentInput
): Promise<CreatedAppointment> {
  const specialist = await prisma.specialistProfile.findFirst({
    where: { id: input.specialistId, bookable: true, user: { active: true } },
    select: {
      id: true,
      notifyPhone: true,
      user: { select: { name: true } },
    },
  });
  if (!specialist) throw new ApiError("المختص غير متاح للحجز", 404);

  const topic = await prisma.consultationTopic.findFirst({
    where: { id: input.topicId, active: true },
    select: { id: true, name: true, requiresDetails: true },
  });
  if (!topic) throw new ApiError("موضوع الاستشارة غير متاح", 404);

  const details = (input.topicDetails ?? "").trim();
  if (topic.requiresDetails && details.length < 5) {
    throw new ApiError("اكتب تفاصيل الاستشارة", 422);
  }

  const slot = await isSlotOffered(input.specialistId, input.date, input.startTime);
  if (!slot) throw new ApiError("هذه الفترة لم تعد متاحة — اختر فترة أخرى", 409);

  const token = generateAccessToken();

  let appointment;
  try {
    appointment = await prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          specialistId: specialist.id,
          studentName: input.studentName,
          grade: input.grade,
          phone: input.phone,
          topicId: topic.id,
          topicDetails: topic.requiresDetails ? details : null,
          scheduledDate: isoDateToUtc(input.date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          tokenHash: hashToken(token),
        },
        select: { id: true, startTime: true, endTime: true },
      });

      await tx.appointmentHistory.create({
        data: { appointmentId: created.id, toStatus: "PENDING", note: "حجز جديد من الطالب" },
      });

      return created;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ApiError("حُجزت هذه الفترة للتو — اختر فترة أخرى", 409);
    }
    throw e;
  }

  // الإشعار خارج المعاملة عمداً: فشله لا يُلغي حجزاً صحيحاً.
  await Promise.all([
    sendBookingNotification({
      appointmentId: appointment.id,
      specialistPhone: specialist.notifyPhone,
      studentName: input.studentName,
      date: formatArabicDate(input.date),
      time: formatArabicTime(appointment.startTime),
      topic: topic.name,
    }),
    sendBookingSummary({
      appointmentId: appointment.id,
      studentName: input.studentName,
      grade: GRADE_LABELS[input.grade] ?? input.grade,
      studentPhone: input.phone,
      specialistName: specialist.user.name,
      date: formatArabicDate(input.date),
      time: formatArabicTime(appointment.startTime),
      topic: topic.name,
      details: topic.requiresDetails ? details || null : null,
    }),
    notifySpecialistInApp({
      specialistId: specialist.id,
      type: "APPOINTMENT_NEW",
      title: "حجز استشارة جديد",
      body: `${input.studentName} — ${formatArabicDate(input.date)} ${formatArabicTime(appointment.startTime)}`,
      link: "/specialist/appointments",
    }),
  ]);

  return {
    id: appointment.id,
    token,
    date: input.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    specialistName: specialist.user.name,
    topicName: topic.name,
  };
}

/** متابعة الطالب لحجزه دون حساب. */
export async function getAppointmentByToken(token: string) {
  if (!token) return null;
  return prisma.appointment.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      studentName: true,
      scheduledDate: true,
      startTime: true,
      endTime: true,
      status: true,
      topic: { select: { name: true } },
      specialist: { select: { title: true, user: { select: { name: true } } } },
    },
  });
}

export interface StatusChange {
  appointmentId: string;
  specialistId: string;
  toStatus: AppointmentStatus;
  note?: string;
  actorId: string;
}

/** تغيير الحالة — مقصور على المختص صاحب الحجز، ومسجّل في سجل الحالات. */
export async function changeStatus(change: StatusChange) {
  const current = await prisma.appointment.findUnique({
    where: { id: change.appointmentId },
    select: { id: true, status: true, specialistId: true },
  });
  if (!current) throw new ApiError("الحجز غير موجود", 404);
  if (current.specialistId !== change.specialistId) {
    throw new ApiError("ليست لديك صلاحية على هذا الحجز", 403);
  }
  if (current.status === change.toStatus) return current;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id: change.appointmentId },
      data: {
        status: change.toStatus,
        cancelReason: change.toStatus === "CANCELLED" ? (change.note ?? "") : null,
      },
      select: { id: true, status: true, specialistId: true },
    });
    await tx.appointmentHistory.create({
      data: {
        appointmentId: change.appointmentId,
        fromStatus: current.status,
        toStatus: change.toStatus,
        note: change.note ?? "",
        changedById: change.actorId,
      },
    });
    return updated;
  });
}
