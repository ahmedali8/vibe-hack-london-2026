import React from 'react';
import Svg, { Circle, Defs, ClipPath, Path } from 'react-native-svg';
import { colors } from '../theme/colors';

// Moon-phase glyph — PRD 0.4 (Stardust iconography). phase: 0 = new, 0.5 = full, 1 = new.
export function MoonGlyph({
  size = 24,
  phase = 0.5,
  color = colors.accentVioletSoft,
}: {
  size?: number;
  phase?: number;
  color?: string;
}) {
  const r = size / 2;
  const cx = r;
  const cy = r;
  // Offset of the shadow circle: 0 at full moon, ±diameter at new moon.
  const offset = (0.5 - Math.abs(phase - 0.5)) * 0; // base
  const shadowShift = (phase < 0.5 ? -1 : 1) * (1 - 2 * Math.abs(phase - 0.5)) * size;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <ClipPath id="moon">
          <Circle cx={cx} cy={cy} r={r - 1} />
        </ClipPath>
      </Defs>
      {/* Illuminated disc */}
      <Circle cx={cx} cy={cy} r={r - 1} fill={color} opacity={0.9} clipPath="url(#moon)" />
      {/* Shadow disc carves the phase */}
      <Circle
        cx={cx + shadowShift}
        cy={cy + offset}
        r={r - 1}
        fill={colors.bgBase}
        clipPath="url(#moon)"
      />
      {/* Outline ring */}
      <Circle cx={cx} cy={cy} r={r - 1} stroke={color} strokeWidth={1} fill="none" opacity={0.5} />
    </Svg>
  );
}

// Custom teardrop (bleeding) glyph — PRD 0.4.
export function TeardropGlyph({ size = 16, color = colors.accentRose }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2 C12 2 4 11 4 16 a8 8 0 0 0 16 0 C20 11 12 2 12 2 Z"
        fill={color}
      />
    </Svg>
  );
}
