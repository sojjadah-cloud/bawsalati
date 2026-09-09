// تجريد مزوّد الإشعارات.
// أسرار المزوّد تُقرأ من متغيّرات البيئة في الخادم فقط ولا تصل إلى المتصفح.
export interface OutboundMessage {
  /** رقم المستلم بصيغته الدولية */
  to: string;
  /** نص قصير — لا يحتوي تفاصيل استشارة حسّاسة */
  text: string;
  template: string;
}

export interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  /** المزوّد معطّل عمداً (بلا إعدادات) — ليست حالة فشل */
  skipped?: boolean;
}

export interface NotificationProvider {
  readonly name: string;
  readonly channel: "whatsapp" | "sms" | "console";
  send(message: OutboundMessage): Promise<SendResult>;
}

/** مزوّد التطوير: يسجّل الرسالة محلياً برقم مقنّع ولا يرسل شيئاً. */
class ConsoleProvider implements NotificationProvider {
  readonly name = "console";
  readonly channel = "console" as const;

  async send(message: OutboundMessage): Promise<SendResult> {
    const masked = message.to.replace(/.(?=.{2})/gu, "*");
    console.info(`[notify:console] → ${masked} :: ${message.template}`);
    return { ok: true, providerMessageId: `console-${Date.now()}` };
  }
}

/**
 * مزوّد HTTP عام يغطي بوابات واتساب/الرسائل النصية المعتمدة.
 * الصيغة مقصودة البساطة حتى يمكن توجيهه لأي بوابة عبر البيئة.
 */
class HttpProvider implements NotificationProvider {
  constructor(
    readonly name: string,
    readonly channel: "whatsapp" | "sms",
    private readonly url: string,
    private readonly token: string,
    private readonly sender: string
  ) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          to: message.to,
          from: this.sender || undefined,
          channel: this.channel,
          text: message.text,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        return { ok: false, error: `المزوّد أعاد الرمز ${res.status}` };
      }
      const data = (await res.json().catch(() => ({}))) as { id?: string; messageId?: string };
      return { ok: true, providerMessageId: data.id ?? data.messageId };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "تعذّر الاتصال بالمزوّد" };
    }
  }
}

/** مزوّد معطّل: لا إعدادات ⇒ يُسجَّل التسليم كـ SKIPPED بلا خطأ. */
class DisabledProvider implements NotificationProvider {
  constructor(readonly channel: "whatsapp" | "sms") {}
  readonly name = "disabled";
  async send(): Promise<SendResult> {
    return { ok: false, skipped: true, error: "مزوّد الإشعارات غير مُعدّ" };
  }
}

export function getProvider(): NotificationProvider {
  const kind = (process.env.NOTIFY_PROVIDER || "console").toLowerCase();
  if (kind === "console") return new ConsoleProvider();

  const url = process.env.NOTIFY_API_URL;
  const token = process.env.NOTIFY_API_TOKEN;
  const sender = process.env.NOTIFY_SENDER_ID ?? "";

  if (kind === "whatsapp" || kind === "sms") {
    if (!url || !token) return new DisabledProvider(kind);
    return new HttpProvider(kind, kind, url, token, sender);
  }
  return new ConsoleProvider();
}
