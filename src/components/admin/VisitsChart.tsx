// مخطّط الزوّار: عمودٌ لكل يوم، ارتفاعه عدد الزوّار المختلفين.
// SVG خالص كمخطّط الميول — بلا مكتبة رسم ولا طلب خارجي.

const WIDTH = 760;
const HEIGHT = 220;
const PADDING = { top: 16, right: 12, bottom: 34, left: 40 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

export interface DailyVisits {
  day: string;
  visitors: number;
  views: number;
}

/** يومٌ عربي قصير: «٣ نوفمبر» */
function label(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return new Intl.DateTimeFormat("ar-OM", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

export function VisitsChart({ data }: { data: DailyVisits[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--color-muted)]">لا بيانات بعد.</p>;
  }

  const peak = Math.max(1, ...data.map((d) => d.visitors));
  // سقفٌ مستدير فتُقرأ الشبكة: 1، 2، 5، 10، 20، 50 …
  const step = Math.pow(10, Math.floor(Math.log10(peak)));
  const top = Math.ceil(peak / step) * step || 1;
  const ticks = [0, top / 2, top].filter((v, i, a) => a.indexOf(v) === i);

  const slot = PLOT_W / data.length;
  const barW = Math.max(3, Math.min(26, slot * 0.62));
  const x = (i: number) => PADDING.left + slot * i + slot / 2;
  const y = (v: number) => PADDING.top + PLOT_H - (v / top) * PLOT_H;

  // تسمية كل بضعة أيام فقط، فلا تتزاحم على المحور
  const every = Math.ceil(data.length / 8);

  return (
    <figure className="overflow-x-auto">
      <figcaption className="sr-only">
        زوّار آخر {data.length} يوماً:{" "}
        {data.map((d) => `${label(d.day)} ${d.visitors}`).join("، ")}
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full min-w-[32rem]"
        role="img"
        aria-label="مخطّط الزوّار اليومي"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              className="fill-[var(--color-faint)] text-[11px] tabular-nums"
            >
              {t}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const h = Math.max(d.visitors > 0 ? 2 : 0, PADDING.top + PLOT_H - y(d.visitors));
          return (
            <g key={d.day}>
              <rect
                x={x(i) - barW / 2}
                y={PADDING.top + PLOT_H - h}
                width={barW}
                height={h}
                rx="3"
                className="fill-brand-600"
              >
                <title>{`${label(d.day)}: ${d.visitors} زائراً، ${d.views} مشاهدة`}</title>
              </rect>
              {i % every === 0 ? (
                <text
                  x={x(i)}
                  y={HEIGHT - 12}
                  textAnchor="middle"
                  className="fill-[var(--color-faint)] text-[11px]"
                >
                  {label(d.day)}
                </text>
              ) : null}
            </g>
          );
        })}

        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={PADDING.top + PLOT_H}
          y2={PADDING.top + PLOT_H}
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
      </svg>
    </figure>
  );
}
