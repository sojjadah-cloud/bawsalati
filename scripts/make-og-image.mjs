/**
 * توليد صورة المشاركة (Open Graph) مرةً واحدة محلياً.
 *
 *   node scripts/make-og-image.mjs
 *
 * تُولَّد هنا لا عند البناء: تشكيل العربية يحتاج خطاً عربياً حاضراً،
 * وخادم النشر قد لا يحمله. والناتج ملفٌّ ثابت في src/app يلتقطه Next
 * تلقائياً فيصير og:image وtwitter:image لكل صفحة.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createCanvas, GlobalFonts, loadImage } = require("@napi-rs/canvas");

const FONTS = [
  "C:/Windows/Fonts/segoeui.ttf",
  "C:/Windows/Fonts/tahoma.ttf",
  "C:/Windows/Fonts/arial.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
];

let family = null;
for (const f of FONTS) {
  if (!existsSync(f)) continue;
  if (GlobalFonts.registerFromPath(f, "OG")) {
    family = "OG";
    break;
  }
}
if (!family) {
  console.error("لا خط عربي متاح على هذا الجهاز");
  process.exit(1);
}

const W = 1200;
const H = 630;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

const grad = ctx.createLinearGradient(0, 0, W, H);
grad.addColorStop(0, "#0f766e");
grad.addColorStop(1, "#134e4a");
ctx.fillStyle = grad;
ctx.fillRect(0, 0, W, H);

ctx.fillStyle = "rgba(255,255,255,0.07)";
ctx.fillRect(0, H - 110, W, 110);

ctx.direction = "rtl";
ctx.textAlign = "right";
const right = W - 90;

ctx.fillStyle = "#ffffff";
ctx.font = `bold 100px ${family}`;
ctx.fillText("بوصلتي", right, 245);

ctx.fillStyle = "#5eead4";
ctx.font = `600 54px ${family}`;
ctx.fillText("منصة التوجيه المهني", right, 332);

ctx.fillStyle = "rgba(255,255,255,0.92)";
ctx.font = `400 33px ${family}`;
ctx.fillText("اختبار ميول · دليل التخصصات · مكتبة رقمية · موعد مع أخصائي", right, 408);

ctx.fillStyle = "#99f6e4";
ctx.font = `500 30px ${family}`;
ctx.fillText("مدرسة صحار للبنين — سلطنة عُمان", right, H - 45);

const mark = "public/school-mark.webp";
if (existsSync(mark)) {
  const img = await loadImage(readFileSync(mark));
  const size = 200;
  ctx.drawImage(img, 95, (H - size) / 2 - 35, size, size);
}

writeFileSync("src/app/opengraph-image.png", await canvas.encode("png"));
console.log("✔ src/app/opengraph-image.png");
