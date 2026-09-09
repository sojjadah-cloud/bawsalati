// غلاف fetch للعميل: رسائل خطأ عربية موحّدة وتمييز أخطاء التحقق.
export class ApiClientError extends Error {
  status: number;
  issues?: Record<string, string[] | undefined>;

  constructor(message: string, status: number, issues?: Record<string, string[] | undefined>) {
    super(message);
    this.status = status;
    this.issues = issues;
  }

  /** أول رسالة خطأ لحقل بعينه. */
  fieldError(name: string): string | undefined {
    return this.issues?.[name]?.[0];
  }
}

interface ErrorBody {
  error?: string;
  issues?: Record<string, string[] | undefined>;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiClientError("تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.", 0);
  }

  if (res.status === 204) return undefined as T;

  const body: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = body as ErrorBody;
    throw new ApiClientError(
      err.error ?? "حدث خطأ غير متوقع",
      res.status,
      err.issues
    );
  }

  return body as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: "GET" }),
  post: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) }),
  patch: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: "PATCH", body: data === undefined ? undefined : JSON.stringify(data) }),
  put: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: "PUT", body: data === undefined ? undefined : JSON.stringify(data) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  upload: async <T>(url: string, form: FormData): Promise<T> => {
    let res: Response;
    try {
      res = await fetch(url, { method: "POST", body: form });
    } catch {
      throw new ApiClientError("تعذّر رفع الملف. تحقّق من اتصالك.", 0);
    }
    const body: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = body as ErrorBody;
      throw new ApiClientError(err.error ?? "تعذّر رفع الملف", res.status, err.issues);
    }
    return body as T;
  },
};

/** رسالة موحّدة تُعرض للمستخدم من أي خطأ. */
export function messageOf(e: unknown): string {
  if (e instanceof ApiClientError) return e.message;
  if (e instanceof Error) return e.message;
  return "حدث خطأ غير متوقع";
}
