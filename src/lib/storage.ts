// تخزين الملفات خارج المجلد العام.
// لا يُشتق اسم الملف من مدخلات المستخدم إطلاقاً، فلا مجال لاجتياز المسارات.
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export interface AllowedType {
  mime: string;
  ext: string;
  /** توقيع البداية الثنائي — يُتحقق منه بدل الاعتماد على نوع يرسله العميل. */
  magic: (buf: Buffer) => boolean;
}

const startsWith = (buf: Buffer, bytes: number[]) =>
  buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b);

export const ALLOWED_TYPES: AllowedType[] = [
  { mime: "application/pdf", ext: "pdf", magic: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]) },
  { mime: "image/jpeg", ext: "jpg", magic: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  {
    mime: "image/png",
    ext: "png",
    magic: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    mime: "image/webp",
    ext: "webp",
    magic: (b) =>
      b.length > 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
  {
    mime: "audio/mpeg",
    ext: "mp3",
    // إمّا وسم ID3 أو إطار MPEG صريح
    magic: (b) =>
      startsWith(b, [0x49, 0x44, 0x33]) || (b.length > 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
  },
  {
    mime: "audio/mp4",
    ext: "m4a",
    magic: (b) => b.length > 12 && b.toString("ascii", 4, 8) === "ftyp",
  },
];

export const MAX_UPLOAD_BYTES = {
  COVER: 2 * 1024 * 1024, // 2MB
  LIBRARY: 30 * 1024 * 1024, // 30MB
  GUIDE: 60 * 1024 * 1024, // 60MB
  AUDIO: 60 * 1024 * 1024, // 60MB
} as const;

export type StorageKind = keyof typeof MAX_UPLOAD_BYTES;

/**
 * جذر التخزين يُقرأ من البيئة وقت التشغيل.
 * أداة تتبّع الملفات في البناء تنبّه إلى المسار الديناميكي؛ التنبيه يخصّ حجم
 * حزمة النشر لا صحّة التشغيل، ومقصود هنا لأن موقع التخزين يتغيّر بين البيئات.
 */
function storageRoot(): string {
  return resolve(process.cwd(), process.env.STORAGE_DIR || "./storage");
}

export interface DetectedFile {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  size: number;
  checksum: string;
}

export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 415) {
    super(message);
    this.status = status;
  }
}

/** يتحقق من الحجم ومن التوقيع الثنائي الفعلي، ويتجاهل النوع الذي يدّعيه العميل. */
export async function inspectUpload(
  file: File,
  kind: StorageKind,
  accept: string[]
): Promise<DetectedFile> {
  const limit = MAX_UPLOAD_BYTES[kind];
  if (file.size === 0) throw new UploadError("الملف فارغ", 400);
  if (file.size > limit) {
    throw new UploadError(`حجم الملف يتجاوز ${Math.round(limit / (1024 * 1024))} ميغابايت`, 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const match = ALLOWED_TYPES.find((t) => accept.includes(t.mime) && t.magic(buffer));
  if (!match) throw new UploadError("نوع الملف غير مسموح به", 415);

  return {
    buffer,
    mimeType: match.mime,
    ext: match.ext,
    size: buffer.length,
    checksum: createHash("sha256").update(buffer).digest("hex"),
  };
}

/** يكتب الملف باسم مولّد داخلياً ويعيد مفتاح التخزين. */
export async function saveFile(detected: DetectedFile, kind: StorageKind): Promise<string> {
  const dir = join(storageRoot(), kind.toLowerCase());
  await mkdir(dir, { recursive: true });
  const key = `${kind.toLowerCase()}/${randomUUID()}.${detected.ext}`;
  await writeFile(join(storageRoot(), key), detected.buffer);
  return key;
}

/** يمنع أي مفتاح يحاول الخروج من جذر التخزين. */
function safePath(storageKey: string): string {
  const root = storageRoot();
  const full = resolve(root, storageKey);
  if (full !== root && !full.startsWith(root + "\\") && !full.startsWith(root + "/")) {
    throw new UploadError("مسار ملف غير صالح", 400);
  }
  return full;
}

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  return readFile(safePath(storageKey));
}

export async function storedFileSize(storageKey: string): Promise<number> {
  const s = await stat(safePath(storageKey));
  return s.size;
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  await unlink(safePath(storageKey)).catch(() => undefined);
}

/** اسم تنزيل نظيف مشتق من العنوان، بلا محارف تكسر ترويسة Content-Disposition. */
export function safeDownloadName(title: string, ext: string): string {
  const base = title.replace(/[\/:*?"<>|\r\n]+/gu, " ").trim().slice(0, 80) || "file";
  return `${base}.${ext}`;
}
