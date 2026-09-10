/**
 * غلاف مولّد للموارد التي لا تحمل صورة غلاف.
 * يُرسم في المتصفّح بـ SVG: لا صور تُحمَّل، ولا حقوق صور، ولا روابط خارجية.
 * اللون مشتقّ من العنوان، فيبقى الغلاف نفسه للمورد نفسه في كل مرة.
 */
const PALETTES = [
  { from: "#0f766e", to: "#134e4a" },
  { from: "#1d4ed8", to: "#172554" },
  { from: "#b45309", to: "#78350f" },
  { from: "#be123c", to: "#4c0519" },
  { from: "#6d28d9", to: "#2e1065" },
  { from: "#15803d", to: "#052e16" },
  { from: "#0e7490", to: "#083344" },
  { from: "#a16207", to: "#422006" },
];

function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length];
}

/** يقصّ العنوان إلى أسطر قصيرة تناسب عرض الغلاف. */
function wrap(title: string, maxPerLine = 16, maxLines = 4): string[] {
  const words = title.split(/\s+/u);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

export function CoverArt({
  title,
  author,
  className = "",
}: {
  title: string;
  author?: string;
  className?: string;
}) {
  const { from, to } = paletteFor(title);
  const id = `cover-${Math.abs([...title].reduce((a, c) => a + c.charCodeAt(0), 0))}`;
  const lines = wrap(title);

  return (
    <svg
      viewBox="0 0 200 280"
      className={className}
      role="img"
      aria-label={`غلاف ${title}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>

      <rect width="200" height="280" fill={`url(#${id})`} />

      {/* كعب الكتاب */}
      <rect x="184" y="0" width="16" height="280" fill="rgba(0,0,0,0.18)" />
      <circle cx="30" cy="250" r="70" fill="rgba(255,255,255,0.06)" />
      <circle cx="170" cy="40" r="46" fill="rgba(255,255,255,0.07)" />

      {lines.map((line, i) => (
        <text
          key={i}
          x="96"
          y={104 + i * 26}
          fontSize="17"
          fontWeight="700"
          fill="#ffffff"
          textAnchor="middle"
          direction="rtl"
        >
          {line}
        </text>
      ))}

      {author ? (
        <text
          x="96"
          y={124 + lines.length * 26}
          fontSize="12"
          fill="rgba(255,255,255,0.75)"
          textAnchor="middle"
          direction="rtl"
        >
          {author}
        </text>
      ) : null}
    </svg>
  );
}
