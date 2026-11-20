const JSON_CODE_KEYS = ['registrationCode', 'code', 'token'] as const;

export function parseQrRegistrationCode(value: string | null | undefined): string | null {
  const payload = value?.trim();
  if (!payload) return null;

  if (payload.startsWith('{') || payload.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (!isRecord(parsed)) return null;
      for (const key of JSON_CODE_KEYS) {
        const code = stringValue(parsed[key]);
        if (code) return code;
      }
      return null;
    } catch {
      return null;
    }
  }

  return /^https?:\/\//i.test(payload) ? parseUrlCode(payload) : payload;
}

function parseUrlCode(payload: string): string | null {
  if (!/^https?:\/\//i.test(payload)) return null;
  try {
    const url = new URL(payload);
    for (const key of JSON_CODE_KEYS) {
      const code = stringValue(url.searchParams.get(key));
      if (code) return code;
    }
    const segment = url.pathname.split('/').filter(Boolean).at(-1);
    return segment ? stringValue(decodeURIComponent(segment)) : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
