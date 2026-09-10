import { describe, expect, it } from "vitest";
import { findBestMatch, type MatchableEntry } from "@/features/faq/matching";

/**
 * الدليل هو المرجع الرسمي للقبول والبرامج، فيُقدَّم جوابه على الجواب العام
 * حين يتقارب التطابق. لكن الترجيح صغير عمداً: تطابق عام واضح يبقى فائزاً.
 */
const general = (over: Partial<MatchableEntry> = {}): MatchableEntry => ({
  id: "general",
  question: "ما المقصود بالمعدل التنافسي؟",
  answer: "جواب عام",
  keywords: [],
  topic: "عام",
  priority: 0,
  ...over,
});

const guide = (over: Partial<MatchableEntry> = {}): MatchableEntry => ({
  id: "guide",
  question: "ما المقصود بالمعدل التنافسي في دليل الطالب؟",
  answer: "جواب الدليل",
  keywords: [],
  topic: "مصطلحات الدليل",
  source: "guide",
  page: 11,
  priority: 10,
  ...over,
});

describe("ترجيح مصدر الجواب", () => {
  it("يقدّم جواب الدليل حين يتساوى التطابق", () => {
    // السؤالان بالصياغة نفسها، فلا يفصل بينهما إلا المصدر
    const same = "ما المقصود بالمعدل التنافسي؟";
    const best = findBestMatch(same, [general({ question: same }), guide({ question: same })]);
    expect(best?.entry.id).toBe("guide");
  });

  it("يقدّم جواب الدليل حين يتفوّق العام بفارق ضئيل", () => {
    // العام يزيد بكلمة واحدة مطابقة، والفارق أصغر من وزن الأولوية
    const best = findBestMatch("شروط البعثات الخارجية", [
      general({ question: "شروط البعثات الخارجية والداخلية" }),
      guide({ question: "شروط البعثات الخارجية للطلبة" }),
    ]);
    expect(best?.entry.id).toBe("guide");
  });

  it("لا يقلب تطابقاً عامّاً واضحاً", () => {
    const exact = general({ id: "exact", question: "كيف أحجز موعداً؟" });
    const far = guide({ id: "far", question: "ما المقصود بالبعثات الخارجية في دليل الطالب؟" });
    const best = findBestMatch("كيف أحجز موعداً؟", [exact, far]);
    expect(best?.entry.id).toBe("exact");
  });

  it("يبقى دون العتبة حين لا يشبه السؤال شيئاً", () => {
    expect(findBestMatch("متى ينزل راتب المعلمين", [general(), guide()])).toBeNull();
  });

  it("الأولوية لا تخترع تطابقاً من الصفر", () => {
    const only = guide({ question: "ما المقصود بالفحص الطبي في دليل الطالب؟" });
    expect(findBestMatch("سعر تذكرة الطيران", [only])).toBeNull();
  });
});
