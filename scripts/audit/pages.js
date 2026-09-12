const http = require("node:http");
const PORT = process.env.PORT || 51602;
const paths = [
  "/", "/assessment", "/assessment/questions", "/library", "/booking", "/guide",
  "/ask", "/privacy", "/login", "/robots.txt", "/sitemap.xml",
  "/library/career-guidance", "/library/personal-skills", "/library/science",
  "/guide?field=%D8%A7%D9%84%D8%B5%D8%AD%D8%A9", "/guide?q=SE021", "/programs/SE021",
  "/specialist", "/specialist/appointments", "/specialist/assessments",
  "/specialist/availability", "/specialist/categories", "/specialist/faq",
  "/specialist/library", "/specialist/profile",
  "/no-such-page",
];
function get(p) {
  return new Promise((res) => {
    const req = http.get({ host: "127.0.0.1", port: PORT, path: p, timeout: 60000 }, (r) => {
      let b = "";
      r.setEncoding("utf8");
      r.on("data", (c) => (b += c));
      r.on("end", () => res({ p, status: r.statusCode, loc: r.headers.location, len: b.length, body: b }));
    });
    req.on("error", (e) => res({ p, status: 0, err: String(e) }));
    req.on("timeout", () => { req.destroy(); res({ p, status: 0, err: "timeout" }); });
  });
}
(async () => {
  for (const p of paths) {
    const r = await get(p);
    const flag = r.body && /حدث خطأ|Application error|Unhandled/.test(r.body) ? "  ⚠ نص خطأ" : "";
    console.log(String(r.status).padEnd(4), p.padEnd(32), (r.loc ? "-> " + r.loc : (r.len + "b")), flag, r.err || "");
  }
})();
