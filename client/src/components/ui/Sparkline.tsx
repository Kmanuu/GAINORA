// ============================================================================
// Sparkline.tsx — Mini gráfico SVG inline (línea + relleno) para KPI cards
// ============================================================================

import { useId } from 'react';

interface Props {
  data:    number[];
  width?:  number;
  height?: number;
  color?:  string;
  stroke?: number;
  fill?:   boolean;
  className?: string;
}

export default function Sparkline({
  data,
  width  = 120,
  height = 32,
  color  = '#0A84FF',
  stroke = 1.6,
  fill   = true,
  className,
}: Props) {
  const gradId = useId();

  if (!data.length) {
    return <div style={{ width, height }} className={className} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padY  = 2;

  const pts = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = padY + (1 - (d - min) / range) * (height - padY * 2);
    return [x, y];
  });

  const linePath = pts
    .map(([x, y], i) => (i === 0 ? `M ${x},${y}` : `L ${x},${y}`))
    .join(' ');

  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  const [lastX, lastY] = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={`url(#${gradId})`} />}
      <path
        d={linePath}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
      <circle cx={lastX} cy={lastY} r="4.5" fill={color} opacity="0.20" />
    </svg>
  );
}
