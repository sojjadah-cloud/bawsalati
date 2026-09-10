"use client";

// «جويب» — يبحث في بنك أسئلة معدّ مسبقاً ويعيد الجواب المطابق.
// لا يولّد نصاً: ما لا يجده يحيله إلى مختص التوجيه المهني.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import { api, messageOf } from "@/lib/client";

interface Suggestion {
  id: string;
  question: string;
}

interface AskResponse {
  matched: boolean;
  answer?: string;
  matchedQuestion?: string;
  suggestions: Suggestion[];
}

type Message =
  | { role: "student"; id: number; text: string }
  | {
      role: "jawib";
      id: number;
      text: string;
      matched: boolean;
      suggestions: Suggestion[];
    };

const FALLBACK =
  "لم أجد إجابة لهذا السؤال في بنك الأسئلة. تواصل مع مختص التوجيه المهني، فهو الأقدر على الإجابة، وسنضيف السؤال إلى البنك.";

export function JawibChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [starters, setStarters] = useState<Suggestion[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  // أسئلة مقترحة تُجلب مرة واحدة عند فتح الصفحة.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ questions: Suggestion[] }>("/api/ask");
        if (!cancelled) setStarters(res.questions);
      } catch {
        // الاقتراحات ثانوية — غيابها لا يمنع السؤال
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending) return;

    const askId = nextId.current++;
    setMessages((m) => [...m, { role: "student", id: askId, text }]);
    setDraft("");
    setPending(true);

    try {
      const res = await api.post<AskResponse>("/api/ask", { question: text });
      setMessages((m) => [
        ...m,
        {
          role: "jawib",
          id: nextId.current++,
          text: res.matched ? (res.answer ?? FALLBACK) : FALLBACK,
          matched: res.matched,
          suggestions: res.suggestions ?? [],
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "jawib",
          id: nextId.current++,
          text: messageOf(e),
          matched: false,
          suggestions: [],
        },
      ]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="card flex h-[32rem] flex-col sm:h-[36rem]">
      {/* المحادثة */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-base font-bold text-slate-900">اسأل جويب</p>
            <p className="mt-1.5 max-w-sm text-sm text-[var(--color-muted)]">
              اكتب سؤالك بأي صيغة. إن لم أجد الإجابة سأدلّك على مختص التوجيه المهني.
            </p>

            {starters.length > 0 ? (
              <div className="mt-6 w-full">
                <p className="mb-2 text-xs font-bold text-[var(--color-faint)]">
                  أسئلة يسألها الطلاب كثيراً
                </p>
                <ul className="flex flex-wrap justify-center gap-2">
                  {starters.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => send(s.question)}
                        className="cursor-pointer rounded-full border border-[var(--color-line-strong)] bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-800"
                      >
                        {s.question}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          messages.map((m) =>
            m.role === "student" ? (
              <div key={m.id} className="flex justify-start">
                <p className="max-w-[85%] rounded-[var(--radius-lg)] bg-brand-700 px-4 py-2.5 text-sm leading-relaxed text-white">
                  {m.text}
                </p>
              </div>
            ) : (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[90%]">
                  <div
                    className={`rounded-[var(--radius-lg)] px-4 py-3 text-sm leading-loose ${
                      m.matched
                        ? "bg-slate-100 text-slate-800"
                        : "border border-warning-600/30 bg-warning-50 text-warning-700"
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>

                    {!m.matched ? (
                      <Link href="/booking" className="btn-secondary btn-sm mt-3">
                        <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                        احجز موعداً مع المختص
                      </Link>
                    ) : null}
                  </div>

                  {m.suggestions.length > 0 ? (
                    <div className="mt-2">
                      <p className="mb-1.5 text-xs text-[var(--color-faint)]">
                        ربما تقصد أحد هذه الأسئلة
                      </p>
                      <ul className="flex flex-wrap gap-2">
                        {m.suggestions.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => send(s.question)}
                              className="cursor-pointer rounded-full border border-[var(--color-line-strong)] bg-white px-3 py-1 text-xs font-bold text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-800"
                            >
                              {s.question}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          )
        )}

        {pending ? (
          <p className="flex items-center justify-end gap-2 text-xs text-[var(--color-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            جويب يبحث…
          </p>
        ) : null}

        <div ref={endRef} />
      </div>

      {/* حقل السؤال */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        className="flex items-center gap-2 border-t border-[var(--color-line)] p-3"
      >
        <label htmlFor="jawib-input" className="sr-only">
          اكتب سؤالك لجويب
        </label>
        <div className="relative flex-1">
          <UserRound
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--color-faint)]"
            aria-hidden="true"
          />
          <input
            id="jawib-input"
            ref={inputRef}
            className="input pr-10"
            placeholder="اكتب سؤالك هنا"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={300}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={pending || !draft.trim()}>
          <Send className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">إرسال</span>
        </button>
      </form>
    </div>
  );
}
