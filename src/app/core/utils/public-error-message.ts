export function publicErrorMessage(error: any, fallback: string): string {
  const status = Number(error?.status ?? 0);
  if (status === 0 || status >= 500) return fallback;

  const message = error?.error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}
