"use client";

// بحث مباشر برمز البرنامج أو اسمه. يبقى أعلى الصفحة دائماً، فالطالب
// الذي يعرف الرمز لا يُجبر على المرور بالتصفية.
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function ProgramSearch({ initial = "" }: { initial?: string }) {
  const router = useRouter();

  return (
    <form
      role="search"
      className="card card-pad"
      onSubmit={(e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get("q");
        const q = typeof value === "string" ? value.trim() : "";
        router.push(q ? `/programs?q=${encodeURIComponent(q)}` : "/programs");
      }}
    >
      <label htmlFor="program-search" className="label">
        ابحث برمز البرنامج أو اسمه
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="program-search"
            name="q"
            type="search"
            defaultValue={initial}
            key={initial}
            placeholder="مثال: SE021 أو الهندسة المدنية"
            className="input pr-11"
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0">
          بحث
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        الرمز يكفي وحده: تظهر نتيجته مهما كان مجاله أو نوعه أو مؤسسته.
      </p>
    </form>
  );
}
