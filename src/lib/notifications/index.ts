// إرسال إشعار الحجز للمختص + تسجيل حالة التسليم بشكل مستقل.
// القاعدة: فشل الإشعار لا يلغي حجزاً صحيحاً ولا يُفشل طلب الطالب.
import { prisma } from "../prisma";
import { maskPhone } from "../audit";
import { getProvider, type OutboundMessage } from "./provider";

export { getProvider };
export type { NotificationProvider, OutboundMessage, SendResult } from "./provider";

export interface BookingNotice {
  appointmentId: string;
  specialistPhone: string | null;
  studentName: string;
  date: string;
  time: string;
  topic: string;
}

/**
 * الرسالة تحمل الحد الأدنى: من، ومتى، وموضوع عام.
 * التفاصيل تبقى داخل لوحة المختص خلف تسجيل الدخول.
 */
function composeBookingText(n: BookingNotice): string {
  return [
    "بوصلتي — حجز استشارة جديد",
    `الطالب: ${n.studentName}`,
    `التاريخ: ${n.date}`,
    `الوقت: ${n.time}`,
    `الموضوع: ${n.topic}`,
    "التفاصيل في لوحة المختص.",
  ].join("\n");
}

export async function sendBookingNotification(n: BookingNotice): Promise<void> {
  const template = "APPOINTMENT_CREATED";
  if (!n.specialistPhone) {
    const provider = getProvider();
    await recordDelivery({
      channel: provider.channel,
      provider: provider.name,
      recipientMasked: "—",
      template,
      status: "SKIPPED",
      lastError: "لا يوجد رقم إشعار مُعدّ للمختص",
      appointmentId: n.appointmentId,
      attempts: 0,
    });
    return;
  }
  await deliver(n.specialistPhone, composeBookingText(n), template, n.appointmentId);
}

export interface BookingSummary {
  appointmentId: string;
  studentName: string;
  grade: string;
  studentPhone: string;
  specialistName: string;
  date: string;
  time: string;
  topic: string;
  details: string | null;
}

/** رسالة الإدارة: تفاصيل الحجز كاملة، بطلب إدارة المدرسة. */
export function composeBookingSummary(n: BookingSummary): string {
  return [
    "بوصلتي — تأكيد حجز استشارة",
    `الطالب: ${n.studentName}`,
    `الصف: ${n.grade}`,
    `هاتف الطالب: ${n.studentPhone}`,
    `المختص: ${n.specialistName}`,
    `التاريخ: ${n.date}`,
    `الوقت: ${n.time}`,
    `الموضوع: ${n.topic}`,
    ...(n.details ? [`التفاصيل: ${n.details}`] : []),
  ].join("\n");
}

/** رقم عُماني من ثمانية أرقام يُكمَل برمز الدولة، وما عداه يُمرَّر كما هو. */
export function internationalPhone(raw: string): string {
  const digits = raw.replace(/\D/gu, "");
  return /^[79]\d{7}$/u.test(digits) ? `968${digits}` : digits;
}

/**
 * يرسل ملخّص الحجز الكامل إلى الرقم المضبوط في BOOKING_ALERT_PHONE.
 * بلا رقم مضبوط لا يُرسل شيئاً.
 */
export async function sendBookingSummary(n: BookingSummary): Promise<void> {
  const to = process.env.BOOKING_ALERT_PHONE?.trim();
  if (!to) return;
  await deliver(internationalPhone(to), composeBookingSummary(n), "APPOINTMENT_SUMMARY", n.appointmentId);
}

async function deliver(to: string, text: string, template: string, appointmentId: string) {
  const provider = getProvider();
  const message: OutboundMessage = { to, text, template };

  let result;
  try {
    result = await provider.send(message);
  } catch (e) {
    result = { ok: false, error: e instanceof Error ? e.message : "خطأ غير متوقع" };
  }

  await recordDelivery({
    channel: provider.channel,
    provider: provider.name,
    recipientMasked: maskPhone(to),
    template,
    status: result.ok ? "SENT" : "skipped" in result && result.skipped ? "SKIPPED" : "FAILED",
    lastError: result.ok ? null : (result.error ?? "فشل غير معروف"),
    providerMessageId: "providerMessageId" in result ? (result.providerMessageId ?? null) : null,
    appointmentId,
    attempts: 1,
  });
}

interface DeliveryRecord {
  channel: string;
  provider: string;
  recipientMasked: string;
  template: string;
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
  attempts: number;
  lastError?: string | null;
  providerMessageId?: string | null;
  appointmentId?: string | null;
}

async function recordDelivery(rec: DeliveryRecord) {
  try {
    await prisma.notificationDelivery.create({
      data: {
        channel: rec.channel,
        provider: rec.provider,
        recipientMasked: rec.recipientMasked,
        template: rec.template,
        status: rec.status,
        attempts: rec.attempts,
        lastError: rec.lastError ?? null,
        providerMessageId: rec.providerMessageId ?? null,
        appointmentId: rec.appointmentId ?? null,
      },
    });
  } catch (e) {
    console.error("[notify] تعذّر تسجيل التسليم:", e instanceof Error ? e.message : e);
  }
}

/** تنبيه داخل لوحة المختص — مستقل عن الرسالة الخارجية. */
export async function notifySpecialistInApp(input: {
  specialistId: string | null;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  try {
    await prisma.inAppNotification.create({
      data: {
        specialistId: input.specialistId,
        type: input.type,
        title: input.title,
        body: input.body ?? "",
        link: input.link ?? null,
      },
    });
  } catch (e) {
    console.error("[notify] تعذّر إنشاء التنبيه:", e instanceof Error ? e.message : e);
  }
}
