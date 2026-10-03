/**
 * Utility functions for numeric thousands formatting (CLP / Chilean format with dots)
 */

export function formatThousands(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('es-CL');
}

export function parseThousands(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  const clean = String(val).replace(/\D/g, '');
  return clean ? parseInt(clean, 10) : 0;
}
