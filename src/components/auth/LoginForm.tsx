"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { api, ApiClientError, messageOf } from "@/lib/client";
import { Alert } from "@/components/ui/primitives";
import { SubmitButton, TextField } from "@/components/ui/form";

/** حساب تعبئة سريعة — يُمرَّر من الخادم في بيئة التطوير فقط. */
export interface DevAccount {
  label: string;
  email: string;
  password: string;
}

export function LoginForm({
  nextPath,
  devAccounts = [],
}: {
  nextPath?: string;
  devAccounts?: DevAccount[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    setErrors({});

    setLoading(true);
    try {
      const res = await api.post<{ redirectTo: string }>("/api/auth/login", {
        email: email.trim(),
        password,
      });
      router.replace(nextPath ?? res.redirectTo);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.issues) {
        setErrors({ email: err.fieldError("email"), password: err.fieldError("password") });
      }
      setFormError(messageOf(err));
      setLoading(false);
    }
  }

  function fill(account: DevAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setErrors({});
    setFormError(null);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <TextField
        label="البريد الإلكتروني"
        required
        type="email"
        autoComplete="username"
        dir="ltr"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        placeholder="name@example.om"
      />

      <TextField
        label="كلمة المرور"
        required
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />

      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      <SubmitButton loading={loading} className="btn-primary btn-block">
        <LogIn className="h-5 w-5" aria-hidden="true" />
        تسجيل الدخول
      </SubmitButton>

      {/* تعبئة سريعة لبيئة التطوير. الخادم لا يمرّر هذه الحسابات في الإنتاج. */}
      {devAccounts.length > 0 ? (
        <div className="border-t border-[var(--color-line)] pt-4">
          <p className="text-xs font-bold text-[var(--color-faint)]">
            تعبئة سريعة (بيئة التطوير فقط)
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {devAccounts.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => fill(a)}
                disabled={loading}
                className="btn-outline btn-sm"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
