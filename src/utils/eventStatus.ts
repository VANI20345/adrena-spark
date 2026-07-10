// Shared helpers for event time/status tags and price display.
// Used across event cards on all pages for consistency.

export type EventTagVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface EventTag {
  label: string;
  variant: EventTagVariant;
}

export interface EventLike {
  start_date?: string | null;
  end_date?: string | null;
}

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns a contextual tag for an event card:
 * - Ongoing: currently running OR ending within 24h
 * - Starts today / Starts in X days: upcoming
 * - Started X days ago / Ended X days ago: past
 */
export function getEventTag(event: EventLike, isRTL: boolean): EventTag {
  const now = Date.now();
  const start = event.start_date ? new Date(event.start_date).getTime() : NaN;
  const end = event.end_date ? new Date(event.end_date).getTime() : NaN;

  const hasStart = Number.isFinite(start);
  const hasEnd = Number.isFinite(end);

  // Ongoing: in progress OR ending within next 24h
  const inProgress = hasStart && start <= now && (!hasEnd || end >= now);
  const endingSoon = hasEnd && end > now && end - now <= MS_DAY;
  if (inProgress || endingSoon) {
    return {
      label: isRTL ? 'جارية الآن' : 'Ongoing',
      variant: 'default',
    };
  }

  // Upcoming
  if (hasStart && start > now) {
    const diffMs = start - now;
    const days = Math.ceil(diffMs / MS_DAY);
    if (diffMs <= MS_DAY) {
      const hours = Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000)));
      return {
        label: isRTL ? `تبدأ خلال ${hours} ساعة` : `Starts in ${hours}h`,
        variant: 'secondary',
      };
    }
    if (days === 1) {
      return { label: isRTL ? 'تبدأ غداً' : 'Starts tomorrow', variant: 'secondary' };
    }
    return {
      label: isRTL ? `تبدأ خلال ${days} يوم` : `Starts in ${days} days`,
      variant: 'secondary',
    };
  }

  // Past
  const ref = hasEnd ? end : hasStart ? start : NaN;
  if (Number.isFinite(ref)) {
    const daysAgo = Math.max(1, Math.floor((now - ref) / MS_DAY));
    if (daysAgo === 1) {
      return { label: isRTL ? 'انتهت أمس' : 'Ended yesterday', variant: 'outline' };
    }
    return {
      label: isRTL ? `انتهت منذ ${daysAgo} يوم` : `Ended ${daysAgo} days ago`,
      variant: 'outline',
    };
  }

  return { label: isRTL ? 'قريباً' : 'Upcoming', variant: 'secondary' };
}

/**
 * Formatted price label for event cards.
 * Free events (null/0) display "Free" / "مجاني".
 */
export function getEventPriceLabel(price: number | null | undefined, isRTL: boolean): string {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) {
    return isRTL ? 'مجاني' : 'Free';
  }
  return isRTL ? `${n} ريال` : `${n} SAR`;
}

export function isFreeEvent(price: number | null | undefined): boolean {
  const n = Number(price);
  return !Number.isFinite(n) || n <= 0;
}
