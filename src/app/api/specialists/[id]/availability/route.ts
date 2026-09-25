import { noStore, errorResponse } from "@/lib/api";
import { getAvailability, BOOKING_HORIZON_DAYS } from "@/features/appointments/availability";

/** الفترات المتاحة فعلاً. عام — بلا أي بيانات خاصة بالأخصائي. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const days = await getAvailability(id, { days: BOOKING_HORIZON_DAYS });
    return noStore({ days });
  } catch (e) {
    return errorResponse(e);
  }
}
