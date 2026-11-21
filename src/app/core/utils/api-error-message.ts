export function apiErrorMessage(error: any, fallback: string): string {
  if (Number(error?.status ?? 0) === 0) return 'The server could not be reached. Check your connection and try again.';
  const body = error?.error;
  for (const candidate of [body?.message, body?.detail, firstValidationError(body?.errors), body?.title]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return fallback;
}

function firstValidationError(errors: unknown): string | null {
  if (Array.isArray(errors)) return errors.find(x => typeof x === 'string' && x.trim()) ?? null;
  if (!errors || typeof errors !== 'object') return null;
  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value)) {
      const message = value.find(x => typeof x === 'string' && x.trim());
      if (typeof message === 'string') return message;
    }
  }
  return null;
}
