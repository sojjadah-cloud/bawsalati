import { afterEach, describe, expect, it, vi } from "vitest";
import { getProvider, parseCallMeBotKeys } from "@/lib/notifications/provider";

/**
 * مزوّدا واتساب يُختبران دون إرسال فعلي: يُعترض fetch ويُفحص ما كان سيُرسل.
 */
const ENV_KEYS = [
  "NOTIFY_PROVIDER",
  "WHATSAPP_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_TEMPLATE",
  "CALLMEBOT_KEYS",
] as const;
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () =>
    typeof body === "string"
      ? new Response(body, { status })
      : new Response(JSON.stringify(body), { status })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const message = { to: "96894996269", text: "سطر أول\nسطر ثانٍ", template: "APPOINTMENT_SUMMARY" };

describe("واتساب الرسمي", () => {
  it("يرسل نصاً حرّاً بلا قالب", async () => {
    process.env.NOTIFY_PROVIDER = "whatsapp-cloud";
    process.env.WHATSAPP_TOKEN = "t";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123";
    delete process.env.WHATSAPP_TEMPLATE;
    const fetchMock = stubFetch(200, { messages: [{ id: "wamid.1" }] });

    const result = await getProvider().send(message);

    expect(result).toEqual({ ok: true, providerMessageId: "wamid.1" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v21.0/123/messages");
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({ to: "96894996269", type: "text", text: { body: message.text } });
  });

  it("يرسل القالب حين يُضبط، بلا أسطر جديدة في متغيّره", async () => {
    process.env.NOTIFY_PROVIDER = "whatsapp-cloud";
    process.env.WHATSAPP_TOKEN = "t";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123";
    process.env.WHATSAPP_TEMPLATE = "booking_alert";
    const fetchMock = stubFetch(200, { messages: [{ id: "wamid.2" }] });

    await getProvider().send(message);

    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.template.name).toBe("booking_alert");
    expect(sent.template.components[0].parameters[0].text).toBe("سطر أول | سطر ثانٍ");
  });

  it("ينقل رسالة خطأ واتساب", async () => {
    process.env.NOTIFY_PROVIDER = "whatsapp-cloud";
    process.env.WHATSAPP_TOKEN = "t";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123";
    stubFetch(400, { error: { message: "Re-engagement message" } });

    const result = await getProvider().send(message);
    expect(result).toEqual({ ok: false, error: "Re-engagement message" });
  });

  it("بلا مفتاح لا يرسل ويُعدّ متخطّى", async () => {
    process.env.NOTIFY_PROVIDER = "whatsapp-cloud";
    delete process.env.WHATSAPP_TOKEN;
    const result = await getProvider().send(message);
    expect(result.skipped).toBe(true);
  });
});

describe("CallMeBot", () => {
  it("يقرأ المفاتيح لكل رقم", () => {
    const keys = parseCallMeBotKeys("96894996269:111, +968 9254 9426:222");
    expect(keys.get("96894996269")).toBe("111");
    expect(keys.get("96892549426")).toBe("222");
  });

  it("يرسل إلى الرقم بمفتاحه", async () => {
    process.env.NOTIFY_PROVIDER = "callmebot";
    process.env.CALLMEBOT_KEYS = "96894996269:111";
    const fetchMock = stubFetch(200, "Message queued. You will receive it in a few seconds.");

    const result = await getProvider().send(message);

    expect(result.ok).toBe(true);
    const url = new URL((fetchMock.mock.calls[0] as unknown as [string])[0]);
    expect(url.searchParams.get("phone")).toBe("+96894996269");
    expect(url.searchParams.get("apikey")).toBe("111");
    expect(url.searchParams.get("text")).toBe(message.text);
  });

  it("يتخطّى رقماً لا مفتاح له", async () => {
    process.env.NOTIFY_PROVIDER = "callmebot";
    process.env.CALLMEBOT_KEYS = "96894996269:111";
    const result = await getProvider().send({ ...message, to: "96890000000" });
    expect(result.skipped).toBe(true);
  });

  it("يعدّ ردّ الخطأ فشلاً ولو كان الرمز 200", async () => {
    process.env.NOTIFY_PROVIDER = "callmebot";
    process.env.CALLMEBOT_KEYS = "96894996269:111";
    stubFetch(200, "APIKey is invalid");
    const result = await getProvider().send(message);
    expect(result.ok).toBe(false);
  });
});
