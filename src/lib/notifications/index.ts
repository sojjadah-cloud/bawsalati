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
  const provider = getProvider();
  const template = "APPOINTMENT_CREATED";

  if (!n.specialistPhone) {
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

  const message: OutboundMessage = {
    to: n.specialistPhone,
    text: composeBookingText(n),
    template,
  };

  let result;
  try {
    result = await provider.send(message);
  } catch (e) {
    result = { ok: false, error: e instanceof Error ? e.message : "خطأ غير متوقع" };
  }

  await recordDelivery({
    channel: provider.channel,
    provider: provider.name,
    recipientMasked: maskPhone(n.specialistPhone),
    template,
    status: result.ok ? "SENT" : result.skipped ? "SKIPPED" : "FAILED",
    lastError: result.ok ? null : (result.error ?? "فشل غير معروف"),
    providerMessageId: result.providerMessageId ?? null,
    appointmentId: n.appointmentId,
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
