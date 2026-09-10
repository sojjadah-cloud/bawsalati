"use client";

// الخطوة الثانية: بيانات الطالب، ثم إنشاء جلسة الاختبار.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api, ApiClientError, messageOf } from "@/lib/client";
import { GENDERS, GRADES } from "@/lib/constants";
import { Alert } from "@/components/ui/primitives";
import { SelectField, SubmitButton, TextField } from "@/components/ui/form";

interface FieldErrors {
  studentName?: string;
  grade?: string;
  gender?: string;
  phone?: string;
}

export function StartAssessmentForm() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** تحقّق أولي في المتصفح — الخادم يعيد التحقق دائماً. */
  function validate(): boolean {
    const next: FieldErrors = {};
    if (studentName.trim().length < 3) next.studentName = "أدخل الاسم كاملاً";
    if (!grade) next.grade = "اختر الصف الدراسي";
    if (!gender) next.gender = "اختر الجنس";
    if (!/^[79]\d{7}$/u.test(phone.trim())) {
      next.phone = "أدخل رقماً عُمانياً صحيحاً مكوّناً من 8 أرقام";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await api.post("/api/assessment/sessions", {
        studentName: studentName.trim(),
        grade,
        gender,
        phone: phone.trim(),
      });
      router.push("/assessment/questions");
    } catch (err) {
      if (err instanceof ApiClientError && err.issues) {
        setErrors({
          studentName: err.fieldError("studentName"),
          grade: err.fieldError("grade"),
          gender: err.fieldError("gender"),
          phone: err.fieldError("phone"),
        });
      }
      setFormError(messageOf(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card card-pad">
      <h2 className="text-lg font-bold text-slate-900">بياناتك</h2>
      <p className="mt-1.5 text-sm text-[var(--color-muted)]">
        نحتاج هذه البيانات لربط النتيجة بك ولمتابعتها مع مختص التوجيه المهني.
      </p>

      <div className="mt-6 space-y-5">
        <TextField
          label="اسم الطالب"
          required
          autoComplete="name"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          error={errors.studentName}
          placeholder="الاسم الثلاثي"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="الصف الدراسي"
            required
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            error={errors.grade}
            placeholder="اختر الصف"
            options={GRADES.map((g) => ({ value: g.value, label: g.label }))}
          />

          {/* الجنس مطلوب لأن جدول تحويل الدرجات يختلف بين الذكور والإناث */}
          <SelectField
            label="الجنس"
            required
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            error={errors.gender}
            placeholder="اختر الجنس"
            hint="يُستخدم لاختيار الجدول المعياري المناسب."
            options={GENDERS.map((g) => ({ value: g.value, label: g.label }))}
          />
        </div>

        <TextField
          label="رقم التواصل"
          required
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          dir="ltr"
          maxLength={8}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/gu, ""))}
          error={errors.phone}
          hint="8 أرقام تبدأ بـ 9 أو 7"
          placeholder="9xxxxxxx"
        />

        {formError ? <Alert tone="danger">{formError}</Alert> : null}
      </div>

      <div className="mt-6">
        <SubmitButton loading={loading} className="btn-primary btn-lg btn-block sm:w-auto">
          ابدأ الاختبار
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </SubmitButton>
      </div>
    </form>
  );
}
