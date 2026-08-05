const euro = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat('en-GB');

const dateShort = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export const fmt = {
  price: (v: number) => euro.format(v),
  number: (v: number) => number.format(v),
  score: (v: number) => v.toFixed(1),
  distance: (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`),
  date: (iso: string) => {
    const d = parseISO(iso);
    return d ? dateShort.format(d) : '';
  },
  nights: (n: number) => `${n} ${n === 1 ? 'night' : 'nights'}`,
};

/** Parses `yyyy-mm-dd` as a *local* date; `new Date(iso)` would parse it as UTC. */
export function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = parseISO(checkIn);
  const b = parseISO(checkOut);
  if (!a || !b) return 1;
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return Math.max(1, diff);
}

export function today(): string {
  return toISO(new Date());
}
