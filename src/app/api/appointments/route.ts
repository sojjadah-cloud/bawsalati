import { json, errorResponse, parseBody, ApiError } from "@/lib/api";
import { consume, LIMITS } from "@/lib/rate-limit";
import { audit, clientIp } from "@/lib/audit";
import { createAppointmentSchema } from "@/features/appointments/schemas";
import { createAppointment } from "@/features/appointments/service";

/** حجز موعد. عام — لا يتطلب حساباً. */
export async function POST(req: Request) {
  try {
    const input = await parseBody(req, createAppointmentSchema);
    const ip = clientIp(req);

    const limit = consume(`booking:${ip}`, LIMITS.booking);
    if (!limit.allowed) {
      throw new ApiError(
        `عدد كبير من محاولات الحجز. حاول بعد ${Math.ceil(limit.retryAfterSeconds / 60)} دقيقة.`,
        429
      );
    }

    const appointment = await createAppointment(input);

    await audit("APPOINTMENT_CREATE", "Appointment", {
      entityId: appointment.id,
      meta: { date: appointment.date, grade: input.grade },
      ip,
    });

    return json(
      {
        appointment: {
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          specialistName: appointment.specialistName,
          topicName: appointment.topicName,
        },
        trackingToken: appointment.token,
      },
      201
    );
  } catch (e) {
    return errorResponse(e);
  }
}
