const https = require("node:https");
const HOST = process.argv[2] || "bawsalati.onrender.com";

function get(path) {
  return new Promise((res) => {
    const started = Date.now();
    https.get({ host: HOST, path, timeout: 45000, headers: { "User-Agent": "bawsalati-audit" } }, (r) => {
      const chunks = [];
      r.on("data", (c) => chunks.push(c));
      r.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        res({ status: r.statusCode, ms: Date.now() - started, body, headers: r.headers, size: Buffer.byteLength(body) });
      });
    }).on("error", (e) => res({ status: 0, body: String(e), ms: Date.now() - started }))
      .on("timeout", function () { this.destroy(); res({ status: 0, body: "timeout", ms: 45000 }); });
  });
}

const PATHS = [
  "/", "/assessment", "/library", "/guide", "/eligibility", "/booking", "/ask", "/privacy", "/login",
  "/guide?all=1", "/guide?q=SE021", "/programs/SE021", "/programs",
  "/library/career-guidance", "/library/bulletins",
  "/robots.txt", "/sitemap.xml", "/no-such-page",
];

(async () => {
  console.log(`المضيف: ${HOST}\n`);
  for (const p of PATHS) {
    const r = await get(p);
    const flag = r.status === 200 || (p === "/no-such-page" && r.status === 404) ||
      (["/programs", "/login"].includes(p) && [200, 307].includes(r.status)) ? "✔" : "✘";
    console.log(`${flag} ${String(r.status).padEnd(4)} ${String(r.ms + "ms").padStart(7)} ${String(Math.round(r.size / 1024) + "kb").padStart(7)}  ${p}`);
  }
})();
