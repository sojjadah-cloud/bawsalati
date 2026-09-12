import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const OFFICIAL: Record<string, number[]> = {
  "و": [1,2,3,19,20,21,37,38,39],
  "س": [4,5,6,22,23,24,40,41,42],
  "ف": [7,8,9,25,26,27,43,44,45],
  "ا": [10,11,12,28,29,30,46,47,48],
  "م": [13,14,15,31,32,33,49,50,51],
  "ت": [16,17,18,34,35,36,52,53,54],
};

async function main() {
  const session = await prisma.assessmentSession.findFirst({
    where: { studentName: "طالب فحص الترابط" },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      answers: { select: { value: true, question: { select: { number: true, text: true, dimension: { select: { code: true } } } } } },
      result: { select: { interestCode: true, sections: { select: { dimensionCode: true, rawScore: true, percentile: true, cells: true }, orderBy: { displayOrder: "asc" } } } },
    },
  });
  if (!session?.result) throw new Error("لا توجد نتيجة");

  const stored = new Map(session.answers.map((a) => [a.question.number, a.value]));
  const textOf = new Map(session.answers.map((a) => [a.question.number, a.question.text]));
  const dimOf = new Map(session.answers.map((a) => [a.question.number, a.question.dimension.code]));

  let problems = 0;
  const intendedFor = (n: number) => (n % 4 === 0 ? 1 : 0);

  console.log("── الإجابات المخزّنة مقابل ما أرسله الطالب ──");
  for (let n = 1; n <= 54; n++) {
    const want = intendedFor(n);
    const got = (stored.get(n) ?? 0) > 0 ? 1 : 0;
    if (want !== got) { console.log(`  ✘ عبارة ${n}: أرسل ${want} وخُزّن ${got}`); problems++; }
  }
  console.log(problems === 0 ? "  ✔ كل الإجابات مخزّنة كما أُرسلت" : `  ${problems} اختلاف`);

  console.log("\n── توزيع العبارات على البيئات ──");
  for (const [code, numbers] of Object.entries(OFFICIAL)) {
    const actual = [...dimOf.entries()].filter(([, c]) => c === code).map(([n]) => n).sort((a, b) => a - b);
    const same = JSON.stringify(actual) === JSON.stringify(numbers);
    if (!same) { console.log(`  ✘ ${code}: ${actual.join(",")}`); problems++; }
  }
  console.log("  ✔ كل بيئة تحمل عباراتها كما في الدليل");

  console.log("\n── خلايا الجدول مقابل الإجابات ──");
  for (const s of session.result.sections) {
    const grid = s.cells as unknown as { questionNumber: number; text: string; value: number }[][];
    const flat = grid.flat();
    const expected = OFFICIAL[s.dimensionCode];

    if (JSON.stringify(flat.map((c) => c.questionNumber)) !== JSON.stringify(expected)) {
      console.log(`  ✘ ${s.dimensionCode}: ترتيب العبارات ${flat.map((c) => c.questionNumber).join(",")}`);
      problems++;
    }
    for (const cell of flat) {
      const answered = (stored.get(cell.questionNumber) ?? 0) > 0 ? 1 : 0;
      if (cell.value !== answered) { console.log(`  ✘ ${s.dimensionCode} عبارة ${cell.questionNumber}: الجدول ${cell.value} والإجابة ${answered}`); problems++; }
      if (cell.text !== textOf.get(cell.questionNumber)) { console.log(`  ✘ ${s.dimensionCode} عبارة ${cell.questionNumber}: نصّ مختلف`); problems++; }
    }
    const counted = flat.filter((c) => c.value === 1).length;
    if (counted !== s.rawScore) { console.log(`  ✘ ${s.dimensionCode}: الدرجة ${s.rawScore} والمفضّل في الجدول ${counted}`); problems++; }
    console.log(`  ${s.dimensionCode}: خام ${s.rawScore} · مئينية ${s.percentile} · مفضّل في الجدول ${counted}`);
  }

  console.log("\n── رمز الميول ──");
  const ordered = [...session.result.sections].sort((a, b) => b.percentile - a.percentile || b.rawScore - a.rawScore);
  const expectedCode = ordered.slice(0, 3).map((s) => s.dimensionCode).join(" - ");
  if (expectedCode !== session.result.interestCode) { console.log(`  ✘ الرمز ${session.result.interestCode} والمتوقّع ${expectedCode}`); problems++; }
  else console.log(`  ✔ ${session.result.interestCode} = أعلى ثلاث رتب`);

  console.log(problems === 0 ? "\n✅ البيانات مترابطة تماماً" : `\n❌ ${problems} مشكلة`);
}
main().finally(() => prisma.$disconnect());
