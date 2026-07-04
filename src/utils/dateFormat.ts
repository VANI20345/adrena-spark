import { format as dfFormat } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * Convert any Arabic-Indic (٠-٩) or Extended Arabic-Indic (۰-۹) digits
 * inside a string to ASCII digits (0-9).
 *
 * Used to guarantee that dates/times shown to the user always render
 * their numeric parts in English digits, regardless of the active
 * application language.
 */
export const toEnglishDigits = (input: string | number | null | undefined): string => {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
            .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
};

type DateInput = Date | string | number;

const toDate = (value: DateInput): Date => (value instanceof Date ? value : new Date(value));

/**
 * Format an event date. Month name is localised (Arabic/English) but every
 * numeric component is forced to English digits.
 */
export const formatEventDate = (
  value: DateInput,
  isRTL: boolean,
  pattern: string = 'd MMMM yyyy',
): string => {
  return toEnglishDigits(dfFormat(toDate(value), pattern, { locale: isRTL ? ar : undefined }));
};

/**
 * Format an event time (defaults to 12h with AM/PM). Always English digits.
 */
export const formatEventTime = (
  value: DateInput,
  isRTL: boolean = false,
  pattern: string = 'hh:mm a',
): string => {
  return toEnglishDigits(dfFormat(toDate(value), pattern, { locale: isRTL ? ar : undefined }));
};

/**
 * Format combined date + time. Always English digits.
 */
export const formatEventDateTime = (
  value: DateInput,
  isRTL: boolean,
): string => `${formatEventDate(value, isRTL)} · ${formatEventTime(value, isRTL)}`;
