export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const n = typeof value === 'bigint' ? Number(value) : Number((value as any) ?? NaN);
  return Number.isFinite(n) ? n : fallback;
}

export function fmtCurrency(value: unknown, currency = 'USD', locale = 'en-US'): string {
  const n = toNumber(value, 0);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

export function safeDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDateKey(value: unknown, locale = 'en-US'): string {
  const d = safeDate(value);
  if (!d) return 'Unknown';
  try {
    return d.toLocaleDateString(locale);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

