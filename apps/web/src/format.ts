export function formatDate(iso: string, withWeekday = false): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(withWeekday ? { weekday: 'short' } : {}),
    timeZone: 'UTC',
  });
}

export function phaseLabel(daysFromDiwali: number): string {
  if (daysFromDiwali === 0) return 'Diwali night';
  if (daysFromDiwali === 1) return 'Day after Diwali';
  if (daysFromDiwali < 0 && daysFromDiwali >= -14) return `Diwali −${-daysFromDiwali}d`;
  if (daysFromDiwali > 0 && daysFromDiwali <= 14) return `Diwali +${daysFromDiwali}d`;
  return '';
}
