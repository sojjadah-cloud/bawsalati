"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type Tone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONES: Record<Tone, { cls: string; Icon: typeof Info }> = {
  success: { cls: "border-success-600/30 bg-white text-success-700", Icon: CheckCircle2 },
  error: { cls: "border-danger-600/30 bg-white text-danger-700", Icon: AlertCircle },
  info: { cls: "border-info-600/30 bg-white text-info-700", Icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = Date.now() + Math.random();
      setItems((list) => [...list, { id, tone, message }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* منطقة حيّة: القارئ الشاشي يعلن الرسائل فور ظهورها */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:items-start"
      >
        {items.map((t) => {
          const { cls, Icon } = TONES[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={`animate-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm font-semibold shadow-[var(--shadow-lg)] ${cls}`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 leading-relaxed">{t.message}</span>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="shrink-0 cursor-pointer rounded p-0.5 text-slate-400 transition-colors hover:text-slate-700"
                aria-label="إغلاق التنبيه"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast يجب أن يُستخدم داخل ToastProvider");
  return ctx;
}
