// AceMate design system — mobile tokens
// Keep in sync with CLAUDE.md Design System section

export const colors = {
  // Surfaces
  bg:      '#111111',
  surface: '#222222',
  card:    '#1a1a1a',
  border:  '#333333',

  // Brand
  aceGreen:   '#C5F135',
  limeLight:  '#EEFF88',
  rallyOrange: '#FF7F2D',
  orangeLight: '#FFB380',
  grass:      '#4a8c3f',

  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted:     'rgba(255,255,255,0.35)',

  // Semantic
  red: '#EF4444',
} as const;

export const typography = {
  display: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.64,
    color: colors.textPrimary,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.22,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.textMuted,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
