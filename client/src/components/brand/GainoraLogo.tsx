import type { CSSProperties } from 'react';

/**
 * Sistema de marca Gainora — identidad puramente tipográfica.
 *
 *   <GainoraMark size={32} />        → "G" mayúscula con gradient (icono standalone)
 *   <GainoraWordmark size={24} />    → "Gainora" con la G del mismo gradient
 *
 * Misma G en todos sitios: wordmark, icono, favicon, sidebar.
 * Fondo transparente — el contenedor decide el fondo si lo necesita.
 */

const FONT_STACK =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const BRAND_GRADIENT = 'linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%)';

const gradientText: CSSProperties = {
  background: BRAND_GRADIENT,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  color: 'transparent',
};

type MarkProps = {
  /** Altura visual del icono en px (≈ font-size). */
  size?: number;
  /** Si false, color sólido azul en vez de gradient. */
  gradient?: boolean;
  /** Color sólido si gradient=false. */
  color?: string;
  className?: string;
};

/**
 * Isotipo: "G" mayúscula standalone con el mismo gradient que el wordmark.
 * Fondo transparente: el contenedor padre decide si necesita backdrop.
 */
export const GainoraMark = ({
  size = 32,
  gradient = true,
  color = '#0A84FF',
  className,
}: MarkProps) => (
  <span
    className={className}
    style={{
      fontFamily: FONT_STACK,
      fontWeight: 800,
      fontSize: Math.round(size * 1.15),
      letterSpacing: '-0.04em',
      lineHeight: 1,
      display: 'inline-block',
      flexShrink: 0,
      ...(gradient ? gradientText : { color }),
    }}
    aria-hidden="true"
  >
    G
  </span>
);

type LogoProps = {
  /** Altura del lockup. Mark y wordmark escalan juntos. */
  height?: number;
  /** Color del resto del wordmark "ainora". */
  textColor?: string;
  className?: string;
};

/**
 * Imagotipo: G coloreada + "ainora" en texto plano.
 * Se lee como "Gainora" porque la G es el isotipo.
 */
export const GainoraLogo = ({
  height = 32,
  textColor = '#FFFFFF',
  className,
}: LogoProps) => (
  <span
    className={className}
    style={{
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 0,
      lineHeight: 1,
      fontFamily: FONT_STACK,
      fontWeight: 700,
      fontSize: Math.round(height * 0.92),
      letterSpacing: '-0.04em',
    }}
  >
    <span style={gradientText}>G</span>
    <span style={{ color: textColor }}>ainora</span>
  </span>
);

type WordmarkProps = {
  /** Tamaño en px del wordmark. */
  size?: number;
  /** Color del resto "ainora". Default blanco. */
  textColor?: string;
  /** Aplicar gradiente a la G. Default true. */
  gradient?: boolean;
  /** Color sólido de la G si gradient=false. */
  accentColor?: string;
  className?: string;
};

/**
 * Wordmark "Gainora" con la G destacada.
 * Equivalente a <GainoraLogo> pero con API por size en vez de height.
 */
export const GainoraWordmark = ({
  size = 24,
  textColor = '#FFFFFF',
  gradient = true,
  accentColor = '#0A84FF',
  className,
}: WordmarkProps) => {
  const accentStyle: CSSProperties = gradient ? gradientText : { color: accentColor };
  return (
    <span
      className={className}
      style={{
        fontFamily: FONT_STACK,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: '-0.04em',
        color: textColor,
        lineHeight: 1,
        display: 'inline-block',
      }}
    >
      <span style={accentStyle}>G</span>ainora
    </span>
  );
};

export default GainoraLogo;
