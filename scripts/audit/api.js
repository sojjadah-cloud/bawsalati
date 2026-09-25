// فحص واجهات الخادم: المصادقة، والصلاحيات، وفحص المصدر، والتحقّق من المدخلات، وتحديد المعدّل.
const http = require("node:http");
const PORT = Number(process.env.PORT || 51602);
const HOST = "localhost";
const ORIGIN = `http://${HOST}:${PORT}`;

function req(method, path, { body, cookie, origin } = {}) {
  return new Promise((res) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const h = {};
    if (data) {
      h["Content-Type"] = "application/json";
      h["Content-Length"] = Buffer.byteLength(data);
    }
    if (cookie) h["Cookie"] = cookie;
    if (origin !== null) h["Origin"] = origin ?? ORIGIN;
    const r = http.request({ host: HOST, port: PORT, path, method, headers: h, timeout: 60000 }, (rr) => {
      let b = "";
      rr.setEncoding("utf8");
      rr.on("data", (c) => (b += c));
      rr.on("end", () => {
        let json = null;
        try { json = JSON.parse(b); } catch {}
        res({ status: rr.statusCode, headers: rr.headers, body: b, json });
      });
    });
    r.on("error", (e) => res({ status: 0, body: String(e) }));
    r.on("timeout", () => { r.destroy(); res({ status: 0, body: "timeout" }); });
    if (data) r.write(data);
    r.end();
  });
}

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log((pass ? "✔" : "✘") + " " + name + (detail ? "  — " + detail : ""));
}
function cookieOf(res) {
  const sc = res.headers["set-cookie"];
  return sc ? sc.map((c) => c.split(";")[0]).join("; ") : null;
}

(async () => {
  const PW = process.env.SEED_PASSWORD || "Bawsalati@2026";

  console.log("── المصادقة ──");
  const bad = await req("POST", "/api/auth/login", { body: { email: "naeem@bawsalati.om", password: "wrong-password-xyz" } });
  check("كلمة مرور خاطئة تُرفض", bad.status === 401, "status " + bad.status);
  check("رسالة الخطأ لا تكشف وجود الحساب", !/غير موجود|لا يوجد حساب/.test(bad.body), bad.json?.error || "");

  const evil = await req("POST", "/api/auth/login", { body: { email: "naeem@bawsalati.om", password: PW }, origin: "https://evil.example" });
  check("طلب من مصدر خارجي يُرفض (CSRF)", evil.status === 403, "status " + evil.status);

  const noOrigin = await req("POST", "/api/auth/login", { body: { email: "naeem@bawsalati.om", password: PW }, origin: null });
  check("طلب بلا ترويسة مصدر", noOrigin.status === 403 || noOrigin.status === 200, "status " + noOrigin.status);

  const login = await req("POST", "/api/auth/login", { body: { email: "naeem@bawsalati.om", password: PW } });
  check("دخول الأخصائي ينجح", login.status === 200, "status " + login.status);
  const specCookie = cookieOf(login);
  const raw = (login.headers["set-cookie"] || []).join(" | ");
  check("كوكي الجلسة HttpOnly", /HttpOnly/i.test(raw));
  check("كوكي الجلسة SameSite=Strict", /SameSite=Strict/i.test(raw));
  check("الرد لا يحوي تجزئة كلمة المرور", !/passwordHash/i.test(login.body));

  const adminLogin = await req("POST", "/api/auth/login", { body: { email: "admin@bawsalati.om", password: PW } });
  check("دخول المدير ينجح", adminLogin.status === 200, "status " + adminLogin.status);
  const adminCookie = cookieOf(adminLogin);

  console.log("\n── الصلاحيات ──");
  const specOnAdmin = await req("POST", "/api/admin/specialists", { cookie: specCookie, body: { name: "اختراق", email: "x@y.om", password: "Aa123456!" } });
  check("الأخصائي يُمنع من إنشاء حسابات (واجهة المدير)", specOnAdmin.status === 403, "status " + specOnAdmin.status);

  const anonSpec = await req("POST", "/api/specialist/faq", { body: { question: "س", answer: "ج" } });
  check("زائر بلا جلسة يُمنع من بنك الأسئلة", anonSpec.status === 401 || anonSpec.status === 403, "status " + anonSpec.status);

  const anonUpload = await req("POST", "/api/specialist/library/resources", { body: { title: "كتاب مزروع" } });
  check("زائر بلا جلسة يُمنع من إضافة موارد", anonUpload.status === 401 || anonUpload.status === 403, "status " + anonUpload.status);

  const forged = await req("POST", "/api/specialist/faq", { cookie: "bawsalati_session=eyJhbGciOiJIUzI1NiJ9.forged.sig", body: { question: "س", answer: "ج" } });
  check("جلسة مزوّرة تُرفض", forged.status === 401 || forged.status === 403, "status " + forged.status);

  const adminOnSpec = await req("POST", "/api/specialist/faq", { cookie: adminCookie, body: { question: "س", answer: "ج" } });
  check("المدير لا ينتحل دور الأخصائي", adminOnSpec.status === 403 || adminOnSpec.status === 401, "status " + adminOnSpec.status);

  console.log("\n── التحقّق من المدخلات ──");
  const v1 = await req("POST", "/api/assessment/sessions", { body: { studentName: "ط", grade: "10", gender: "MALE", phone: "91234567" } });
  check("اسم قصير يُرفض", v1.status === 400, "status " + v1.status);
  const v2 = await req("POST", "/api/assessment/sessions", { body: { studentName: "طالب الفحص", grade: "13", gender: "MALE", phone: "91234567" } });
  check("صف غير موجود يُرفض", v2.status === 400, "status " + v2.status);
  const v3 = await req("POST", "/api/assessment/sessions", { body: { studentName: "طالب الفحص", grade: "10", gender: "OTHER", phone: "91234567" } });
  check("قيمة جنس غير مسموحة تُرفض", v3.status === 400, "status " + v3.status);
  const v4 = await req("POST", "/api/assessment/sessions", { body: { studentName: "طالب الفحص", grade: "10", gender: "MALE", phone: "12345678" } });
  check("رقم هاتف غير عُماني يُرفض", v4.status === 400, "status " + v4.status);
  const v5 = await req("POST", "/api/assessment/sessions", { body: { studentName: "<script>alert(1)</script>", grade: "10", gender: "MALE", phone: "91234567" } });
  check("اسم يحوي وسم HTML يُرفض", v5.status === 400, "status " + v5.status);
  const v6 = await req("POST", "/api/appointments", { body: { specialistId: "x", studentName: "طالب الفحص", grade: "10", phone: "91234567", date: "2026-09-20", startTime: "10:00", topicId: "t", extraField: "حقل دخيل" } });
  check("حقل دخيل يُرفض (strict)", v6.status === 400, "status " + v6.status);

  console.log("\n── «اسألني» ──");
  const ask1 = await req("POST", "/api/ask", { body: { question: "كيف أحجز موعداً؟" } });
  check("«اسألني» يجيب عن سؤال معروف", ask1.status === 200 && ask1.json?.matched === true, "status " + ask1.status);
  const ask2 = await req("POST", "/api/ask", { body: { question: "متى ينزل راتب المعلمين" } });
  check("«اسألني» يحيل السؤال المجهول", ask2.status === 200 && ask2.json?.matched === false, "status " + ask2.status);
  const ask3 = await req("POST", "/api/ask", { body: { question: "' OR 1=1 --" } });
  check("محاولة حقن SQL لا تكسر الخادم", ask3.status === 200 || ask3.status === 400, "status " + ask3.status);
  const ask4 = await req("POST", "/api/ask", { body: { question: "x".repeat(5000) } });
  check("سؤال طويل جداً يُرفض", ask4.status === 400, "status " + ask4.status);

  console.log("\n── تدفّق سيء الشكل ──");
  const malformed = await new Promise((res) => {
    const r = http.request({ host: HOST, port: PORT, path: "/api/ask", method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN } }, (rr) => { rr.resume(); rr.on("end", () => res(rr.statusCode)); });
    r.on("error", () => res(0));
    r.write("{ليس JSON");
    r.end();
  });
  check("جسم غير صالح يُرفض بلا انهيار", malformed === 400, "status " + malformed);

  console.log("\n── تحديد المعدّل ──");
  let limited = 0;
  for (let i = 0; i < 40; i++) {
    const r = await req("POST", "/api/ask", { body: { question: "سؤال تحميل رقم " + i } });
    if (r.status === 429) limited++;
  }
  check("تحديد المعدّل يعمل على «اسألني»", limited > 0, limited + " مرفوضاً من 40");

  const codes = [];
  for (let i = 0; i < 12; i++) {
    const r = await req("POST", "/api/auth/login", { body: { email: "naeem@bawsalati.om", password: "wrong" + i } });
    codes.push(r.status);
  }
  check("تحديد المعدّل على محاولات الدخول", codes.includes(429), "الحالات: " + [...new Set(codes)].join(","));

  console.log("\nملخص: " + results.filter((r) => r.pass).length + "/" + results.length);
  const failed = results.filter((r) => !r.pass);
  if (failed.length) console.log("لم تنجح: " + failed.map((f) => f.name).join(" | "));
  console.log("\nSPEC_COOKIE=" + specCookie);
  console.log("ADMIN_COOKIE=" + adminCookie);
})();
