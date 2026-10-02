/**
 * Utility functions for Chilean mobile phone formatting (+56 9 NNNN NNNN)
 */

export function formatChileanMobile(raw: string | undefined | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed === '') return '';

  // Extract all digits
  let digits = trimmed.replace(/\D/g, '');

  // Strip international prefix '56' if present
  if (digits.startsWith('56')) {
    digits = digits.slice(2);
  }

  // Chilean mobile numbers start with '9'
  if (digits.startsWith('9')) {
    digits = digits.slice(1);
  }

  // Next 8 digits represent the mobile subscriber number (NNNN NNNN)
  const subscriber = digits.slice(0, 8);

  if (subscriber.length === 0) {
    return trimmed.startsWith('+56') ? '+56 9 ' : '';
  }

  if (subscriber.length <= 4) {
    return `+56 9 ${subscriber}`;
  }

  return `+56 9 ${subscriber.slice(0, 4)} ${subscriber.slice(4)}`;
}

export function cleanChileanMobileForWhatsApp(raw: string | undefined | null): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('569') && digits.length === 11) {
    return digits;
  }
  if (digits.startsWith('9') && digits.length === 9) {
    return '56' + digits;
  }
  if (digits.length === 8) {
    return '569' + digits;
  }
  if (digits.startsWith('56') && digits.length === 10) {
    return '569' + digits.slice(2);
  }
  return digits;
}

export const formatChileanPhoneDisplay = formatChileanMobile;
