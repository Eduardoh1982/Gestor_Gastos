/**
 * Utility functions for thousands-separated numeric inputs (formato de miles: 15.000, 150.000)
 */

/**
 * Formats a raw number or string into thousands separated by dots (e.g. 15000 -> "15.000")
 */
export function formatThousands(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('es-CL');
}

/**
 * Parses a formatted string (e.g. "15.000") into a pure number (15000)
 */
export function parseThousands(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;
  const num = parseInt(digits, 10);
  return isNaN(num) ? 0 : num;
}
