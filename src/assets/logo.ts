import logoImage from './images/shito_ryu_logo_1790708545685.jpg';

export const APP_LOGO = logoImage;

export function getEffectiveLogo(customLogo?: string | null): string {
  if (customLogo && typeof customLogo === 'string' && customLogo.trim() !== '') {
    return customLogo;
  }
  return APP_LOGO;
}
