"use client";

// جرس التنبيهات. لا يُجلب شيء حتى يفتحه المستخدم.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, Loader2 } from "lucide-react";
import { api, messageOf } from "@/lib/client";

interface Item {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: Item[]; unread: number }>(
        "/api/specialist/notifications"
      );
      setItems(res.items);
      setUnread(res.unread);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // العدّاد يُجلب مرة عند التركيب، بعد انتهاء الطلب لا قبله.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ items: Item[]; unread: number }>(
          "/api/specialist/notifications"
        );
        if (cancelled) return;
        setItems(res.items);
        setUnread(res.unread);
      } catch {
        // العدّاد ثانوي — لا يُزعج المستخدم برسالة خطأ
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // إغلاق اللوحة بالنقر خارجها أو بـ Esc
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAll() {
    try {
      await api.patch("/api/specialist/notifications", {});
      setItems((list) => list.map((i) => ({ ...i, read: true })));
      setUnread(0);
    } catch (e) {
      setError(messageOf(e));
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void load();
        }}
        aria-expanded={open}
        aria-label={unread > 0 ? `التنبيهات، ${unread} غير مقروء` : "التنبيهات"}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-slate-600 transition-colors hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute top-1 left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="animate-in absolute top-12 left-0 z-40 w-80 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-2.5">
            <p className="text-sm font-bold text-slate-900">التنبيهات</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-brand-700 hover:underline"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                تعليم الكل كمقروء
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-[var(--color-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                جارِ التحميل…
              </p>
            ) : error ? (
              <p className="px-4 py-8 text-center text-sm text-danger-700">{error}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
                لا توجد تنبيهات
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {items.map((n) => {
                  const content = (
                    <>
                      <span className="flex items-start gap-2">
                        {!n.read ? (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600"
                            aria-hidden="true"
                          />
                        ) : (
                          <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden="true" />
                        )}
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-slate-900">
                            {n.title}
                          </span>
                          {n.body ? (
                            <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                              {n.body}
                            </span>
                          ) : null}
                          <span className="mt-1 block text-[11px] tabular-nums text-[var(--color-faint)]">
                            {n.createdAt.slice(0, 10)}
                          </span>
                        </span>
                      </span>
                      {!n.read ? <span className="sr-only">(غير مقروء)</span> : null}
                    </>
                  );

                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => setOpen(false)}
                          className="block px-4 py-3 transition-colors hover:bg-slate-50"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="px-4 py-3">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
