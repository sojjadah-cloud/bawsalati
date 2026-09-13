// ═══════════════════════════════════════════════════════════════
// دليل التخصصات والبرامج: تصفّح هرمي وبحث بالرمز.
//
// المجال الأكاديمي ← نوع البرنامج ← المؤسسة التعليمية ← البرنامج.
// كل قائمة تُبنى من البرامج الموافقة لما قبلها، فلا يظهر خيار بلا نتائج.
// ═══════════════════════════════════════════════════════════════
import { prisma } from "@/lib/prisma";
import { GUIDE_FIELDS } from "@/lib/constants";

export interface ProgramFilters {
  field?: string;
  programType?: string;
  institution?: string;
  eligibility?: string;
}

/** برامج بلا مؤسسة محدّدة في الدليل. تُعرض تحت هذا المفتاح كي لا تختفي. */
export const NO_INSTITUTION = "—";

export interface Facet {
  value: string;
  count: number;
}

function whereFrom(filters: ProgramFilters) {
  const { field, programType, institution, eligibility } = filters;
  return {
    active: true,
    ...(field ? { field } : {}),
    ...(programType ? { programType } : {}),
    ...(eligibility ? { eligibility } : {}),
    ...(institution
      ? { institution: institution === NO_INSTITUTION ? "" : institution }
      : {}),
  };
}

async function facet(
  by: "field" | "programType" | "institution" | "eligibility",
  filters: ProgramFilters
): Promise<Facet[]> {
  const rows = await prisma.studyProgram.groupBy({
    by: [by],
    where: whereFrom(filters),
    _count: { _all: true },
  });

  const facets = rows
    .map((r) => ({
      value: (r[by] as string) || (by === "institution" ? NO_INSTITUTION : ""),
      count: r._count._all,
    }))
    .filter((r) => r.value);

  // المجالات ترتيبها ترتيب الدليل نفسه، فالصفحة مرجع لا قائمة إحصاء
  if (by === "field") {
    const order = new Map<string, number>(GUIDE_FIELDS.map((f, i) => [f.field, i]));
    return facets.sort(
      (a, b) => (order.get(a.value) ?? 99) - (order.get(b.value) ?? 99)
    );
  }

  return facets.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "ar"));
}

/**
 * خيارات كل مستوى، محسوبة من المستويات التي قبله فقط.
 * المجالات لا تتأثّر بشيء، والأنواع تتأثّر بالمجال، والمؤسسات بالاثنين.
 */
export async function browseFacets(filters: ProgramFilters) {
  const [fields, types, institutions] = await Promise.all([
    facet("field", {}),
    facet("programType", { field: filters.field }),
    facet("institution", { field: filters.field, programType: filters.programType }),
  ]);
  return { fields, types, institutions };
}

export interface ProgramCard {
  id: string;
  code: string;
  name: string;
  field: string;
  programType: string;
  institution: string;
  country: string;
  eligibility: string;
  guidePage: number | null;
}

const CARD_SELECT = {
  id: true,
  code: true,
  name: true,
  field: true,
  programType: true,
  institution: true,
  country: true,
  eligibility: true,
  guidePage: true,
} as const;

export async function listPrograms(
  filters: ProgramFilters,
  page = 1,
  pageSize = 24
): Promise<{ items: ProgramCard[]; total: number }> {
  const where = whereFrom(filters);
  const [items, total] = await Promise.all([
    prisma.studyProgram.findMany({
      where,
      orderBy: [{ field: "asc" }, { institution: "asc" }, { code: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: CARD_SELECT,
    }),
    prisma.studyProgram.count({ where }),
  ]);
  return { items, total };
}

/** بحث حرّ بالرمز أو باسم البرنامج أو المؤسسة. */
export async function searchPrograms(term: string, take = 24): Promise<ProgramCard[]> {
  const q = term.trim();
  if (q.length < 2) return [];

  return prisma.studyProgram.findMany({
    where: {
      active: true,
      OR: [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { institution: { contains: q, mode: "insensitive" } },
        { field: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ code: "asc" }],
    take,
    select: CARD_SELECT,
  });
}

/** البرنامج كاملاً بالرمز. الرمز غير حسّاس لحالة الأحرف. */
export async function getProgramByCode(code: string) {
  const program = await prisma.studyProgram.findFirst({
    where: { code: { equals: code.trim(), mode: "insensitive" }, active: true },
  });
  if (!program) return null;

  // العدّاد إحصائي فقط ولا يُبطئ الاستجابة.
  prisma.studyProgram
    .update({ where: { id: program.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);

  return program;
}

/** برامج أخرى قريبة: المجال نفسه والنوع نفسه. */
export async function relatedPrograms(code: string, field: string, programType: string) {
  return prisma.studyProgram.findMany({
    where: { active: true, field, programType, NOT: { code } },
    orderBy: { code: "asc" },
    take: 6,
    select: CARD_SELECT,
  });
}

export async function programCount() {
  return prisma.studyProgram.count({ where: { active: true } });
}
