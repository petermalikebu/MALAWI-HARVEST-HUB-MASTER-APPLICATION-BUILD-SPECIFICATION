/**
 * Robust API helper utilities for Malawi Harvest Hub
 * Prevents "Unexpected token '<'" errors by safely handling:
 * - HTML fallback pages
 * - Non-JSON text / 500 error pages
 * - Empty response bodies
 * - Content-Type validation
 */

/**
 * Safely extracts JSON data from a response with a fallback value.
 * Never throws SyntaxError: Unexpected token '<'.
 */
export async function safeParseJson<T = any>(
  response: Response,
  fallback: any = null
): Promise<T> {
  try {
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (!text || !text.trim()) {
      return fallback;
    }
    // Guard against HTML payloads (e.g. <!DOCTYPE html> or <html>)
    const trimmed = text.trim();
    if (trimmed.startsWith('<') || (!contentType.includes('application/json') && trimmed.startsWith('<!'))) {
      console.warn(`[safeParseJson] Received non-JSON response for ${response.url}:`, trimmed.slice(0, 120));
      return fallback;
    }
    return JSON.parse(trimmed) as T;
  } catch (err) {
    console.warn(`[safeParseJson] JSON parse failed for ${response.url}:`, err);
    return fallback;
  }
}

/**
 * Parses response and extracts either the structured data or a human-readable error message.
 * Completely immune to "Unexpected token '<'" from HTML error responses.
 */
export async function safeParseResponse<T = any>(
  response: Response
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const status = response.status;
  const ok = response.ok;
  let text = '';
  try {
    text = await response.text();
  } catch (err: any) {
    return { ok: false, status, error: err?.message || 'Failed to read response body' };
  }

  if (!text || !text.trim()) {
    return {
      ok,
      status,
      error: ok ? undefined : `Request failed with HTTP status ${status}`,
    };
  }

  const trimmed = text.trim();
  const isHtml = trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype');

  if (isHtml) {
    if (ok) {
      return {
        ok: false,
        status,
        error: 'Received HTML page instead of JSON API response. The requested endpoint may not exist.',
      };
    }
    // Extract readable text from HTML if possible
    const cleanText = trimmed.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    return {
      ok: false,
      status,
      error: cleanText.slice(0, 200) || `Request failed with HTTP status ${status}`,
    };
  }

  try {
    const json = JSON.parse(trimmed);
    if (!ok) {
      const errorMsg = json?.error || json?.message || `Request failed with status ${status}`;
      return { ok: false, status, data: json, error: errorMsg };
    }
    return { ok: true, status, data: json };
  } catch {
    return {
      ok,
      status,
      data: undefined,
      error: ok ? undefined : trimmed.slice(0, 200) || `Request failed with status ${status}`,
    };
  }
}

/**
 * Fetch wrapper that returns a strongly typed result without throwing unhandled parsing errors.
 */
export async function apiFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const res = await fetch(input, init);
    return await safeParseResponse<T>(res);
  } catch (networkError: any) {
    return {
      ok: false,
      status: 0,
      error: networkError?.message || 'Network connection failed. Please check your internet.',
    };
  }
}
