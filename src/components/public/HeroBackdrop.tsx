/**
 * خلفية الواجهة: أشكال هندسية ساكنة مرسومة بـ SVG.
 * لا صور ولا حركة — لا وزن إضافي على التحميل، ولا إزعاج لمن يفضّل تقليل الحركة.
 */
export function HeroBackdrop() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="hero-dots" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(255,255,255,0.10)" />
        </pattern>
        <radialGradient id="hero-glow" cx="50%" cy="0%" r="70%">
          <stop offset="0%" stopColor="var(--color-brand-600)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--color-brand-600)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="100%" height="100%" fill="url(#hero-glow)" />
      <rect width="100%" height="100%" fill="url(#hero-dots)" />

      {/* دوائر كبيرة تكسر المساحة الصلبة */}
      <circle cx="12%" cy="88%" r="190" fill="var(--color-brand-700)" opacity="0.55" />
      <circle cx="88%" cy="18%" r="150" fill="var(--color-brand-600)" opacity="0.35" />

      {/* لمسة كهرمانية واحدة */}
      <circle cx="80%" cy="84%" r="64" fill="var(--color-accent-500)" opacity="0.16" />

      {/* أقواس رفيعة توحي بالبوصلة */}
      <circle
        cx="88%"
        cy="18%"
        r="112"
        fill="none"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1.5"
      />
      <circle
        cx="12%"
        cy="88%"
        r="240"
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
