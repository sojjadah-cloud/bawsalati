/**
 * توليد بنك أسئلة «اسألني» من دليل الطالب الرسمي.
 *
 *   pdftotext -enc UTF-8 StudentGuide2026.pdf all.txt      # ثم قسّمه بصفحاته
 *   npx tsx scripts/build-guide-faq.ts <مجلد-الصفحات> [ملف-الخرج]
 *
 * كل سؤال يُبنى من نصّ صفحة بعينها، وتُذكر الصفحة في الجواب.
 * لا يُخترَع شرط قبول ولا معدّل: ما لا يظهر في الصفحة لا يُكتب.
 * حين تحتوي الصفحة أكثر من برنامج، تُولَّد أسئلة التعريف فقط، لأن ربط
 * شرط بعينه ببرنامج بعينه غير مضمون في نصّ مستخرج من جدول.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/* ───────────────────────── تنظيف النصّ ───────────────────────── */

/**
 * التطويل الزخرفي يُمدّ في الدليل لأغراض التنسيق: «الحـــد» ← «الحد».
 * والتشكيل يخرج مبعثراً من الاستخراج («أوًاًل»)، فيُزال ثم تُصلَح الترتيبات.
 */
function stripTatweel(s: string): string {
  return s
    .replace(/ـ+/gu, "")
    .replace(/[ً-ْٰ]/gu, "")
    .replace(/(?<!\p{L})أوال(?!\p{L})/gu, "أولاً")
    .replace(/(ثاني|ثالث|رابع|خامس|سادس|سابع|ثامن|تاسع|عاشر)\s+ا(?!\p{L})/gu, "$1اً");
}

/**
 * يعيد بناء ما شوّهه استخراج النصّ ثنائي الاتجاه:
 * «).)٪95» و«) )٪90» تعنيان نسبة مئوية، و«))Medicine» تعني اسماً بين قوسين.
 */
function fixArtifacts(s: string): string {
  let out = s
    .replace(/\)\s*[.)]?\s*\)?\s*٪\s*(\d+(?:\.\d+)?)/gu, "$1%")
    .replace(/\(\s*\(\s*٪\s*(\d+(?:\.\d+)?)/gu, "$1%")
    .replace(/٪\s*(\d+(?:\.\d+)?)/gu, "$1%")
    .replace(/\)\s*\)/gu, ")")
    .replace(/\(\s*\(/gu, "(")
    .replace(/[ \t]{2,}/gu, " ")
    .trim();

  // الاستخراج يقلب القوسين في النصّ العربي: «)للذكور فقط(» ← «(للذكور فقط)»
  out = out.replace(/\)([^()]{1,60})\(/gu, "($1)");
  // قوس أعزل في أول السطر أو آخره بلا نظير
  const open = (out.match(/\(/gu) ?? []).length;
  const close = (out.match(/\)/gu) ?? []).length;
  if (open !== close) out = out.replace(/^[)(]\s*/u, "").replace(/\s*[)(]$/u, "");
  return out.trim();
}

function cleanLine(s: string): string {
  return fixArtifacts(stripTatweel(s)).replace(/\s+/gu, " ").trim();
}

/* ───────────────────────── قراءة الصفحات ───────────────────────── */

interface Page {
  number: number;
  raw: string;
  lines: string[];
}

function loadPages(dir: string): Page[] {
  return readdirSync(dir)
    .filter((f) => /^p\d+\.txt$/u.test(f))
    .sort()
    .map((f) => {
      const number = Number(f.replace(/\D/gu, ""));
      const raw = readFileSync(join(dir, f), "utf8");
      const lines = raw
        .split("\n")
        .map(cleanLine)
        .filter((l) => l && !/^العودة إلى الفهرس$/u.test(l) && l !== String(number));
      return { number, raw, lines };
    });
}

/* ───────────────────────── استخراج البرامج ───────────────────────── */

const CODE_RE = /^[A-Z]{2,4}\d{3,4}$/u;
const NOISE = [
  "رمز البرنامج",
  "اسم البرنامج",
  "الحد الأدنى للتقدم للبرنامج",
  "حسم التعادل ومعلومات إضافية عن البرنامج",
  "حسم التعادل ومعلومات",
  "تابع",
];

function isNoise(line: string): boolean {
  return NOISE.some((n) => line.includes(n));
}

interface Program {
  code: string;
  name: string;
  altName?: string;
  page: number;
  section: string;
}

/** أسطر لا تصلح اسماً لبرنامج: شروط، ونسب، وبيانات جانبية. */
const NOT_A_NAME =
  /الحصول على|النجاح في|دبلوم التعليم العام|حسم التعادل|لغة الدراسة|بلد الدراسة|المؤسسة التعليمية|معلومات إضافية|الحد الأدنى|معدل عام|اجتياز|يشترط|مشروط|كل منها|أدنى|%|[.:]|^[-•]/u;

/** جمل الأحكام والملاحظات تسبق الرموز أحياناً، وليست أسماء برامج. */
const SENTENCE_LIKE =
  /^لا |لا تغطي|لا يمكن|لا يحق|يجب |على الطلبة|على الطالب|تشمل|يشمل|ملاحظ|يمكن للطالب|في حال|عند |سوف |سيتم /u;

function looksLikeName(line: string): boolean {
  if (!line || line.length < 3 || line.length > 90) return false;
  if (NOT_A_NAME.test(line) || SENTENCE_LIKE.test(line)) return false;
  if (/^\d+$/u.test(line)) return false;
  if (line.split(/\s+/u).length > 12) return false;
  return true;
}

/** جهة الدراسة أو باب الدليل الذي يرد تحته البرنامج. */
const SECTION_RE =
  /(جامعة|الجامعة|كلية|الكلية|الكليات|معهد|أكاديمية|البعثات|المنح|بعثات|منح|مؤسسات التعليم)/u;

function sectionOf(page: Page): string {
  const candidates = page.lines.slice(0, 12).filter((l) => !isNoise(l) && !CODE_RE.test(l));
  const titled = candidates.find(
    (l) => SECTION_RE.test(l) && l.length >= 6 && l.length <= 90 && !NOT_A_NAME.test(l)
  );
  const chosen =
    titled ?? candidates.find((l) => l.length >= 6 && l.length <= 90 && !/^\d+$/u.test(l));
  return (chosen ?? "").replace(/^[.\d\s]+/u, "").replace(/:$/u, "").trim();
}

function extractPrograms(page: Page): Program[] {
  const section = sectionOf(page);
  const out: Program[] = [];

  page.lines.forEach((line, i) => {
    if (!CODE_RE.test(line)) return;

    // الاسم يسبق الرمز: نرجع للخلف ونتوقّف عند أول سطر لا يصلح اسماً
    const before: string[] = [];
    for (let j = i - 1; j >= 0 && before.length < 3; j--) {
      const prev = page.lines[j];
      if (!prev || CODE_RE.test(prev) || isNoise(prev)) break;
      if (!looksLikeName(prev)) break;
      before.unshift(prev);
    }
    if (before.length === 0) return;

    // «يأتي أيضًا بمسمى» يفصل الاسم العربي عن مرادفه الإنجليزي
    const splitAt = before.findIndex((l) => /يأتي أيض|بمسمّ|بمسمى|بمسميات/u.test(l));
    const nameParts = splitAt === -1 ? before : before.slice(0, splitAt);
    const altParts = splitAt === -1 ? [] : before.slice(splitAt + 1);

    const name = nameParts.join(" ").trim();
    if (!name || name.length < 3 || name.length > 110 || /^\d+$/u.test(name)) return;
    if (NOT_A_NAME.test(name)) return;

    out.push({
      code: line,
      name,
      altName: altParts.join(" ").trim() || undefined,
      page: page.number,
      section,
    });
  });

  return out;
}

/* ───────────────────────── استخراج الشروط ───────────────────────── */

interface PageFacts {
  requirements: string[];
  tieBreak: string[];
  language?: string;
  country?: string;
  institution?: string;
  /** عدد كتل الشروط في الصفحة. أكثر من واحدة يعني أن النسبة لبرنامج بعينه غير مضمونة. */
  requirementBlocks: number;
}

function extractFacts(page: Page): PageFacts {
  const facts: PageFacts = { requirements: [], tieBreak: [], requirementBlocks: 0 };
  let mode: "none" | "req" | "tie" = "none";

  for (const line of page.lines) {
    if (/^•?\s*حسم التعادل/u.test(line)) {
      mode = "tie";
      continue;
    }
    if (/^•?\s*معلومات إضافية/u.test(line)) {
      mode = "none";
      continue;
    }
    if (/النجاح في دبلوم التعليم العام/u.test(line)) {
      facts.requirementBlocks += 1;
      mode = "req";
    } else if (/الحصول على معدل عام/u.test(line)) {
      mode = "req";
    }

    const lang = line.match(/لغة الدراسة\s*:?\s*(.+)/u);
    if (lang) facts.language = lang[1].split("•")[0].trim();

    const country = line.match(/بلد الدراسة\s*:?\s*(.+)/u);
    if (country) facts.country = country[1].split("•")[0].trim();

    const inst = line.match(/المؤسسة التعليمية\s*:?\s*(.+)/u);
    if (inst) facts.institution = inst[1].split("•")[0].trim();

    if (mode === "req" && /^[•\-]/u.test(line)) {
      facts.requirements.push(line.replace(/^[•\-]\s*/u, ""));
    } else if (mode === "tie" && /^[•\-]/u.test(line)) {
      const t = line.replace(/^[•\-]\s*/u, "");
      if (t && !/معلومات إضافية/u.test(t)) facts.tieBreak.push(t);
    }
  }

  facts.requirements = dedupe(facts.requirements).slice(0, 12);
  facts.tieBreak = dedupe(facts.tieBreak).slice(0, 6);
  return facts;
}

function dedupe(a: string[]): string[] {
  return [...new Set(a.map((x) => x.trim()).filter(Boolean))];
}

/* ───────────────────────── بناء المدخلات ───────────────────────── */

interface Entry {
  topic: string;
  q: string;
  a: string;
  k: string[];
  source: "guide";
  page: number;
}

const GUIDE = "دليل الطالب 2026 الصادر عن مركز القبول الموحد";
function ref(page: number): string {
  return `المصدر: ${GUIDE}، صفحة ${page}.`;
}

function programEntries(p: Program, facts: PageFacts, alone: boolean): Entry[] {
  const entries: Entry[] = [];
  const where = p.section ? ` ضمن «${p.section}»` : "";
  const topic = "برامج الدليل";

  entries.push({
    topic,
    q: `ما البرنامج الذي رمزه ${p.code}؟`,
    a: `الرمز ${p.code} هو برنامج «${p.name}»${where}.${p.altName ? ` ويرد أيضاً باسم: ${p.altName}.` : ""} ${ref(p.page)}`,
    k: [p.code, `برنامج ${p.code}`, `رمز ${p.code}`, `${p.code} وش هو`, `ايش ${p.code}`],
    source: "guide",
    page: p.page,
  });

  entries.push({
    topic,
    q: `ما رمز برنامج ${p.name}؟`,
    a: `رمز برنامج «${p.name}»${where} هو ${p.code}. ${ref(p.page)}`,
    k: [`رمز ${p.name}`, `كود ${p.name}`, `${p.name} رمزه`, `ابي رمز ${p.name}`],
    source: "guide",
    page: p.page,
  });

  if (p.section) {
    entries.push({
      topic,
      q: `أين يُدرَّس برنامج ${p.name}؟`,
      a: `يرد برنامج «${p.name}» (${p.code}) في الدليل تحت «${p.section}»${
        facts.institution ? ` — المؤسسة التعليمية: ${facts.institution}` : ""
      }${facts.country ? ` — بلد الدراسة: ${facts.country}` : ""}. ${ref(p.page)}`,
      k: [`وين ${p.name}`, `${p.name} وين`, `مكان دراسة ${p.name}`, `${p.code} وين`],
      source: "guide",
      page: p.page,
    });
  }

  entries.push({
    topic,
    q: `أين أجد تفاصيل برنامج ${p.code} في الدليل؟`,
    a: `تفاصيل برنامج «${p.name}» (${p.code}) في صفحة ${p.page} من دليل الطالب. افتح الدليل من صفحة «دليل الطالب» في المنصة وانتقل إلى تلك الصفحة.`,
    k: [`صفحة ${p.code}`, `تفاصيل ${p.code}`, `وين القى ${p.code}`, `${p.name} في الدليل`],
    source: "guide",
    page: p.page,
  });

  // الشروط تُنسب لبرنامج بعينه فقط حين تنفرد به الصفحة
  if (alone && facts.requirementBlocks === 1 && facts.requirements.length) {
    entries.push({
      topic,
      q: `ما شروط الالتحاق ببرنامج ${p.name}؟`,
      a: `الحد الأدنى للتقدم لبرنامج «${p.name}» (${p.code}) كما ورد في الدليل:\n- ${facts.requirements.join("\n- ")}\n${ref(p.page)}`,
      k: [`شروط ${p.name}`, `شروط ${p.code}`, `متطلبات ${p.name}`, `وش يبي ${p.name}`, `معدل ${p.name}`],
      source: "guide",
      page: p.page,
    });
  }

  if (alone && facts.requirementBlocks <= 1 && facts.tieBreak.length) {
    entries.push({
      topic,
      q: `ما مواد حسم التعادل في برنامج ${p.name}؟`,
      a: `مواد حسم التعادل لبرنامج «${p.name}» (${p.code}): ${facts.tieBreak.join("، ")}. ${ref(p.page)}`,
      k: [`حسم التعادل ${p.name}`, `حسم التعادل ${p.code}`, `تعادل ${p.name}`],
      source: "guide",
      page: p.page,
    });
  }

  if (alone && facts.language) {
    entries.push({
      topic,
      q: `ما لغة الدراسة في برنامج ${p.name}؟`,
      a: `لغة الدراسة في برنامج «${p.name}» (${p.code}): ${facts.language}. ${ref(p.page)}`,
      k: [`لغة الدراسة ${p.name}`, `لغة ${p.code}`, `${p.name} انجليزي ولا عربي`],
      source: "guide",
      page: p.page,
    });
  }

  return entries;
}

/* ───────────────────────── الأقسام النصّية ───────────────────────── */

/** فقرات الصفحة النصّية: تُجمع الأسطر المتتابعة حتى فراغ منطقي. */
function paragraphs(page: Page): string[] {
  const out: string[] = [];
  let buf: string[] = [];
  for (const line of page.lines) {
    if (isNoise(line)) continue;
    buf.push(line);
    if (/[.:؟!]$/u.test(line) && buf.join(" ").length > 120) {
      out.push(buf.join(" "));
      buf = [];
    }
  }
  if (buf.length) out.push(buf.join(" "));
  return out.map((p) => p.trim()).filter((p) => p.length > 120);
}

function clip(s: string, max = 900): string {
  return s.length > max ? s.slice(0, max).replace(/\s\S*$/u, "") + "…" : s;
}

/** صفحات الفهرس والقوائم الرقمية لا تصلح جواباً: نصّها أرقام صفحات وعناوين مبتورة. */
function isIndexPage(page: Page): boolean {
  const text = page.lines.join(" ");
  if (/الفهرس|المحتوى/u.test(text) && /(\d+\s+){6,}/u.test(text)) return true;
  const digits = (text.match(/\d/gu) ?? []).length;
  return text.length > 0 && digits / text.length > 0.15;
}

function proseEntries(page: Page, heading: string): Entry[] {
  if (isIndexPage(page)) return [];
  const paras = paragraphs(page);
  if (!heading || paras.length === 0) return [];

  const out: Entry[] = [
    {
      topic: "أحكام الدليل",
      q: `ماذا يقول الدليل عن ${heading}؟`,
      a: `${clip(paras.slice(0, 3).join(" "))}\n${ref(page.number)}`,
      k: [heading, `${heading} في الدليل`, `معلومات عن ${heading}`, `وش يقول الدليل عن ${heading}`],
      source: "guide",
      page: page.number,
    },
    {
      topic: "أحكام الدليل",
      q: `في أي صفحة أجد ${heading} في الدليل؟`,
      a: `${heading}: صفحة ${page.number} من ${GUIDE}. افتح الدليل من صفحة «دليل الطالب» في المنصة.`,
      k: [`صفحة ${heading}`, `وين ${heading}`, `${heading} اي صفحة`],
      source: "guide",
      page: page.number,
    },
  ];

  // بقيّة الصفحة تُفرَد في مدخل ثانٍ حتى لا يضيع نصفها الأسفل
  const rest = paras.slice(3);
  if (rest.length) {
    out.push({
      topic: "أحكام الدليل",
      q: `ما تفاصيل ${heading} في صفحة ${page.number} من الدليل؟`,
      a: `${clip(rest.join(" "))}\n${ref(page.number)}`,
      k: [`تفاصيل ${heading}`, `${heading} بالتفصيل`, `اكثر عن ${heading}`],
      source: "guide",
      page: page.number,
    });
  }

  return out;
}

/* ───────────────────────── المصطلحات الأساسية ───────────────────────── */

/**
 * مصطلحات يسأل عنها الطالب بالاسم. لكل مصطلح يُبحث عن الصفحة التي تشرحه
 * أكثر من غيرها، ويُبنى الجواب من فقراتها. القائمة مأخوذة من فهرس الدليل.
 */
const TERMS = [
  "المعدل التنافسي",
  "مركز القبول الموحد",
  "نظام القبول الإلكتروني",
  "ترتيب الاختيارات",
  "ترتيب الاستحقاق",
  "تعديل الرغبات",
  "الفرز التجريبي",
  "الفرز الأول",
  "الفرز الثاني",
  "الفرز الثالث",
  "الشواغر",
  "البعثات الداخلية",
  "البعثات الخارجية",
  "المنح الداخلية",
  "المنح الخارجية",
  "البرامج التأسيسية",
  "اختبارات القبول",
  "المقابلات الشخصية",
  "طلبة الدور الثاني",
  "طلبة ذوي الإعاقة",
  "الشهادات المعادلة",
  "المؤهلات الدولية",
  "برنامج التوطين",
  "خدمة السكن",
  "المخصصات المالية",
  "دبلوم التعليم العام",
  "استكمال إجراءات التسجيل",
  "خدمات القبول المساندة",
  "الرسائل النصية القصيرة",
  "مؤسسات التعليم العالي",
  "الكليات المهنية",
  "الكلية العسكرية التقنية",
  "كلية العلوم الشرعية",
  "جامعة السلطان قابوس",
  "جامعة التقنية والعلوم التطبيقية",
  "كلية عمان للعلوم الصحية",
  "الاعتماد الأكاديمي",
  "رقم المستخدم",
  "الرقم السري",
  "الفحص الطبي",
];

function termEntries(pages: Page[]): Entry[] {
  const out: Entry[] = [];

  for (const term of TERMS) {
    // الصفحة الأكثر ذكراً للمصطلح خارج صفحات الفهرس
    // أول شرح نثري للمصطلح في ترتيب الدليل: التعريفات تسبق الجداول
    let bestPage: Page | null = null;
    let body = "";

    for (const page of pages) {
      if (isIndexPage(page)) continue;
      const explaining = paragraphs(page).filter((p) => {
        if (!p.includes(term) || p.length < 200) return false;
        const digits = (p.match(/\d/gu) ?? []).length / p.length;
        return digits < 0.08;
      });
      if (explaining.length === 0) continue;
      bestPage = page;
      body = explaining.slice(0, 2).join(" ");
      break;
    }

    if (!bestPage || body.length < 200) continue;

    // صيغة بلا أداة تعريف تقرّب أسئلة مثل «كيف احسب معدلي التنافسي»
    const bare = term.replace(/^ال/u, "");

    out.push({
      topic: "مصطلحات الدليل",
      q: `ما المقصود بـ${term} في دليل الطالب؟`,
      a: `${clip(body)}\n${ref(bestPage.number)}`,
      k: [
        term,
        bare,
        `ما هو ${term}`,
        `وش ${term}`,
        `شنو ${term}`,
        `يعني ايش ${term}`,
        `اشرح ${term}`,
        `${term} في الدليل`,
        `طريقة احتساب ${bare}`,
        `كيف احسب ${bare}`,
        `متى ${bare}`,
        `شروط ${bare}`,
      ],
      source: "guide",
      page: bestPage.number,
    });
  }

  return out;
}

/* ───────────────────────── التشغيل ───────────────────────── */

function main() {
  const dir = process.argv[2];
  const out = process.argv[3] ?? join(process.cwd(), "prisma", "seed-data", "faq-guide.json");
  if (!dir) throw new Error("مرّر مجلد صفحات الدليل النصّية");

  const pages = loadPages(dir);
  const entries: Entry[] = [];
  const sections = new Map<string, Program[]>();

  for (const page of pages) {
    const programs = extractPrograms(page);
    const facts = extractFacts(page);

    // رمز ظهر في الصفحة ولم يُستخرج له اسم موثوق: يُشار إلى صفحته فقط،
    // فالإحالة الصحيحة خير من اسم مستخرج على غير يقين.
    const named = new Set(programs.map((p) => p.code));
    const section = sectionOf(page);
    const inPage = new Set(page.lines.join("\n").match(/\b[A-Z]{2,4}\d{3,4}\b/gu) ?? []);
    for (const line of inPage) {
      if (named.has(line)) continue;
      named.add(line);
      entries.push({
        topic: "برامج الدليل",
        q: `أين أجد برنامج ${line} في الدليل؟`,
        a: `رمز البرنامج ${line} يرد في صفحة ${page.number} من دليل الطالب${
          section ? ` تحت «${section}»` : ""
        }. افتح الدليل من صفحة «دليل الطالب» في المنصة وانتقل إلى تلك الصفحة لقراءة اسم البرنامج وشروطه كاملة.`,
        k: [line, `برنامج ${line}`, `رمز ${line}`, `${line} وين`, `صفحة ${line}`],
        source: "guide",
        page: page.number,
      });
    }

    for (const p of programs) {
      entries.push(...programEntries(p, facts, programs.length === 1));
      if (p.section) {
        const list = sections.get(p.section) ?? [];
        list.push(p);
        sections.set(p.section, list);
      }
    }

    // النصّ المصاحب يُفهرس أيضاً في صفحات الجداول، ففيها تعريفات وأحكام مهمّة
    entries.push(...proseEntries(page, sectionOf(page)));
  }

  entries.push(...termEntries(pages));

  // سؤال لكل جهة: ما البرامج التي ترد تحتها؟
  for (const [section, list] of sections) {
    const uniq = [...new Map(list.map((p) => [p.code, p])).values()];
    if (uniq.length < 2) continue;
    entries.push({
      topic: "برامج الدليل",
      q: `ما البرامج الواردة تحت ${section}؟`,
      a: `يرد تحت «${section}» في الدليل: ${uniq
        .map((p) => `${p.name} (${p.code})`)
        .join("، ")}. ${ref(uniq[0].page)}`,
      k: [`برامج ${section}`, `تخصصات ${section}`, `${section} وش فيها`],
      source: "guide",
      page: uniq[0].page,
    });
  }

  // إزالة التكرار بالسؤال
  const seen = new Set<string>();
  const unique = entries.filter((e) => {
    const key = e.q.replace(/\s+/gu, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  writeFileSync(
    out,
    JSON.stringify(
      {
        note: `بنك أسئلة مستخرج آلياً من ${GUIDE}. كل جواب مأخوذ من نصّ صفحة محدّدة والصفحة مذكورة فيه. لم تُضَف أي معلومة من خارج الدليل.`,
        generatedAt: new Date().toISOString().slice(0, 10),
        entries: unique,
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  const byTopic = unique.reduce<Record<string, number>>((acc, e) => {
    acc[e.topic] = (acc[e.topic] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`الصفحات: ${pages.length}`);
  console.log(`المدخلات: ${unique.length}`, byTopic);
  console.log(`الأقسام: ${sections.size}`);
  console.log(`الملف: ${out}`);
}

main();
