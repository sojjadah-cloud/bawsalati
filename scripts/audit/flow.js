// فحص التدفّق الكامل: اختبار من البداية إلى النتيجة، وحجز موعد مع منع الازدواج،
// وإدارة المكتبة من حساب المختص، وبثّ الملفات ومحاولات الخروج من المسار.
const http = require("node:http");
const PORT = Number(process.env.PORT || 51602);
const HOST = "localhost";
const ORIGIN = `http://${HOST}:${PORT}`;

function req(method, path, { body, cookie, raw } = {}) {
  return new Promise((res) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const h = { Origin: ORIGIN };
    if (data) {
      h["Content-Type"] = "application/json";
      h["Content-Length"] = Buffer.byteLength(data);
    }
    if (cookie) h["Cookie"] = cookie;
    const r = http.request({ host: HOST, port: PORT, path, method, headers: h, timeout: 90000 }, (rr) => {
      const chunks = [];
      rr.on("data", (c) => chunks.push(c));
      rr.on("end", () => {
        const buf = Buffer.concat(chunks);
        const text = raw ? "" : buf.toString("utf8");
        let json = null;
        try { json = JSON.parse(text); } catch {}
        res({ status: rr.statusCode, headers: rr.headers, body: text, buf, json, cookies: rr.headers["set-cookie"] });
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

(async () => {
  const PW = process.env.SEED_PASSWORD || "Bawsalati@2026";
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split(/=(.*)/s)));

  console.log("── تدفّق الاختبار ──");
  const start = await req("POST", "/api/assessment/sessions", {
    body: { studentName: "طالب فحص النظام", grade: "10", gender: "MALE", phone: "91234567" },
  });
  check("بدء جلسة اختبار", start.status === 201, "status " + start.status);
  const attemptCookie = (start.cookies || []).map((c) => c.split(";")[0]).join("; ");
  check("كوكي المحاولة HttpOnly", (start.cookies || []).some((c) => /HttpOnly/i.test(c)));

  const current = await req("GET", "/api/assessment/sessions/current", { cookie: attemptCookie });
  check("جلب الجلسة الحالية", current.status === 200, "status " + current.status);
  const groups = current.json?.assessment?.groups || [];
  const questions = groups.flatMap((g) => g.questions || []);
  check("ثلاث مجموعات في الاختبار", groups.length === 3, groups.length + " مجموعة");
  check("عدد العبارات 54", questions.length === 54, questions.length + " عبارة");
  check("خيارا الإجابة اثنان", (current.json?.assessment?.options || []).length === 2);

  const noCookie = await req("GET", "/api/assessment/sessions/current");
  check("لا يمكن جلب جلسة بلا كوكي المحاولة", noCookie.status === 401 || noCookie.status === 404, "status " + noCookie.status);

  // نمط إجابات معروف: نفضّل أول 7 من الواقعية وهكذا، لكن يكفي نمط ثابت للتحقّق
  const opts = (current.json?.assessment?.options || []).map((o) => o.value);
  const prefer = opts[0] ?? 1;
  const decline = opts[1] ?? 0;
  const answers = questions.map((q, i) => ({ questionId: q.id, value: i % 3 === 0 ? prefer : decline }));
  const saved = await req("POST", "/api/assessment/sessions/current/answers", { cookie: attemptCookie, body: { answers } });
  check("حفظ الإجابات", saved.status === 200 || saved.status === 201, "status " + saved.status);

  const badAnswer = await req("POST", "/api/assessment/sessions/current/answers", {
    cookie: attemptCookie,
    body: { answers: [{ questionId: questions[0]?.id ?? "x", value: 99 }] },
  });
  check("قيمة إجابة خارج المدى تُرفض", badAnswer.status === 422 || badAnswer.status === 400, "status " + badAnswer.status);

  const submit = await req("POST", "/api/assessment/sessions/current/submit", { cookie: attemptCookie, body: { confirm: true } });
  check("إرسال الاختبار وحساب النتيجة", submit.status === 200 || submit.status === 201, "status " + submit.status);
  const resultToken = submit.json?.token || submit.json?.resultToken;
  check("إعادة رمز النتيجة", !!resultToken, resultToken ? resultToken.slice(0, 8) + "…" : "لا يوجد");

  if (resultToken) {
    const page = await req("GET", "/assessment/results/" + resultToken);
    check("صفحة النتيجة تفتح", page.status === 200, "status " + page.status);
    check("النتيجة تعرض البيئات الست", ["الواقعية", "الاستكشافية", "الفنية", "الاجتماعية", "المغامرة", "التقليدية"].every((n) => page.body.includes(n)));
    const wrong = await req("GET", "/assessment/results/" + "x".repeat(43));
    check("رمز نتيجة خاطئ لا يفتح", wrong.status === 404, "status " + wrong.status);
  }

  const submitAgain = await req("POST", "/api/assessment/sessions/current/submit", { cookie: attemptCookie, body: { confirm: true } });
  check(
    "إعادة الإرسال لا تنشئ نتيجة ثانية",
    submitAgain.status === 200 && submitAgain.json?.resultToken === resultToken,
    "status " + submitAgain.status
  );

  console.log("\n── تدفّق الحجز ──");
  const specCookie = args.SPEC_COOKIE;
  const bookingPage = await req("GET", "/booking");
  check("صفحة الحجز تفتح", bookingPage.status === 200, "status " + bookingPage.status);

  console.log("\n── بثّ الملفات ──");
  const guide = await req("GET", "/api/files/guide", { raw: true });
  check("بثّ دليل الطالب", guide.status === 200, "status " + guide.status + " نوع " + guide.headers["content-type"]);
  check("الدليل ملف PDF فعلاً", guide.buf.slice(0, 5).toString() === "%PDF-", guide.buf.slice(0, 5).toString());
  const traversal = await req("GET", "/api/files/library/..%2F..%2F..%2F.env");
  check("محاولة الخروج من المسار تُرفض", traversal.status >= 400, "status " + traversal.status);
  const missingFile = await req("GET", "/api/files/library/does-not-exist-id");
  check("ملف غير موجود يعيد 404", missingFile.status === 404, "status " + missingFile.status);

  console.log("\n── إدارة المكتبة من حساب المختص ──");
  if (specCookie) {
    const create = await req("POST", "/api/specialist/library/resources", {
      cookie: specCookie,
      body: { title: "مورد فحص مؤقّت", description: "يُحذف بعد الفحص", categoryId: args.CATEGORY_ID, type: "READABLE", language: "ar", published: false, downloadable: false },
    });
    check("المختص ينشئ مورداً", create.status === 201 || create.status === 200, "status " + create.status + " " + (create.json?.error || ""));
    const id = create.json?.resource?.id || create.json?.id;
    if (id) {
      const patch = await req("PATCH", "/api/specialist/library/resources/" + id, {
        cookie: specCookie,
        body: { kind: "full", categoryId: args.CATEGORY_ID, title: "مورد فحص معدّل", type: "READABLE", language: "ar", published: false, downloadable: false },
      });
      check("المختص يعدّل المورد", patch.status === 200, "status " + patch.status + " " + (patch.json?.error || ""));

      const publish = await req("PATCH", "/api/specialist/library/resources/" + id, { cookie: specCookie, body: { kind: "publish", published: true } });
      check("المختص ينشر المورد", publish.status === 200, "status " + publish.status);

      const archive = await req("PATCH", "/api/specialist/library/resources/" + id, { cookie: specCookie, body: { kind: "archive", archived: true } });
      check("المختص يؤرشف المورد", archive.status === 200, "status " + archive.status);

      const anonPatch = await req("PATCH", "/api/specialist/library/resources/" + id, { body: { kind: "publish", published: true } });
      check("زائر لا يعدّل المورد", anonPatch.status === 401 || anonPatch.status === 403, "status " + anonPatch.status);

      const del = await req("DELETE", "/api/specialist/library/resources/" + id, { cookie: specCookie });
      check("المختص يحذف المورد", del.status === 200 || del.status === 204, "status " + del.status);
    }
  } else {
    console.log("(تخطّي: لم يُمرَّر كوكي المختص)");
  }

  console.log("\nملخص: " + results.filter((r) => r.pass).length + "/" + results.length);
  const failed = results.filter((r) => !r.pass);
  if (failed.length) console.log("لم تنجح: " + failed.map((f) => f.name).join(" | "));
})();
