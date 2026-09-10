const http = require("node:http");
const d = JSON.stringify({ email: process.argv[2], password: process.env.SEED_PASSWORD || "Bawsalati@2026" });
const r = http.request({ host: "localhost", port: 51602, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(d), Origin: "http://localhost:51602" } }, (res) => {
  let b = ""; res.setEncoding("utf8"); res.on("data", (c) => (b += c));
  res.on("end", () => { process.stdout.write((res.headers["set-cookie"] || []).map((c) => c.split(";")[0]).join("; ")); });
});
r.write(d); r.end();
