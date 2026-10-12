// ═══════════════════════════════════════════════════════════════
// إرسال البريد — قناةٌ مستقلّة عن الواتساب، تعمل معها لا بدلاً منها.
//
// الإعداد من متغيّرات البيئة وحدها، فلا كلمة مرور في المستودع:
//   SMTP_HOST  مثل smtp.gmail.com
//   SMTP_PORT  465 للتشفير المباشر، أو 587 مع STARTTLS
//   SMTP_USER  البريد المُرسِل
//   SMTP_PASS  كلمة مرور التطبيقات (لا كلمة مرور الحساب)
//   MAIL_FROM  اسم المُرسِل وعنوانه، وإن تُرك استُعمل SMTP_USER
//
// بلا إعداد لا يُرسل شيء ويُسجَّل الإشعار «متخطّى»، ولا يتأثّر الحجز.
// ═══════════════════════════════════════════════════════════════
import type { Transporter } from "nodemailer";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  messageId?: string;
}

export function emailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

/** عنوانٌ بسيط التحقّق: لا يُرسل إلى نصٍّ ليس بريداً. */
export function isEmail(value: string | null | undefined): value is string {
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(value.trim());
}

let transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;
  const { createTransport } = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? 465);
  transporter = createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port,
    // 465 تشفير من أول اتصال، وما دونه يبدأ صريحاً ثم يرتقي إلى TLS
    secure: port === 465,
    auth: { user: process.env.SMTP_USER!.trim(), pass: process.env.SMTP_PASS!.trim() },
  });
  return transporter;
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (!emailConfigured()) {
    return { ok: false, skipped: true, error: "بريد الإشعارات غير مُعدّ" };
  }
  if (!isEmail(message.to)) {
    return { ok: false, skipped: true, error: "عنوان المستلم غير صالح" };
  }

  try {
    const mailer = await getTransporter();
    const info = await mailer.sendMail({
      from: process.env.MAIL_FROM?.trim() || process.env.SMTP_USER!.trim(),
      to: message.to.trim(),
      subject: message.subject,
      text: message.text,
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "فشل الإرسال" };
  }
}

/** يُخفي وسط العنوان في السجلّ: na***@gmail.com */
export function maskEmail(value: string): string {
  const [name, domain] = value.split("@");
  if (!domain) return "—";
  const head = name.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}
