// خدمة «جويب»: البحث في بنك الأسئلة، وتسجيل ما لم يُجَب عنه.
import { prisma } from "@/lib/prisma";
import {
  findBestMatch,
  findRelated,
  normalizeArabic,
  type MatchableEntry,
} from "./matching";

/**
 * بنك الأسئلة مقروء بكثرة ونادر التغيير، فيُحفظ في ذاكرة العملية لدقيقة.
 * أي إضافة أو تعديل يُبطل المخزون فوراً.
 */
let cache: { entries: MatchableEntry[]; at: number } | null = null;
const CACHE_MS = 60_000;

export function invalidateFaqCache() {
  cache = null;
}

async function loadEntries(): Promise<MatchableEntry[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.entries;

  const entries = await prisma.faqEntry.findMany({
    where: { active: true },
    select: { id: true, question: true, answer: true, keywords: true, topic: true },
  });
  cache = { entries, at: Date.now() };
  return entries;
}

export interface AskOutcome {
  matched: boolean;
  answer?: string;
  matchedQuestion?: string;
  /** أسئلة قريبة تُعرض حين لا يوجد جواب مؤكّد */
  suggestions: { id: string; question: string }[];
}

export async function ask(question: string): Promise<AskOutcome> {
  const entries = await loadEntries();
  const best = findBestMatch(question, entries);

  if (best) {
    // العدّاد إحصائي فقط ولا يُبطئ الاستجابة.
    prisma.faqEntry
      .update({ where: { id: best.entry.id }, data: { matchCount: { increment: 1 } } })
      .catch(() => undefined);

    return {
      matched: true,
      answer: best.entry.answer,
      matchedQuestion: best.entry.question,
      suggestions: [],
    };
  }

  await recordUnanswered(question);

  return {
    matched: false,
    suggestions: findRelated(question, entries).map((e) => ({
      id: e.id,
      question: e.question,
    })),
  };
}

/** يسجّل السؤال غير المُجاب مرة واحدة ويزيد عدّاده عند تكراره. */
async function recordUnanswered(question: string) {
  const normalized = normalizeArabic(question);
  if (normalized.length < 3) return;

  try {
    await prisma.unansweredQuestion.upsert({
      where: { normalized },
      create: { text: question.trim().slice(0, 500), normalized },
      update: { askCount: { increment: 1 }, resolved: false },
    });
  } catch (e) {
    console.error("[jawib] تعذّر تسجيل السؤال:", e instanceof Error ? e.message : e);
  }
}

/** أشهر الأسئلة، تُعرض كاقتراحات جاهزة للطالب. */
export async function popularQuestions(limit = 8) {
  return prisma.faqEntry.findMany({
    where: { active: true },
    orderBy: [{ matchCount: "desc" }, { createdAt: "asc" }],
    take: limit,
    select: { id: true, question: true },
  });
}

export async function getEntry(id: string) {
  return prisma.faqEntry.findFirst({
    where: { id, active: true },
    select: { id: true, question: true, answer: true },
  });
}

/* ───────────────────────── إدارة بنك الأسئلة ───────────────────────── */

export async function listEntries(filters: {
  search?: string;
  topic?: string;
  skip?: number;
  take?: number;
}) {
  const where = {
    ...(filters.topic ? { topic: filters.topic } : {}),
    ...(filters.search
      ? {
          OR: [
            { question: { contains: filters.search, mode: "insensitive" as const } },
            { answer: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.faqEntry.findMany({
      where,
      orderBy: [{ topic: "asc" }, { createdAt: "asc" }],
      skip: filters.skip ?? 0,
      take: filters.take ?? 25,
      select: {
        id: true,
        question: true,
        answer: true,
        keywords: true,
        topic: true,
        active: true,
        matchCount: true,
      },
    }),
    prisma.faqEntry.count({ where }),
  ]);

  return { items, total };
}

export async function listUnanswered(limit = 50) {
  return prisma.unansweredQuestion.findMany({
    where: { resolved: false },
    orderBy: [{ askCount: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: { id: true, text: true, askCount: true, updatedAt: true },
  });
}

export async function listTopics() {
  const rows = await prisma.faqEntry.groupBy({
    by: ["topic"],
    _count: { topic: true },
    orderBy: { topic: "asc" },
  });
  return rows
    .filter((r) => r.topic)
    .map((r) => ({ topic: r.topic, count: r._count.topic }));
}
