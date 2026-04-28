// All icons ported 1:1 from design_handoff_green_thumbs/app.jsx (Ico = { ... })
// Usage: <Ico.Scan color={colors.pine} size={22} />
import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

// Shared wrapper — puts stroke/fill on a <G> so children inherit cleanly
function W({ size, color, sw = 1.7, children }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </G>
    </Svg>
  );
}

export function Scan({ color = '#1F3A28', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Path d="M3 8V5a2 2 0 012-2h3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M21 16v3a2 2 0 01-2 2h-3" />
      <Circle cx={12} cy={12} r={3.5} />
    </W>
  );
}

export function Home({ color = '#1F3A28', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Path d="M3 11.5L12 4l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-8.5z" />
    </W>
  );
}

export function List({ color = '#1F3A28', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Path d="M4 6h16M4 12h16M4 18h10" />
    </W>
  );
}

export function Garden({ color = '#1F3A28', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Path d="M12 22V11M12 11c0-3 2-6 5-6 0 4-2 7-5 7zM12 11c0-3-2-6-5-6 0 4 2 7 5 7z" />
      <Path d="M5 22h14" />
    </W>
  );
}

export function User({ color = '#1F3A28', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </W>
  );
}

export function Leaf({ color = '#5C8A5C', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Path d="M5 19c0-9 7-14 16-14 0 9-5 16-14 16-1 0-2 0-2-2z" />
      <Path d="M5 19c4-4 8-7 14-9" />
    </W>
  );
}

export function Sun({ color = '#1F3A28', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </W>
  );
}

export function Drop({ color = '#1F3A28', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Path d="M12 3s-6 7-6 11a6 6 0 0012 0c0-4-6-11-6-11z" />
    </W>
  );
}

export function Soil({ color = '#1F3A28', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Path d="M3 17h18M5 17l1-4h12l1 4M9 13V9a3 3 0 016 0v4" />
    </W>
  );
}

export function Humid({ color = '#1F3A28', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Path d="M7 4s4 5 4 8a4 4 0 11-8 0c0-3 4-8 4-8zM17 11s3 4 3 6a3 3 0 11-6 0c0-2 3-6 3-6z" />
    </W>
  );
}

export function Flash({ color = '#F4F1E8', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </W>
  );
}

export function Gallery({ color = '#F4F1E8', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Circle cx={9} cy={10} r={1.5} />
      <Path d="M3 17l5-5 4 4 3-3 6 6" />
    </W>
  );
}

export function Flip({ color = '#F4F1E8', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Path d="M3 7h13l-3-3M21 17H8l3 3" />
    </W>
  );
}

export function Back({ color = '#1F3A28', size = 22 }) {
  return (
    <W size={size} color={color} sw={1.8}>
      <Path d="M15 5l-7 7 7 7" />
    </W>
  );
}

export function More({ color = '#1F3A28', size = 22 }) {
  return (
    <W size={size} color={color}>
      <Circle cx={5} cy={12} r={1.3} />
      <Circle cx={12} cy={12} r={1.3} />
      <Circle cx={19} cy={12} r={1.3} />
    </W>
  );
}

export function Alert({ color = '#B8842E', size = 18 }) {
  return (
    <W size={size} color={color} sw={1.8}>
      <Path d="M12 3l10 18H2L12 3z" />
      <Path d="M12 10v5M12 18v.5" />
    </W>
  );
}

export function Check({ color = '#5C8A5C', size = 14 }) {
  return (
    <W size={size} color={color} sw={2.2}>
      <Path d="M5 12l5 5L20 7" />
    </W>
  );
}

export function Trash({ color = '#ffffff', size = 20 }) {
  return (
    <W size={size} color={color} sw={1.8}>
      <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </W>
  );
}

export function Bell({ color = '#1F3A28', size = 20 }) {
  return (
    <W size={size} color={color}>
      <Path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9zM10 21a2 2 0 004 0" />
    </W>
  );
}

export function Chevron({ color = '#6B7A6B', size = 18 }) {
  return (
    <W size={size} color={color}>
      <Path d="M9 5l7 7-7 7" />
    </W>
  );
}

export function Settings({ color = '#1F3A28', size = 20 }) {
  return (
    <W size={size} color={color}>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </W>
  );
}

export function Reminder({ color = '#1F3A28', size = 20 }) {
  return (
    <W size={size} color={color}>
      <Circle cx={12} cy={13} r={8} />
      <Path d="M12 9v4l2 2M9 2h6" />
    </W>
  );
}

export function Share({ color = '#1F3A28', size = 20 }) {
  return (
    <W size={size} color={color}>
      <Path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v14" />
    </W>
  );
}

export function Trophy({ color = '#1F3A28', size = 20 }) {
  return (
    <W size={size} color={color}>
      <Path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a2 2 0 002 4M17 6h3a2 2 0 01-2 4" />
    </W>
  );
}

export function Plus({ color = '#1F3A28', size = 22 }) {
  return (
    <W size={size} color={color} sw={2}>
      <Path d="M12 5v14M5 12h14" />
    </W>
  );
}

export function Bookmark({ color = '#1F3A28', size = 18 }) {
  return (
    <W size={size} color={color}>
      <Path d="M6 3h12v18l-6-4-6 4V3z" />
    </W>
  );
}

export function Close({ color = '#1F3A28', size = 20 }) {
  return (
    <W size={size} color={color} sw={2}>
      <Path d="M6 6l12 12M18 6L6 18" />
    </W>
  );
}
