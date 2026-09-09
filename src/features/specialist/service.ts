// استعلامات لوحة المختص. كل دالة تُصفّي بمعرّف المختص أو تقتصر على بيانات مصرّح بها.
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isoDateToUtc, todayIso } from "@/lib/time";

/* ───────────────────────── ملخّص اللوحة ───────────────────────── */

export async function getDashboardSummary(specialistId: string) {
  const today = isoDateToUtc(todayIso());

  const [newAssessments, todayCount, upcoming, recentAssessments, recentAppointments] =
    await Promise.all([
      prisma.assessmentSession.count({
        where: {
          status: "SUBMITTED",
          submittedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.appointment.count({
        where: {
          specialistId,
          scheduledDate: today,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      }),
      prisma.appointment.count({
        where: {
          specialistId,
          scheduledDate: { gt: today },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      }),
      prisma.assessmentSession.findMany({
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 5,
        select: { id: true, studentName: true, grade: true, submittedAt: true },
      }),
      prisma.appointment.findMany({
        where: { specialistId, scheduledDate: { gte: today } },
        orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
        take: 5,
        select: {
          id: true,
          studentName: true,
          grade: true,
          scheduledDate: true,
          startTime: true,
          status: true,
          topic: { select: { name: true } },
        },
      }),
    ]);

  return { newAssessments, todayCount, upcoming, recentAssessments, recentAppointments };
}

/* ───────────────────────── الاختبارات ───────────────────────── */

export interface AssessmentFilters {
  search?: string;
  grade?: string;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest" | "name";
  skip?: number;
  take?: number;
}

export async function listSubmissions(filters: AssessmentFilters) {
  const where: Prisma.AssessmentSessionWhereInput = {
    status: "SUBMITTED",
    ...(filters.grade ? { grade: filters.grade } : {}),
    ...(filters.search
      ? { studentName: { contains: filters.search, mode: "insensitive" } }
      : {}),
    ...(filters.from || filters.to
      ? {
          submittedAt: {
            ...(filters.from ? { gte: isoDateToUtc(filters.from) } : {}),
            ...(filters.to
              ? { lte: new Date(`${filters.to}T23:59:59.999Z`) }
              : {}),
          },
        }
      : {}),
  };

  const orderBy: Prisma.AssessmentSessionOrderByWithRelationInput =
    filters.sort === "oldest"
      ? { submittedAt: "asc" }
      : filters.sort === "name"
        ? { studentName: "asc" }
        : { submittedAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.assessmentSession.findMany({
      where,
      orderBy,
      skip: filters.skip ?? 0,
      take: filters.take ?? 20,
      select: {
        id: true,
        studentName: true,
        grade: true,
        phone: true,
        submittedAt: true,
        result: { select: { topDimensions: true } },
      },
    }),
    prisma.assessmentSession.count({ where }),
  ]);

  return { items, total };
}

/** سجل اختبار كامل للتحليل: البيانات، كل الإجابات، الجداول، التحليل. */
export async function getSubmissionDetail(sessionId: string) {
  const session = await prisma.assessmentSession.findFirst({
    where: { id: sessionId, status: "SUBMITTED" },
    select: {
      id: true,
      studentName: true,
      grade: true,
      phone: true,
      startedAt: true,
      submittedAt: true,
      assessment: { select: { title: true, version: true } },
      result: {
        include: {
          sections: { orderBy: { displayOrder: "asc" } },
          analysis: true,
          ruleSet: { select: { version: true, method: true } },
        },
      },
    },
  });
  if (!session?.result) return null;

  const answers = await prisma.assessmentAnswer.findMany({
    where: { sessionId },
    orderBy: { question: { number: "asc" } },
    select: {
      value: true,
      question: {
        select: {
          number: true,
          text: true,
          group: { select: { number: true } },
          dimension: { select: { code: true, label: true } },
        },
      },
    },
  });

  return { session, result: session.result, answers };
}

/* ───────────────────────── الحجوزات ───────────────────────── */

export interface AppointmentFilters {
  specialistId: string;
  scope?: "today" | "upcoming" | "past" | "all";
  status?: AppointmentStatus;
  search?: string;
  date?: string;
  skip?: number;
  take?: number;
}

export async function listAppointments(filters: AppointmentFilters) {
  const today = isoDateToUtc(todayIso());

  const scopeWhere: Prisma.AppointmentWhereInput =
    filters.scope === "today"
      ? { scheduledDate: today }
      : filters.scope === "upcoming"
        ? { scheduledDate: { gt: today } }
        : filters.scope === "past"
          ? { scheduledDate: { lt: today } }
          : {};

  const where: Prisma.AppointmentWhereInput = {
    specialistId: filters.specialistId,
    ...scopeWhere,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.date ? { scheduledDate: isoDateToUtc(filters.date) } : {}),
    ...(filters.search
      ? { studentName: { contains: filters.search, mode: "insensitive" } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy:
        filters.scope === "past"
          ? [{ scheduledDate: "desc" }, { startTime: "desc" }]
          : [{ scheduledDate: "asc" }, { startTime: "asc" }],
      skip: filters.skip ?? 0,
      take: filters.take ?? 20,
      select: {
        id: true,
        studentName: true,
        grade: true,
        phone: true,
        scheduledDate: true,
        startTime: true,
        endTime: true,
        status: true,
        topicDetails: true,
        specialistNotes: true,
        createdAt: true,
        topic: { select: { name: true } },
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, channel: true, lastError: true },
        },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return { items, total };
}
