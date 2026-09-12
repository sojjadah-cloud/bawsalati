const https = require("node:https");
const HOST = "bawsalati.onrender.com";
function get(path) {
  return new Promise((res) => {
    https.get({ host: HOST, path, timeout: 45000, headers: { "User-Agent": "audit" } }, (r) => {
      const c = []; r.on("data", (d) => c.push(d));
      r.on("end", () => { const t = Buffer.concat(c).toString("utf8");
        res({ s: r.statusCode, t, text: t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") }); });
    }).on("error", (e) => res({ s: 0, t: String(e), text: "" }))
      .on("timeout", function () { this.destroy(); res({ s: 0, t: "timeout", text: "" }); });
  });
}
(async () => {
  console.log("── الحجز ──");
  let r = await get("/booking");
  for (const n of ["نعيم الدبدوب", "محمد السريحي", "محمود الدباني"]) {
    console.log(`  ${r.text.includes(n) ? "✔" : "✘"} ${n}`);
  }

  console.log("\n── الاختبار ──");
  r = await get("/assessment");
  console.log("  الجنس:", ["ذكر", "أنثى"].every((g) => r.text.includes(g)) ? "✔ ذكر/أنثى" : "✘");
  console.log("  عدد العبارات مذكور:", /54/.test(r.text) ? "✔" : "✘");

  console.log("\n── جويب ──");
  r = await get("/ask");
  console.log("  الصفحة:", r.text.includes("اسأل جويب") ? "✔" : "✘");

  console.log("\n── المكتبة: تصفية النوع ──");
  r = await get("/library/bulletins");
  for (const t of ["كتاب مقروء", "نشرة مرئية", "نشرة مصوّرة"]) {
    console.log(`  ${r.text.includes(t) ? "✔" : "✘"} ${t} في قائمة التصفية`);
  }

  console.log("\n── الدليل ──");
  r = await get("/guide");
  console.log("  زر:", r.text.includes("افتح الدليل") ? "✔ افتح الدليل" : (r.text.includes("تنزيل الدليل") ? "✘ ما زال تنزيلاً" : "✘"));
  console.log("  خطوة واحدة قبل الاختيار:", r.text.includes("اختر المجال الأكاديمي") && !r.text.includes("اختر نوع البرنامج") ? "✔" : "✘");

  console.log("\n── قسم التخصصات ──");
  r = await get("/eligibility");
  console.log("  خطة المواد:", r.text.includes("مواد إلزامية") || r.text.includes("المواد الإلزامية") ? "✔" : "✘ القديمة");
  console.log("  العلوم البيئية:", r.text.includes("العلوم البيئية") ? "✔" : "✘");
})();
