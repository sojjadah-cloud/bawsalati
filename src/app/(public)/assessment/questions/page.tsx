import type { Metadata } from "next";
import { AssessmentRunner } from "@/components/assessment/AssessmentRunner";

export const metadata: Metadata = {
  title: "الإجابة على الاختبار",
  // صفحة خاصة بجلسة طالب — لا تُفهرس
  robots: { index: false, follow: false },
};

export default function AssessmentQuestionsPage() {
  return <AssessmentRunner />;
}
