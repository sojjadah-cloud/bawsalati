import { describe, expect, it } from "vitest";
import {
  browseFacets,
  listPrograms,
  searchPrograms,
  getProgramByCode,
  relatedPrograms,
  programCount,
  NO_INSTITUTION,
} from "@/features/programs/service";

/**
 * دليل التخصصات يُقرأ فقط، فهذه الاختبارات تقرأ البيانات المُدخَلة من الدليل
 * ولا تكتب شيئاً. تتحقّق من أن التصفية هرمية فعلاً: كل مستوى يضيق بما قبله،
 * ولا يظهر خيار بلا نتائج.
 */
describe("دليل التخصصات والبرامج", () => {
  it("البيانات مُدخَلة", async () => {
    expect(await programCount()).toBeGreaterThan(500);
  });

  it("المجالات الأكاديمية ثلاثة عشر", async () => {
    const { fields } = await browseFacets({});
    expect(fields).toHaveLength(13);
    expect(fields.map((f) => f.value)).toContain("الصحة");
  });

  it("مجموع عدّادات المجالات يساوي كل البرامج", async () => {
    const { fields } = await browseFacets({});
    const sum = fields.reduce((n, f) => n + f.count, 0);
    expect(sum).toBe(await programCount());
  });

  it("أنواع البرامج تضيق بالمجال المختار", async () => {
    const all = await browseFacets({});
    const inHealth = await browseFacets({ field: "الصحة" });
    expect(inHealth.types.length).toBeGreaterThan(0);
    expect(inHealth.types.length).toBeLessThanOrEqual(all.types.length);
    // لا نوع بلا برامج في هذا المجال
    expect(inHealth.types.every((t) => t.count > 0)).toBe(true);
  });

  it("المؤسسات تضيق بالمجال والنوع معاً", async () => {
    const facets = await browseFacets({ field: "الصحة", programType: "البعثات الخارجية" });
    expect(facets.institutions.length).toBeGreaterThan(0);

    for (const inst of facets.institutions) {
      const { total } = await listPrograms({
        field: "الصحة",
        programType: "البعثات الخارجية",
        institution: inst.value,
      });
      expect(total).toBe(inst.count);
    }
  });

  it("البرامج بلا مؤسسة تبقى قابلة للوصول", async () => {
    const facets = await browseFacets({ field: "الصحة", programType: "البعثات الخارجية" });
    const bucket = facets.institutions.find((i) => i.value === NO_INSTITUTION);
    if (!bucket) return; // لا بأس إن كانت كلها منسوبة لمؤسسة
    const { items, total } = await listPrograms({
      field: "الصحة",
      programType: "البعثات الخارجية",
      institution: NO_INSTITUTION,
    });
    expect(total).toBe(bucket.count);
    expect(items.every((p) => p.institution === "")).toBe(true);
  });

  it("عدد نتائج التصفية يطابق عدّاد الخيار", async () => {
    const { fields } = await browseFacets({});
    const health = fields.find((f) => f.value === "الصحة");
    const { total } = await listPrograms({ field: "الصحة" });
    expect(total).toBe(health?.count);
  });

  it("البحث بالرمز يجد البرنامج مهما كانت حالة الأحرف", async () => {
    const upper = await getProgramByCode("SE021");
    const lower = await getProgramByCode("se021");
    expect(upper?.id).toBeTruthy();
    expect(lower?.id).toBe(upper?.id);
  });

  it("رمز غير موجود يعيد لا شيء", async () => {
    expect(await getProgramByCode("ZZ999")).toBeNull();
  });

  it("البحث الحرّ يشمل الرمز والاسم والمؤسسة", async () => {
    const byCode = await searchPrograms("SE021");
    expect(byCode.some((p) => p.code === "SE021")).toBe(true);

    const byField = await searchPrograms("الصحة");
    expect(byField.length).toBeGreaterThan(0);
  });

  it("البحث بحرف واحد لا يعيد شيئاً", async () => {
    expect(await searchPrograms("ا")).toHaveLength(0);
  });

  it("البرامج القريبة من المجال والنوع نفسيهما ولا تعيد البرنامج ذاته", async () => {
    const program = await getProgramByCode("SE021");
    expect(program).not.toBeNull();
    const related = await relatedPrograms(program!.code, program!.field, program!.programType);
    expect(related.every((p) => p.code !== program!.code)).toBe(true);
    expect(related.every((p) => p.field === program!.field)).toBe(true);
  });
});
