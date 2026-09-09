// محدِّد معدّل بنافذة منزلقة في الذاكرة.
// ملاحظة تشغيلية: لكل عملية على حدة — يُستبدل بـ Redis عند النشر على أكثر من نسخة.
interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface LimitRule {
  /** أقصى عدد محاولات داخل النافذة */
  max: number;
  /** طول النافذة بالملّي ثانية */
  windowMs: number;
}

export const LIMITS = {
  login: { max: 5, windowMs: 10 * 60 * 1000 },
  assessmentStart: { max: 5, windowMs: 60 * 60 * 1000 },
  booking: { max: 5, windowMs: 60 * 60 * 1000 },
  answer: { max: 400, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, LimitRule>;

export interface LimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function consume(key: string, rule: LimitRule): LimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < rule.windowMs);

  if (bucket.hits.length >= rule.max) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((rule.windowMs - (now - oldest)) / 1000),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: rule.max - bucket.hits.length,
    retryAfterSeconds: 0,
  };
}

export function reset(key: string) {
  buckets.delete(key);
}

/** تنظيف دوري حتى لا تنمو الخريطة بلا حدّ. */
if (typeof setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    const maxWindow = 60 * 60 * 1000;
    for (const [key, bucket] of buckets) {
      bucket.hits = bucket.hits.filter((t) => now - t < maxWindow);
      if (bucket.hits.length === 0) buckets.delete(key);
    }
  }, 10 * 60 * 1000);
  timer.unref?.();
}
