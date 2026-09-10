// فحص الحجز: الفترات المتاحة، وإنشاء موعد، ومنع الحجز المزدوج، وصفحة المتابعة.
const http = require("node:http");
const PORT = 51602, HOST = "localhost", ORIGIN = `http://localhost:${PORT}`;

function call(method, path, body) {
  return new Promise((res) => {
    const d = body === undefined ? null : JSON.stringify(body);
    const h = { Origin: ORIGIN };
    if (d) { h["Content-Type"] = "application/json"; h["Content-Length"] = Buffer.byteLength(d); }
    const r = http.request({ host: HOST, port: PORT, path, method, headers: h, timeout: 60000 }, (rr) => {
      let b = ""; rr.setEncoding("utf8"); rr.on("data", (c) => (b += c));
      rr.on("end", () => { let j = null; try { j = JSON.parse(b); } catch {} res({ status: rr.statusCode, body: b, json: j }); });
    });
    r.on("error", (e) => res({ status: 0, body: String(e) }));
    r.on("timeout", () => { r.destroy(); res({ status: 0, body: "timeout" }); });
    if (d) r.write(d); r.end();
  });
}

const results = [];
const check = (n, p, d = "") => { results.push({ n, p }); console.log((p ? "✔" : "✘") + " " + n + (d ? "  — " + d : "")); };

(async () => {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split(/=(.*)/s)));
  const SPEC = args.SPECIALIST_ID, TOPIC = args.TOPIC_ID;

  const av = await call("GET", `/api/specialists/${SPEC}/availability`);
  check("جلب الفترات المتاحة", av.status === 200, "status " + av.status);
  const days = av.json?.days || [];
  const openDay = days.find((d) => (d.slots || []).some((s) => s.available !== false));
  check("توجد فترات معروضة", !!openDay, days.length + " يوماً");

  const slot = openDay && (openDay.slots.find((s) => s.available !== false));
  if (!slot) { console.log("لا توجد فترة متاحة للاختبار"); return; }
  console.log("  الفترة المختارة: " + openDay.date + " " + slot.startTime);

  const noSpec = await call("GET", `/api/specialists/${SPEC}/availability`);
  check("الفترات لا تكشف بيانات خاصة", !/phone|email|passwordHash/i.test(noSpec.body));

  const payload = {
    specialistId: SPEC,
    studentName: "طالب فحص الحجز",
    grade: "11",
    phone: "91234567",
    date: openDay.date,
    startTime: slot.startTime,
    topicId: TOPIC,
    topicDetails: "فحص آلي",
  };

  const first = await call("POST", "/api/appointments", payload);
  check("إنشاء الموعد", first.status === 201, "status " + first.status + " " + (first.json?.error || ""));
  const trackingToken = first.json?.trackingToken;
  check("إعادة رمز متابعة", !!trackingToken);

  const second = await call("POST", "/api/appointments", { ...payload, studentName: "طالب آخر" });
  check("منع الحجز المزدوج لنفس الفترة", second.status === 409, "status " + second.status + " " + (second.json?.error || ""));

  const past = await call("POST", "/api/appointments", { ...payload, date: "2020-01-01" });
  check("رفض تاريخ في الماضي", past.status >= 400 && past.status !== 500, "status " + past.status);

  const offSlot = await call("POST", "/api/appointments", { ...payload, startTime: "03:17" });
  check("رفض وقت خارج الفترات", offSlot.status >= 400 && offSlot.status !== 500, "status " + offSlot.status);

  if (trackingToken) {
    const page = await call("GET", "/booking/" + trackingToken);
    check("صفحة متابعة الموعد تفتح", page.status === 200, "status " + page.status);
    const wrong = await call("GET", "/booking/" + "z".repeat(43));
    check("رمز متابعة خاطئ لا يفتح", wrong.status === 404, "status " + wrong.status);
  }

  console.log("\nملخص: " + results.filter((r) => r.p).length + "/" + results.length);
  const bad = results.filter((r) => !r.p);
  if (bad.length) console.log("لم تنجح: " + bad.map((b) => b.n).join(" | "));
  if (trackingToken) console.log("TRACKING=" + trackingToken);
})();
