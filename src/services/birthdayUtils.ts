/**
 * Utility functions for detecting and formatting student birthdays
 */

export function parseBirthDate(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-12
  const day = parseInt(parts[2], 10); // 1-31
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Checks if today is the birthday of the person (in local time)
 */
export function isTodayBirthday(dateStr?: string): boolean {
  const parsed = parseBirthDate(dateStr);
  if (!parsed) return false;
  const today = new Date();
  return today.getMonth() + 1 === parsed.month && today.getDate() === parsed.day;
}

/**
 * Checks if the birthday falls in the current month
 */
export function isThisMonthBirthday(dateStr?: string): boolean {
  const parsed = parseBirthDate(dateStr);
  if (!parsed) return false;
  const today = new Date();
  return today.getMonth() + 1 === parsed.month;
}

/**
 * Calculates how many days until the next birthday (0 = today, 1 = tomorrow, etc.)
 */
export function getDaysUntilBirthday(dateStr?: string): number | null {
  const parsed = parseBirthDate(dateStr);
  if (!parsed) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisYearBirthday = new Date(today.getFullYear(), parsed.month - 1, parsed.day);
  thisYearBirthday.setHours(0, 0, 0, 0);

  let diffTime = thisYearBirthday.getTime() - today.getTime();
  if (diffTime < 0) {
    // Already passed this year, check next year
    const nextYearBirthday = new Date(today.getFullYear() + 1, parsed.month - 1, parsed.day);
    diffTime = nextYearBirthday.getTime() - today.getTime();
  }

  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formats a birthday date nicely with day and month name, e.g. "14 de Mayo"
 */
export function formatBirthdayDisplay(dateStr?: string): string {
  const parsed = parseBirthDate(dateStr);
  if (!parsed) return 'Fecha no informada';

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const monthName = monthNames[parsed.month - 1] || '';
  return `${parsed.day} de ${monthName}`;
}
