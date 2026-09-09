"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, UserCheck, UserX } from "lucide-react";
import { api, ApiClientError, messageOf } from "@/lib/client";
import { ROLE_LABELS } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";
import { Alert, Badge } from "@/components/ui/primitives";
import { SelectField, SubmitButton, TextField } from "@/components/ui/form";

export interface AccountRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
  bookable: boolean | null;
}

export function SpecialistManager({
  accounts,
  currentUserId,
}: {
  accounts: AccountRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SPECIALIST");
  const [notifyPhone, setNotifyPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [resetFor, setResetFor] = useState<AccountRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await api.post("/api/admin/specialists", {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        notifyPhone: notifyPhone.trim(),
      });
      toast.success("أُنشئ الحساب");
      setAddOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setNotifyPhone("");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.issues) {
        setErrors({
          name: err.fieldError("name"),
          email: err.fieldError("email"),
          password: err.fieldError("password"),
          notifyPhone: err.fieldError("notifyPhone"),
        });
      }
      setFormError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(account: AccountRow) {
    if (busyId) return;
    setBusyId(account.id);
    try {
      await api.patch(`/api/admin/specialists/${account.id}`, { active: !account.active });
      toast.success(account.active ? "عُطّل الحساب" : "فُعّل الحساب");
      router.refresh();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetFor || resetting) return;
    setResetting(true);
    try {
      await api.patch(`/api/admin/specialists/${resetFor.id}`, { password: newPassword });
      toast.success("أُعيد ضبط كلمة المرور");
      setResetFor(null);
      setNewPassword("");
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
          <Plus className="h-5 w-5" aria-hidden="true" />
          إضافة حساب
        </button>
      </div>

      <div className="table-wrap mt-4">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">الاسم</th>
              <th scope="col">البريد</th>
              <th scope="col">الدور</th>
              <th scope="col">الحالة</th>
              <th scope="col">آخر دخول</th>
              <th scope="col">
                <span className="sr-only">إجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className="font-bold text-slate-900">{a.name}</td>
                <td dir="ltr" className="text-xs">
                  {a.email}
                </td>
                <td className="text-xs">{ROLE_LABELS[a.role] ?? a.role}</td>
                <td>
                  {a.active ? (
                    <Badge tone="success">فعّال</Badge>
                  ) : (
                    <Badge tone="neutral">معطّل</Badge>
                  )}
                </td>
                <td className="text-xs tabular-nums">
                  {a.lastLoginAt ? a.lastLoginAt.slice(0, 10) : "—"}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setResetFor(a)}
                      className="cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      aria-label={`إعادة ضبط كلمة مرور ${a.name}`}
                      title="إعادة ضبط كلمة المرور"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(a)}
                      disabled={busyId === a.id || a.id === currentUserId}
                      className="cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                      aria-label={a.active ? `تعطيل ${a.name}` : `تفعيل ${a.name}`}
                      title={
                        a.id === currentUserId
                          ? "لا يمكنك تعطيل حسابك"
                          : a.active
                            ? "تعطيل"
                            : "تفعيل"
                      }
                    >
                      {a.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* إضافة حساب */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="إضافة حساب جديد"
        description="حسابات المختصين والمديرين فقط. الطلاب لا يحتاجون حسابات."
      >
        <form onSubmit={create} noValidate className="space-y-5">
          <TextField
            label="الاسم"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <TextField
            label="البريد الإلكتروني"
            required
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <TextField
            label="كلمة المرور"
            required
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint="10 محارف على الأقل، تتضمّن حرفاً ورقماً."
          />
          <SelectField
            label="الدور"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={[
              { value: "SPECIALIST", label: "مختص التوجيه المهني" },
              { value: "ADMIN", label: "مدير النظام" },
            ]}
          />
          {role === "SPECIALIST" ? (
            <TextField
              label="رقم إشعار الحجز"
              type="tel"
              dir="ltr"
              inputMode="numeric"
              value={notifyPhone}
              onChange={(e) => setNotifyPhone(e.target.value.replace(/\D/gu, ""))}
              error={errors.notifyPhone}
              hint="بصيغة دولية بلا رمز +. يمكن للمختص تغييره لاحقاً."
              maxLength={15}
            />
          ) : null}

          {formError ? <Alert tone="danger">{formError}</Alert> : null}

          <div className="flex justify-end gap-2 border-t border-[var(--color-line)] pt-4">
            <button type="button" className="btn-outline" onClick={() => setAddOpen(false)}>
              إلغاء
            </button>
            <SubmitButton loading={saving}>إنشاء الحساب</SubmitButton>
          </div>
        </form>
      </Dialog>

      {/* إعادة ضبط كلمة المرور */}
      <Dialog
        open={!!resetFor}
        onClose={() => setResetFor(null)}
        title="إعادة ضبط كلمة المرور"
        description={resetFor ? `الحساب: ${resetFor.name}` : undefined}
        size="sm"
      >
        <form onSubmit={resetPassword} className="space-y-5">
          <TextField
            label="كلمة المرور الجديدة"
            required
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="10 محارف على الأقل، تتضمّن حرفاً ورقماً. سلّمها لصاحب الحساب بوسيلة آمنة."
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-outline" onClick={() => setResetFor(null)}>
              إلغاء
            </button>
            <SubmitButton loading={resetting}>حفظ</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
