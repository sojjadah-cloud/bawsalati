// المخطط المهني: البيئات الست على المحور الأفقي، والرتبة المئينية على الرأسي،
// ونقطة لكل بيئة تُوصل بخط — كما في نموذج الدليل.
import type { AnalysisRowData } from "./ResultView";

const WIDTH = 720;
const HEIGHT = 300;
const PADDING = { top: 20, right: 24, bottom: 56, left: 44 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;
const MAX = 99;
const GRIDLINES = [0, 25, 50, 75, 99];

export function ProfileChart({ rows }: { rows: AnalysisRowData[] }) {
  if (rows.length === 0) return null;

  const step = PLOT_W / rows.length;
  const x = (i: number) => PADDING.left + step * i + step / 2;
  const y = (percentile: number) =>
    PADDING.top + PLOT_H - (Math.min(MAX, Math.max(0, percentile)) / MAX) * PLOT_H;

  const points = rows.map((r, i) => ({ ...r, cx: x(i), cy: y(r.percentile) }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.cx} ${p.cy}`).join(" ");

  return (
    <figure className="table-wrap p-4">
      <figcaption className="sr-only">
        مخطط الرتب المئينية للبيئات الست:{" "}
        {rows.map((r) => `${r.label} ${r.percentile} بالمئة`).join("، ")}
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full min-w-[36rem]"
        role="img"
        aria-label="مخطط الميول المهنية"
      >
        {/* خطوط الشبكة وتدرّج الرتبة المئينية */}
        {GRIDLINES.map((value) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <text
              x={WIDTH - PADDING.right + 6}
              y={y(value) + 4}
              fontSize="11"
              fill="var(--color-faint)"
              textAnchor="start"
            >
              {value}
            </text>
          </g>
        ))}

        {/* الخط الواصل بين النقاط */}
        <path d={path} fill="none" stroke="var(--color-brand-600)" strokeWidth="2.5" />

        {points.map((p) => (
          <g key={p.code}>
            <circle cx={p.cx} cy={p.cy} r="6" fill="var(--color-brand-700)" />
            <text
              x={p.cx}
              y={p.cy - 12}
              fontSize="12"
              fontWeight="700"
              fill="var(--color-ink)"
              textAnchor="middle"
            >
              {p.percentile}
            </text>
            <text
              x={p.cx}
              y={HEIGHT - PADDING.bottom + 20}
              fontSize="12"
              fill="var(--color-body)"
              textAnchor="middle"
            >
              {p.label}
            </text>
            <text
              x={p.cx}
              y={HEIGHT - PADDING.bottom + 38}
              fontSize="11"
              fontWeight="700"
              fill="var(--color-faint)"
              textAnchor="middle"
            >
              ({p.code})
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
