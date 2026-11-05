const DAY = 86_400_000;

export function timeAgo(timestamp: number | null, now = Date.now()): string {
  if (!timestamp) return 'fecha desconocida';
  const diff = now - timestamp;
  if (diff < 0) return 'recién publicada';
  const days = Math.floor(diff / DAY);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `hace ${years} ${years === 1 ? 'año' : 'años'}`;
}

export function daysSince(timestamp: number | null, now = Date.now()): number {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  return (now - timestamp) / DAY;
}

export function formatDate(timestamp: number | null): string {
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(timestamp),
  );
}

export function formatSalary(min: number | null, max: number | null, currency: string): string {
  if (!min && !max) return '';
  const symbol = currency === 'USD' ? '$' : '€';
  const fmt = (value: number) => `${Math.round(value / 1000)}k`;
  if (min && max && min !== max) return `${fmt(min)}–${fmt(max)} ${symbol}`;
  return `${fmt((min ?? max) as number)} ${symbol}`;
}
