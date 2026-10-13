/**
 * Safe API response helpers to prevent 'Unexpected token' JSON parse errors
 * when endpoints return non-JSON, empty text, HTML error pages, or malformed responses.
 */

export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    let data: any = null;
    let error: string | null = null;

    if (text && text.trim()) {
      if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }
    }

    if (!res.ok) {
      error =
        data?.error ||
        data?.message ||
        (typeof data === 'string' ? data : null) ||
        (text && text.length < 250 && !text.includes('<html') && !text.includes('<!DOCTYPE')
          ? text
          : `Request failed with status ${res.status}`);
      return { ok: false, status: res.status, data, error };
    }

    return {
      ok: true,
      status: res.status,
      data: data !== null ? data : (text as any),
      error: null,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || 'Network error occurred',
    };
  }
}

export async function parseResponseJson<T = any>(res: Response, fallbackData?: T): Promise<T> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return (fallbackData !== undefined ? fallbackData : null) as T;
    return JSON.parse(text) as T;
  } catch {
    return (fallbackData !== undefined ? fallbackData : null) as T;
  }
}

export async function parseResponseError(res: Response, fallbackMessage = 'Request failed'): Promise<string> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return `${fallbackMessage} (${res.status})`;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        return parsed.error || parsed.message || fallbackMessage;
      }
    } catch {
      // not JSON, check if it's brief plaintext error
      if (text.length < 200 && !text.includes('<!DOCTYPE') && !text.includes('<html')) {
        return text;
      }
    }
    return `${fallbackMessage} (${res.status})`;
  } catch {
    return fallbackMessage;
  }
}
