// ═══════════════════════════════════════════════════════════════
// قراءة شروط القبول المكتوبة نثراً وتحويلها إلى شروط قابلة للفحص.
//
// نصّ الدليل مثل: «• الحصول على (90%) في الرياضيات المتقدمة أو الفيزياء.»
// يصير: { min: 90, anyOf: ["الرياضيات المتقدمة", "الفيزياء"], count: 1 }
//
// ما لا يُفهَم يبقى نصّاً ظاهراً للطالب ولا يُخمَّن، فالقبول لا يُبنى على تخمين.
// ═══════════════════════════════════════════════════════════════

import { SUBJECTS } from "@/lib/constants";

export { SUBJECTS };

export type Subject = (typeof SUBJECTS)[number];

/** صيغ أخرى تُكتب بها المادة نفسها في الدليل. */
const ALIASES: Record<string, Subject> = {
  "اللغة الانجليزية": "اللغة الإنجليزية",
  "الانجليزية": "اللغة الإنجليزية",
  "الإنجليزية": "اللغة الإنجليزية",
  "العربية": "اللغة العربية",
  "الرياضيات": "الرياضيات المتقدمة",
  "المتقدمة": "الرياضيات المتقدمة",
  "الأساسية": "الرياضيات الأساسية",
  "الاحياء": "الأحياء",
  "الدراسات الإجتماعية": "الدراسات الاجتماعية",
  "التربية الاسلامية": "التربية الإسلامية",
  "تقنية": "تقنية المعلومات",
  "هندسة": "الهندسة",
  "الرسم الهندسي": "الهندسة",
  "العلوم البيئية": "العلوم البيئية",
  "علوم بيئية": "العلوم البيئية",
  "البيئية": "العلوم البيئية",
  "الجغرافيا": "الجغرافيا الاقتصادية",
  "الجغرافيا الاقتصادية": "الجغرافيا الاقتصادية",
  "التاريخ": "التاريخ (الحضارة الإسلامية)",
  "الحضارة الإسلامية": "التاريخ (الحضارة الإسلامية)",
  "مهارات اللغة الإنجليزية": "مهارات اللغة الإنجليزية",
  "اللغة الالمانية": "اللغة الألمانية",
  "الالمانية": "اللغة الألمانية",
  "الفرنسية": "اللغة الفرنسية",
  "الصينية": "اللغة الصينية",
  "الرياضة المدرسية": "الرياضة المدرسية",
  "المهارات الموسيقية": "المهارات الموسيقية",
};

export interface SubjectRule {
  /** أدنى نسبة مطلوبة */
  min: number;
  /** المواد المقبولة لهذا الشرط — يكفي تحقّق العدد المطلوب منها */
  anyOf: Subject[];
  /** كم مادة من القائمة يجب أن تتحقّق. «مادتين من» تجعلها 2. */
  count: number;
}

export interface ParsedRequirements {
  /** أدنى معدل عام أو تقدير دبلوم التعليم العام */
  minOverall: number | null;
  rules: SubjectRule[];
  /** أسطر لم تُفهَم آلياً — تُعرض للطالب كما وردت */
  unparsed: string[];
}

const PERCENT = /\(?\s*(\d{2,3})(?:\.\d+)?\s*[%٪]\s*\)?/u;

function normalize(line: string): string {
  return line
    .replace(/[ً-ْٰـ]/gu, "")
    .replace(/[إأآٱ]/gu, "ا")
    .replace(/\s+/gu, " ")
    .trim();
}

/** يحوّل نصّ مادة (أو عدّة مواد يفصلها «أو») إلى مواد معروفة. */
export function readSubjects(text: string): Subject[] {
  // «أو» قد تصل مطبَّعة بلا همزة، والفصل يقبل الصيغتين
  const parts = text
    .split(/\s+(?:أو|او)\s+|\s*[/،,]\s*|\s+و\s+/u)
    .map((p) => p.replace(/[().:-]/gu, " ").trim())
    .filter(Boolean);

  const found: Subject[] = [];
  for (const part of parts) {
    const norm = normalize(part);
    const direct = SUBJECTS.find((s) => normalize(s) === norm);
    if (direct) {
      if (!found.includes(direct)) found.push(direct);
      continue;
    }
    const alias = Object.entries(ALIASES).find(([k]) => normalize(k) === norm);
    if (alias) {
      if (!found.includes(alias[1])) found.push(alias[1]);
      continue;
    }
    // احتواء: قد يحمل الجزء الواحد أكثر من مادة حين ينقطع السطر
    for (const s of SUBJECTS) {
      if (norm.includes(normalize(s)) && !found.includes(s)) found.push(s);
    }
    for (const [alias, subject] of Object.entries(ALIASES)) {
      if (norm.includes(normalize(alias)) && !found.includes(subject)) found.push(subject);
    }
  }
  return found;
}

/** أسطر لا تحمل شرطاً قابلاً للفحص: عبارات عامة أو إجرائية. */
const NOT_A_RULE =
  /اجتياز|مقابلة|مقابلات|اختبار قبول|فحص طبي|لياقة|يشترط الا|المفاضلة|حسم التعادل|لغة الدراسة|بلد الدراسة|المؤسسة التعليمية|يقتصر القبول|شهادة|السيرة|المقابلة/u;

/** سطرٌ يفتح قائمة مواد: «في المواد الآتية:» و«في ثلاث مواد من:» و«مادتين من». */
const LIST_HEADER = /المواد الاتي|المواد التالي|مواد من|مواد الاتي|منها|مادتين|المواد الاربعة/u;

/**
 * عدد المواد المطلوب من القائمة، مكتوباً كلمةً كما في الدليل.
 * «الحصول على (85%) في ثلاث مواد من:» تعني ثلاثاً لا واحدة.
 * التطبيع يزيل الهمزة، فـ«أربع» تصير «اربع».
 */
const COUNT_WORDS: [RegExp, number][] = [
  [/مادتين|مادتان|مادتي\b/u, 2],
  [/ثلاث/u, 3],
  [/اربع/u, 4],
  [/خمس/u, 5],
];

function readCount(norm: string): number {
  for (const [pattern, count] of COUNT_WORDS) if (pattern.test(norm)) return count;
  return 1;
}

/**
 * عدد المواد في جملة إغلاق القائمة:
 *   «في كل منها» → كلّ مادة على حدة (null)
 *   «في ثلاث منها» → ثلاث من مجموعها
 * و undefined تعني أن الجملة لم تذكر العدد بعد، وقد يأتي في السطر التالي.
 */
function closingCount(norm: string): number | null | undefined {
  if (/كل منها|كل منهما|كلٍ منها|كل مادة/u.test(norm)) return null;
  for (const [pattern, count] of COUNT_WORDS) if (pattern.test(norm)) return count;
  return undefined;
}

/**
 * «النجاح في المواد الآتية» و«دراسة المواد الآتية»: الدليل يشترط دراستها،
 * وقد يذكر نسبتها في آخر القائمة. فإن لم يذكرها بقي الشرط دراسةً بحدٍّ أدنى
 * صفر: يلزم أن يكون الطالب قد درسها، ولا تُخترَع نسبةٌ لم يذكرها الدليل.
 */
const STUDY_ONLY =
  /^(النجاح|دراسة|الدراسة|اجتياز)\s+(في\s*)?(المواد|المادتين|مادتين|ثلاث|اربع|خمس|[:：])/u;

/** فعلٌ يبتدئ شرطاً جديداً، فالسطر ليس تتمّةً لما قبله. */
const STARTS_CONDITION = /^(الحصول|النجاح|دراسة|الدراسة|اجتياز|يشترط|مع مراعاة)/u;

/**
 * قائمة مواد مفتوحة تتجمّع بنودها سطراً سطراً حتى تُغلق.
 * count = null تعني «كلٌّ منها شرطٌ مستقل»، والعدد يعني «كذا من مجموعها».
 */
interface OpenList {
  min: number | null;
  count: number | null;
  items: Subject[][];
  /** ذيل سطر النسبة حين انقطع اسم المادة آخره: «… في اللغة» + «الإنجليزية.» */
  tail: string;
}

export function parseRequirements(text: string): ParsedRequirements {
  const out: ParsedRequirements = { minOverall: null, rules: [], unparsed: [] };
  if (!text) return out;

  // آخر شرط أُنشئ من السطر السابق مباشرة، ليُوصَل به ما انقطع من سطره
  let lastRuleFromPreviousLine: SubjectRule | null = null;
  /** نسبة السطر السابق، لترويسةٍ تكمل جملته: «(85%)» ثم «في ثلاث مواد من:» */
  let previousPercent: number | null = null;
  /** المعدلات العامة المقروءة — يُسحب آخرها إن تبيّن أن جملته لم تنتهِ */
  const overalls: number[] = [];
  let overallFromPreviousLine = false;
  /** القائمة المفتوحة حالياً، إن كانت */
  let list: OpenList | null = null;
  /** نسبة الإغلاق قُرئت وبقي عدد موادها في السطر التالي */
  let awaitCount = false;
  /** «النجاح في دبلوم التعليم العام بتقدير» ونسبته في السطر التالي */
  let awaitOverall = false;
  /** انتهى السطر السابق بـ«أو»، فالسطر التالي تتمّة بدائله */
  let danglingOr = false;

  /** بنود السطر: الفاصلة تفصل بين البنود، و«أو» بدائل داخل البند الواحد. */
  function addItems(target: OpenList, text: string): number {
    const source = target.tail ? `${target.tail} ${text}` : text;
    target.tail = "";
    // الفاصلة تفصل البنود، وكذلك واو العطف بين مادتين مطلوبتين معاً:
    // «الرياضيات المتقدمة أو الأساسية والفيزياء أو الكيمياء» بندان لا بند.
    const parts = source.split(/[،,]|\s+و(?=[ا-ي])/u);
    let added = 0;
    parts.forEach((part, i) => {
      const subjects = readSubjects(part);
      if (subjects.length > 0) {
        target.items.push(subjects);
        added++;
        return;
      }
      // آخر جزءٍ لم يُعرَف قد يكون أوّل اسم مادة انقطع آخر السطر:
      // «… اللغة الإنجليزية، الرياضة» ثم «المدرسية والحصول على (65%)…»
      if (i === parts.length - 1 && part.trim().length > 2 && /[ء-ي]/u.test(part)) {
        target.tail = part.trim();
      }
    });
    return added;
  }

  /** تُكتب بنود القائمة شروطاً: كلٌّ على حدة، أو «كذا من مجموعها». */
  function emit(open: OpenList | null) {
    if (!open || open.items.length === 0) return;
    const min = open.min ?? 0;
    if (open.count === null) {
      for (const item of open.items) out.rules.push({ min, anyOf: item, count: 1 });
      return;
    }
    const union: Subject[] = [];
    for (const item of open.items) for (const s of item) if (!union.includes(s)) union.push(s);
    out.rules.push({ min, anyOf: union, count: Math.min(open.count, union.length) });
  }

  /** تُغلق القائمة الجارية وتعيد «لا قائمة». */
  const closed = (open: OpenList | null): null => {
    emit(open);
    return null;
  };

  /** تُغلق الجارية وتفتح قائمة جديدة. */
  const opened = (
    open: OpenList | null,
    min: number | null,
    count: number | null,
    tail = ""
  ): OpenList => {
    emit(open);
    return { min, count, items: [], tail };
  };

  for (const raw of text.split("\n")) {
    const line = raw.replace(/^[•\-\s]+/u, "").trim();
    if (!line) continue;
    const norm = normalize(line);
    const previousRule: SubjectRule | null = lastRuleFromPreviousLine;
    lastRuleFromPreviousLine = null;
    const lastPercent = previousPercent;
    const lastWasOverall = overallFromPreviousLine;
    overallFromPreviousLine = false;
    const percent = norm.match(PERCENT);
    previousPercent = percent ? Number(percent[1]) : null;
    const listHeader = LIST_HEADER.test(norm);
    const continuesOr = danglingOr;
    danglingOr = /\sاو\s*$/u.test(norm);

    // «… بتقدير» في سطر ونسبته في الذي يليه: «(65%).»
    if (awaitOverall) {
      awaitOverall = false;
      if (percent && readSubjects(norm.replace(PERCENT, " ")).length === 0) {
        overalls.push(Number(percent[1]));
        overallFromPreviousLine = true;
        continue;
      }
    }

    // عدد مواد الإغلاق جاء في سطرٍ تالٍ: «… كحد أدنى في» ثم «ثلاث منها.»
    if (list && awaitCount) {
      const count = closingCount(norm);
      awaitCount = false;
      if (count !== undefined) {
        list.count = count;
        list = closed(list);
        continue;
      }
      list = closed(list);
    }

    // قائمة «دراسة المواد الآتية» تُغلق بنسبتها: «… والحصول على (65%) في كل منها»
    if (list && list.min === null && percent && /الحصول/u.test(norm)) {
      const cut = norm.search(/و\s*الحصول|الحصول/u);
      // جملةٌ تعود على القائمة: «في كل منها» أو «في مادتين» بلا تسمية مادة
      const refersBack =
        /منها|منهما/u.test(norm) ||
        (readSubjects(norm.replace(PERCENT, " ")).length === 0 &&
          closingCount(norm) !== undefined);
      if (cut > 0 || refersBack) {
        if (cut > 0) addItems(list, norm.slice(0, cut));
        list.min = Number(percent[1]);
        const count = closingCount(norm.slice(cut < 0 ? 0 : cut));
        if (count === undefined) {
          awaitCount = true;
        } else {
          list.count = count;
          list = closed(list);
        }
        continue;
      }
    }

    // المعدل العام: «معدل عام لا يقل عن (85%)» أو «دبلوم التعليم العام بتقدير (65%)».
    // ولا يكون معدلاً عاماً إن أتبعه الدليل بقائمة مواد: تلك نسبة موادٍ لا معدل.
    if (
      !listHeader &&
      percent &&
      /معدل عام|دبلوم التعليم العام بتقدير|بتقدير عام|دبلوم التعليم العام بمعدل|دبلوم التعليم العام بنسبة/u.test(
        norm
      )
    ) {
      list = closed(list);
      overalls.push(Number(percent[1]));
      overallFromPreviousLine = true;
      continue;
    }

    if (/النجاح في دبلوم التعليم العام/u.test(norm) && !percent) {
      list = closed(list);
      // «بتقدير» بلا نسبة: نسبتها في السطر التالي
      awaitOverall = /بتقدير|بمعدل|بنسبة|معدل عام/u.test(norm);
      continue;
    }

    // «النجاح في المواد الآتية:-» — دراسةٌ، ونسبتها قد تأتي في آخر القائمة
    if (!percent && STUDY_ONLY.test(norm)) {
      list = opened(list, null, null);
      continue;
    }

    // ترويسة تكمل جملة النسبة في السطر السابق: «في ثلاث مواد من:»
    // ولا تكون تتمّةً إن ابتدأت بفعل: ذاك شرطٌ جديد لا بقيّة جملة.
    if (!percent && listHeader && lastPercent !== null && !list && !STARTS_CONDITION.test(norm)) {
      // النسبة كانت للمواد لا للمعدل العام، فتُسحب من المعدلات
      if (lastWasOverall && overalls[overalls.length - 1] === lastPercent) overalls.pop();
      const count = readCount(norm);
      list = opened(list, lastPercent, count > 1 ? count : null);
      continue;
    }

    // «الحصول على (90%) في المواد الآتية:-» أو «(90%) في مادتين من الأحياء أو الكيمياء»
    if (percent && (listHeader || /المواد/u.test(norm))) {
      const min = Number(percent[1]);
      const count = readCount(norm);
      list = opened(list, min, count > 1 ? count : null);
      addItems(list, norm.replace(PERCENT, " "));
      continue;
    }

    // «(90%) في الرياضيات المتقدمة أو الفيزياء»
    if (percent) {
      const after = norm.slice(norm.indexOf(percent[0]) + percent[0].length);
      const tail = after.replace(/^\s*(كحد ادنى\s*)?في\s*/u, "");
      const subjects = readSubjects(tail);
      if (subjects.length > 0) {
        list = closed(list);
        const rule = { min: Number(percent[1]), anyOf: subjects, count: 1 };
        out.rules.push(rule);
        lastRuleFromPreviousLine = rule;
        continue;
      }
      // «الحصول على (55%) في :-» ترويسة لقائمة مواد تليها، أو اسم مادة انقطع
      // آخر السطر: «… كحد أدنى في اللغة» ثم «الإنجليزية.» — يُحمل الذيل
      // إلى السطر التالي ليُقرأ الاسم كاملاً.
      list = NOT_A_RULE.test(norm)
        ? closed(list)
        : opened(list, Number(percent[1]), null, tail);
      continue;
    }

    // بند في قائمة مفتوحة
    if (list) {
      // «أو الفيزياء.» — أو سطرٌ سابق انتهى بـ«أو» — تكملةٌ للبند لا بندٌ جديد
      if ((/^او\s/u.test(norm) || continuesOr) && list.items.length > 0) {
        const last = list.items[list.items.length - 1];
        for (const s of readSubjects(norm)) if (!last.includes(s)) last.push(s);
        continue;
      }
      if (addItems(list, norm) > 0) continue;
      // سطرٌ بلا مادة: إن ابتدأ شرطاً جديداً أُغلقت القائمة، وإلا فهو تتمّة
      // ترويستها أو ذيل اسم مادة انقطع: «… أو تقنية» ثم «المعلومات.»
      if (STARTS_CONDITION.test(norm) || NOT_A_RULE.test(norm)) {
        list = closed(list);
      } else {
        continue;
      }
    }

    // نصٌّ بدأ ببنود قائمةٍ ضاعت ترويستها في استخراج الدليل. تُقرأ شرطَ دراسةٍ
    // بلا نسبة: لا تُخترع نسبةٌ لم تُقرأ، ولا يُعرض البرنامج لمن لم يدرس مواده.
    if (!list && out.rules.length === 0 && overalls.length === 0 && out.unparsed.length === 0) {
      const orphan = readSubjects(norm);
      if (orphan.length > 0) {
        list = opened(null, null, null);
        addItems(list, norm);
        continue;
      }
    }

    // سطر مقطوع عن سابقه: «... في الرياضيات» ثم «المتقدمة أو الأساسية»
    if (previousRule) {
      const subjects = readSubjects(norm);
      if (subjects.length > 0) {
        for (const s of subjects) if (!previousRule.anyOf.includes(s)) previousRule.anyOf.push(s);
        lastRuleFromPreviousLine = previousRule;
        continue;
      }
    }

    // ترويسة بلا نسبة ولا مواد: «الحصول على:-»
    if (/[:：]-?\s*$/u.test(norm)) continue;

    if (!NOT_A_RULE.test(norm)) out.unparsed.push(line);
  }

  list = closed(list);
  if (overalls.length > 0) out.minOverall = Math.max(...overalls);
  return out;
}

/* ───────────────────────── مطابقة الطالب بالشروط ───────────────────────── */

export type Marks = Partial<Record<Subject, number>>;

export interface RuleCheck {
  rule: SubjectRule;
  met: boolean;
  /** المواد التي حقّقت الشرط فعلاً */
  matched: Subject[];
}

export interface Eligibility {
  eligible: boolean;
  overallMet: boolean;
  checks: RuleCheck[];
  /** مواد يشترطها البرنامج ولم يدرسها الطالب */
  missingSubjects: Subject[];
}

/** هل يفي الطالب بشروط البرنامج؟ الدرجات اختيارية لطالب لم تصدر نتائجه. */
export function checkEligibility(
  parsed: ParsedRequirements,
  marks: Marks,
  overall: number | null
): Eligibility {
  const studied = Object.keys(marks) as Subject[];

  const checks: RuleCheck[] = parsed.rules.map((rule) => {
    const matched = rule.anyOf.filter((s) => {
      const mark = marks[s];
      return mark !== undefined && mark >= rule.min;
    });
    return { rule, met: matched.length >= rule.count, matched };
  });

  const missingSubjects: Subject[] = [];
  for (const rule of parsed.rules) {
    if (rule.anyOf.some((s) => studied.includes(s))) continue;
    for (const s of rule.anyOf) if (!missingSubjects.includes(s)) missingSubjects.push(s);
  }

  const overallMet =
    parsed.minOverall === null || (overall !== null && overall >= parsed.minOverall);

  return {
    eligible: overallMet && checks.every((c) => c.met),
    overallMet,
    checks,
    missingSubjects,
  };
}

/** هل يستطيع طالب لم تصدر نتائجه دراسة هذا البرنامج بمواده الحالية؟ */
export function canStudyWith(parsed: ParsedRequirements, studied: Subject[]): boolean {
  return parsed.rules.every((rule) => {
    const available = rule.anyOf.filter((s) => studied.includes(s));
    return available.length >= rule.count;
  });
}

/**
 * المعدل التنافسي كما ينصّ عليه الدليل (صفحة 11):
 *   النتيجة 1 = معدل جميع المواد التي درسها الطالب × 0.4
 *   النتيجة 2 = معدل المواد المطلوبة للبرنامج × 0.6
 *   المعدل التنافسي = النتيجة 1 + النتيجة 2
 *
 * يعيد null إن لم يكن للبرنامج مواد مطلوبة معروفة، فلا يُحتسب بلا أساس.
 */
export const ALL_SUBJECTS_WEIGHT = 0.4;
export const PROGRAM_SUBJECTS_WEIGHT = 0.6;

export function competitiveAverage(
  parsed: ParsedRequirements,
  marks: Marks
): number | null {
  const all = Object.values(marks).filter((v): v is number => typeof v === "number");
  if (all.length === 0) return null;

  // مواد البرنامج: أفضل مادة محقّقة من كل شرط، فالشرط يتحقّق بواحدة منها
  const programMarks: number[] = [];
  for (const rule of parsed.rules) {
    const available = rule.anyOf
      .map((s) => marks[s])
      .filter((v): v is number => typeof v === "number")
      .sort((a, b) => b - a)
      .slice(0, rule.count);
    programMarks.push(...available);
  }
  if (programMarks.length === 0) return null;

  const avgAll = all.reduce((a, b) => a + b, 0) / all.length;
  const avgProgram = programMarks.reduce((a, b) => a + b, 0) / programMarks.length;

  return Math.round((avgAll * ALL_SUBJECTS_WEIGHT + avgProgram * PROGRAM_SUBJECTS_WEIGHT) * 100) / 100;
}
