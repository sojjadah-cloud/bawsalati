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

/**
 * واتساب الرسمي من Meta (WhatsApp Cloud API).
 *
 * الرسالة النصية الحرّة لا تصل إلا لمن راسل رقم المنصة خلال آخر 24 ساعة.
 * خارج ذلك يشترط واتساب قالباً معتمداً، فإن ضُبط WHATSAPP_TEMPLATE أُرسل
 * القالب ونصّ الرسالة متغيّره الوحيد. القالب لا يقبل أسطراً جديدة في متغيّراته،
 * فتُفصل الأسطر بـ« | ».
 */
class WhatsAppCloudProvider implements NotificationProvider {
  readonly name = "whatsapp-cloud";
  readonly channel = "whatsapp" as const;

  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
    private readonly template: string,
    private readonly templateLang: string
  ) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    const body = this.template
      ? {
          messaging_product: "whatsapp",
          to: message.to,
          type: "template",
          template: {
            name: this.template,
            language: { code: this.templateLang },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: message.text.split("\n").join(" | ") }],
              },
            ],
          },
        }
      : {
          messaging_product: "whatsapp",
          to: message.to,
          type: "text",
          text: { body: message.text },
        };

    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(this.phoneNumberId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        messages?: { id?: string }[];
        error?: { message?: string };
      };
      if (!res.ok) {
        return { ok: false, error: data.error?.message ?? `واتساب أعاد الرمز ${res.status}` };
      }
      return { ok: true, providerMessageId: data.messages?.[0]?.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "تعذّر الاتصال بواتساب" };
    }
  }
}

/**
 * CallMeBot: خدمة مجانية ترسل رسائل واتساب إلى رقم فعّلها بنفسه.
 * تصلح لتنبيه رقم واحد معروف كرقم الإدارة، لا لمراسلة الطلبة.
 * كل رقم مستلم له مفتاح خاص يصله عند التفعيل، ويُضبط في CALLMEBOT_KEYS
 * بصيغة «الرقم:المفتاح» مفصولة بفواصل.
 */
class CallMeBotProvider implements NotificationProvider {
  readonly name = "callmebot";
  readonly channel = "whatsapp" as const;

  constructor(private readonly keys: Map<string, string>) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    const apikey = this.keys.get(message.to);
    if (!apikey) {
      return { ok: false, skipped: true, error: "لا مفتاح CallMeBot لهذا الرقم" };
    }
    const url =
      "https://api.callmebot.com/whatsapp.php?" +
      new URLSearchParams({ phone: `+${message.to}`, text: message.text, apikey }).toString();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      const reply = await res.text().catch(() => "");
      // الخدمة تعيد 200 حتى مع بعض الأخطاء، فيُقرأ نصّ الردّ أيضاً
      if (!res.ok || /\b(error|invalid)\b|not (active|allowed|valid)/i.test(reply.slice(0, 500))) {
        return { ok: false, error: `CallMeBot: ${res.status} ${reply.slice(0, 120)}` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "تعذّر الاتصال بـ CallMeBot" };
    }
  }
}

/** «96894996269:123456,96892549426:654321» ← خريطة رقم ← مفتاح. */
export function parseCallMeBotKeys(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of raw.split(",")) {
    const [phone, key] = pair.split(":").map((s) => s.trim());
    if (phone && key) map.set(phone.replace(/\D/gu, ""), key);
  }
  return map;
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

  if (kind === "whatsapp-cloud") {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) return new DisabledProvider("whatsapp");
    return new WhatsAppCloudProvider(
      token,
      phoneNumberId,
      process.env.WHATSAPP_TEMPLATE ?? "",
      process.env.WHATSAPP_TEMPLATE_LANG || "ar"
    );
  }

  if (kind === "callmebot") {
    const keys = parseCallMeBotKeys(process.env.CALLMEBOT_KEYS ?? "");
    if (keys.size === 0) return new DisabledProvider("whatsapp");
    return new CallMeBotProvider(keys);
  }

  const url = process.env.NOTIFY_API_URL;
  const token = process.env.NOTIFY_API_TOKEN;
  const sender = process.env.NOTIFY_SENDER_ID ?? "";

  if (kind === "whatsapp" || kind === "sms") {
    if (!url || !token) return new DisabledProvider(kind);
    return new HttpProvider(kind, kind, url, token, sender);
  }
  return new ConsoleProvider();
}
