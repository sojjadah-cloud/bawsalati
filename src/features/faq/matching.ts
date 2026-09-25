// ═══════════════════════════════════════════════════════════════
// مطابقة أسئلة الطلاب بأجوبة مخزّنة — ««اسألني»».
//
// لا يوجد توليد نصّ هنا. المساعد يبحث في صفوف مخزّنة ويعيد أقربها،
// وإن لم يجد ما يتجاوز عتبة الثقة يحيل الطالب إلى الأخصائي.
// ═══════════════════════════════════════════════════════════════

/** تطبيع النص العربي: تشكيل، همزات، تاء مربوطة، ألف مقصورة، تطويل، ترقيم. */
export function normalizeArabic(input: string): string {
  return input
    .replace(/[ً-ْٰـ]/gu, "") // تشكيل وتطويل
    .replace(/[أإآٱ]/gu, "ا")
    .replace(/ة/gu, "ه")
    .replace(/ى/gu, "ي")
    .replace(/ؤ/gu, "و")
    .replace(/ئ/gu, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // ترقيم ورموز
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

/** كلمات شائعة لا تميّز سؤالاً عن آخر. */
const STOPWORDS = new Set(
  [
    "من", "الى", "في", "على", "عن", "مع", "هل", "ما", "ماذا", "متي", "اين",
    "كيف", "لماذا", "ليش", "وش", "شنو", "كم", "ايش", "هو", "هي", "انا", "انت",
    "هذا", "هذه", "ذلك", "التي", "الذي", "ان", "اذا", "لو", "قد", "كان", "يكون",
    "بعد", "قبل", "بين", "عند", "لكن", "او", "ثم", "كل", "بعض", "غير", "بدون",
    "ابي", "ابغي", "اريد", "ودي", "ممكن", "بليز", "لو سمحت", "يا", "و", "ب", "ل",
  ].map(normalizeArabic)
);

function tokenize(text: string): string[] {
  return normalizeArabic(text)
    .split(" ")
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export interface MatchableEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  topic: string;
  /** "guide" لما استُخرج من دليل الطالب */
  source?: string;
  /** صفحة الدليل، إن كان المصدر الدليل */
  page?: number | null;
  /** الأعلى يُرجَّح عند تقارب الدرجات */
  priority?: number;
}

export interface MatchResult {
  entry: MatchableEntry;
  score: number;
}

/** أقلّ ثقة تُقبل. دونها يُحال الطالب إلى الأخصائي بدل جواب غير دقيق. */
export const CONFIDENCE_THRESHOLD = 0.42;

/**
 * درجة التطابق بين سؤال الطالب ومدخل مخزّن.
 * تجمع بين تغطية كلمات السؤال، والتطابق النصّي الكامل، وضربات الكلمات المفتاحية.
 */
function scoreEntry(askTokens: string[], askNormalized: string, entry: MatchableEntry): number {
  if (askTokens.length === 0) return 0;

  const entryNormalized = normalizeArabic(entry.question);
  // تطابق كامل أو احتواء صريح — أقوى إشارة ممكنة
  if (entryNormalized === askNormalized) return 1;

  const entryTokens = new Set(tokenize(entry.question));
  const keywordTokens = new Set(entry.keywords.flatMap((k) => tokenize(k)));

  let hits = 0;
  let keywordHits = 0;
  for (const token of askTokens) {
    if (entryTokens.has(token)) hits += 1;
    else if (keywordTokens.has(token)) keywordHits += 1;
    // مطابقة جزئية للجذر: كلمة الطالب بداية كلمة مخزّنة أو العكس
    else if ([...entryTokens].some((t) => t.startsWith(token) || token.startsWith(t))) {
      hits += 0.5;
    }
  }

  const coverage = (hits + keywordHits * 0.85) / askTokens.length;
  // نسبة ما غطّاه السؤال من كلمات المدخل، تمنع مطابقة سؤال طويل بمدخل قصير جداً
  const density = entryTokens.size > 0 ? Math.min(1, (hits + keywordHits) / entryTokens.size) : 0;
  const containment = entryNormalized.includes(askNormalized) || askNormalized.includes(entryNormalized) ? 0.2 : 0;

  return Math.min(1, coverage * 0.7 + density * 0.3 + containment);
}

/**
 * ترجيح مصدر الجواب.
 * الدليل هو المرجع الرسمي للقبول والبرامج، فيُقدَّم على الجواب العام
 * حين يتقارب التطابق. الترجيح صغير عمداً كي لا يقلب تطابقاً واضحاً.
 */
export const PRIORITY_WEIGHT = 0.06;

function weighted(score: number, entry: MatchableEntry): number {
  const priority = entry.priority ?? 0;
  if (priority <= 0 || score <= 0) return score;
  // بلا تحديد بسقف واحد: التساوي التام يجب أن يُحسَم للدليل أيضاً
  return score + Math.min(0.12, priority * (PRIORITY_WEIGHT / 10));
}

/** أفضل تطابق لسؤال الطالب، أو null إن لم يتجاوز أيٌّ منها عتبة الثقة. */
export function findBestMatch(
  question: string,
  entries: MatchableEntry[]
): MatchResult | null {
  const askNormalized = normalizeArabic(question);
  const askTokens = tokenize(question);
  if (askTokens.length === 0) return null;

  let best: { entry: MatchableEntry; rank: number } | null = null;
  for (const entry of entries) {
    const rank = weighted(scoreEntry(askTokens, askNormalized, entry), entry);
    if (!best || rank > best.rank) best = { entry, rank };
  }

  if (!best || best.rank < CONFIDENCE_THRESHOLD) return null;
  // الدرجة المعروضة تبقى ضمن [0,1]؛ الترجيح أداة ترتيب لا قيمة تُعرض
  return { entry: best.entry, score: Math.min(1, best.rank) };
}

/** اقتراحات قريبة تُعرض حين لا يوجد جواب مؤكّد. */
export function findRelated(
  question: string,
  entries: MatchableEntry[],
  limit = 3
): MatchableEntry[] {
  const askNormalized = normalizeArabic(question);
  const askTokens = tokenize(question);
  if (askTokens.length === 0) return [];

  return entries
    .map((entry) => ({ entry, score: weighted(scoreEntry(askTokens, askNormalized, entry), entry) }))
    .filter((r) => r.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}
