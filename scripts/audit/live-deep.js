const https = require("node:https");
const HOST = "bawsalati.onrender.com";

function req(method, path, body) {
  return new Promise((res) => {
    const d = body === undefined ? null : JSON.stringify(body);
    const headers = { "User-Agent": "bawsalati-audit" };
    if (d) { headers["Content-Type"] = "application/json"; headers["Content-Length"] = Buffer.byteLength(d); headers.Origin = `https://${HOST}`; }
    const r = https.request({ host: HOST, path, method, timeout: 45000, headers }, (rr) => {
      const chunks = []; rr.on("data", (c) => chunks.push(c));
      rr.on("end", () => { const t = Buffer.concat(chunks).toString("utf8"); let j = null; try { j = JSON.parse(t); } catch {}
        res({ s: rr.statusCode, t, j, h: rr.headers }); });
    });
    r.on("error", (e) => res({ s: 0, t: String(e) }));
    r.on("timeout", () => { r.destroy(); res({ s: 0, t: "timeout" }); });
    if (d) r.write(d); r.end();
  });
}
const CORE = ["التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", "الدراسات الاجتماعية"];

(async () => {
  console.log("── المحتوى ──");
  let r = await req("GET", "/guide");
  console.log("  برامج معروضة:", (r.t.match(/(\d+) برنامجاً دراسياً/) || [])[1]);
  r = await req("GET", "/library");
  const counts = [...r.t.matchAll(/(\d+) مورداً/g)].map((m) => m[1]);
  console.log("  تصنيفات المكتبة:", counts.join("، "), "| نشرات:", r.t.includes("نشرات التوجيه المهني") ? "موجود" : "غائب");
  r = await req("GET", "/api/ask");
  console.log("  أسئلة جويب المقترحة:", (r.j?.questions || []).length);

  console.log("\n── قسم التخصصات المتاحة ──");
  r = await req("POST", "/api/eligibility", { grade: "12", marks: [
    ...CORE.map((s) => ({ subject: s, mark: 90 })),
    { subject: "الرياضيات المتقدمة", mark: 95 }, { subject: "الفيزياء", mark: 93 },
    { subject: "الكيمياء", mark: 96 }, { subject: "الأحياء", mark: 94 }] });
  console.log("  status", r.s, "| متاح:", r.j?.eligible?.length, "| قريب:", r.j?.nearMisses?.length,
    "| يحتاج مواد:", r.j?.needsSubjects?.length, "| متوسط:", r.j?.overall);
  if (r.j?.eligible?.[0]) console.log("  أعلى تنافسي:", r.j.eligible[0].code, r.j.eligible[0].competitive);

  r = await req("POST", "/api/eligibility", { grade: "12", marks: [{ subject: "الكيمياء", mark: 130 }] });
  console.log("  درجة 130 تُرفض:", r.s === 422 ? "✔" : "✘ " + r.s);

  console.log("\n── جويب ──");
  for (const q of ["ما هو المعدل التنافسي", "كيف احجز موعد", "متى ينزل راتب المعلمين"]) {
    r = await req("POST", "/api/ask", { question: q });
    console.log(`  ${r.j?.matched ? "✔" : "→"} ${q} :: ${r.j?.matched ? r.j.matchedQuestion : "إحالة"}`);
  }

  console.log("\n── الأمن ──");
  r = await req("GET", "/");
  const h = r.h || {};
  for (const k of ["content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy", "strict-transport-security", "permissions-policy"]) {
    console.log(`  ${k}: ${h[k] ? "✔" : "✘ غائبة"}`);
  }
  r = await req("POST", "/api/auth/login", { email: "naeem@bawsalati.om", password: "wrong" });
  console.log("  كلمة مرور خاطئة:", r.s);

  console.log("\n── ملفات ──");
  r = await req("GET", "/robots.txt");
  console.log("  robots.txt:", JSON.stringify(r.t.slice(0, 90)));
  r = await req("GET", "/sitemap.xml");
  console.log("  روابط sitemap:", (r.t.match(/<url>/g) || []).length);
})();
