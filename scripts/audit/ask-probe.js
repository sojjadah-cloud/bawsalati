const http = require("node:http");
const PORT = Number(process.env.PORT || 51602);
function ask(q) {
  return new Promise((res) => {
    const d = JSON.stringify({ question: q });
    const r = http.request({ host: "localhost", port: PORT, path: "/api/ask", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(d), Origin: `http://localhost:${PORT}` }, timeout: 60000 }, (rr) => {
      let b = ""; rr.setEncoding("utf8"); rr.on("data", (c) => (b += c));
      rr.on("end", () => { let j = null; try { j = JSON.parse(b); } catch {} res({ s: rr.statusCode, j, b }); });
    });
    r.on("error", (e) => res({ s: 0, b: String(e) }));
    r.write(d); r.end();
  });
}
(async () => {
  const qs = process.argv.slice(2);
  let hit = 0;
  for (const q of qs) {
    const r = await ask(q);
    if (r.s !== 200) { console.log("ERR", r.s, q, r.b.slice(0, 120)); continue; }
    if (r.j.matched) hit++;
    console.log((r.j.matched ? "✔" : "→") + " " + q);
    console.log("   " + (r.j.matched ? r.j.matchedQuestion + "\n   ↳ " + r.j.answer.replace(/\n/g, " ").slice(0, 190) : "إحالة إلى المختص"));
  }
  console.log(`\n${hit}/${qs.length}`);
})();
