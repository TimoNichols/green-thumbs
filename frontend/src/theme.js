// Green Thumbs — design tokens
// Drop into your Expo app at app/theme.js (or src/theme.js).
// Light, botanical palette. Forest greens for text/CTAs, warm cream surfaces,
// amber RESERVED for the diagnosis card on the Report screen.

export const colors = {
  // Surfaces
  bg:       '#F4F1E8', // warm cream — primary screen background
  bgAlt:    '#EBE6D6', // section dividers / subtle bands
  bgRaise:  '#FFFFFF', // cards, sheet, input fields
  bgSage:   '#E5EBDB', // pale sage tint — chips, hero washes, settings icons
  bgMint:   '#DCE7C7', // mint-leaf tint — healthy badge, "got it" button bg
  bgDeep:   '#0E1A12', // ONLY for camera viewfinder

  // Hairlines (use rgba so they sit naturally on cream)
  line:     'rgba(45, 70, 50, 0.10)',
  lineSoft: 'rgba(45, 70, 50, 0.06)',

  // Greens — deep to light
  forest:   '#1F3A28', // primary text + deep accent
  pine:     '#2E5238', // secondary green, badge text
  leaf:     '#5C8A5C', // mid-green — primary CTA gradient top, leaf icon
  sage:     '#8FA988', // soft green — hairline accents
  mint:     '#B8D5A6', // pale mint
  leafDeep: '#3D6240', // darker outlines

  // Text
  text:     '#1F3A28', // primary on cream (== forest)
  textSoft: '#4A5A4A', // secondary
  textMute: '#6B7A6B', // tertiary, mono labels

  // Amber — diagnosis card ONLY
  amber:     '#B8842E', // amber accent (alert dot, icon stroke)
  amberSoft: '#F5E6C8', // amber bg tint behind the diagnosis card body
  amberDeep: '#7A5418', // amber dark text on amber bg
  amberLine: '#D9B074', // amber hairline

  // Destructive (swipe-to-delete)
  danger:   '#A84545',
};

// Typography pairing — load the @expo-google-fonts packages for these
// in your root component (see README for the install + useFonts snippet).
export const fonts = {
  serif: 'Fraunces_400Regular',           // display — used italic for emphasis
  serifItalic: 'Fraunces_400Regular_Italic',
  sans:  'Manrope_500Medium',             // UI body
  sansBold: 'Manrope_700Bold',            // UI emphasis
  mono:  'JetBrainsMono_400Regular',      // small labels, dates, metadata
};

// Type scale — every value is a px size + matching lineHeight.
// Use directly in StyleSheet.create({ ... fontSize: type.h1.size, lineHeight: type.h1.lineHeight }).
export const type = {
  // Display / titles (Fraunces, often italic via fontStyle: 'italic'
  // OR by using fonts.serifItalic if the italic variant doesn't synthesize)
  h1:        { size: 32, lineHeight: 36, family: 'serif',  letterSpacing: -0.3 },
  h2:        { size: 26, lineHeight: 30, family: 'serif',  letterSpacing: -0.3 },
  h3:        { size: 20, lineHeight: 26, family: 'serif',  letterSpacing: -0.2 },

  // Body / UI (Manrope)
  body:      { size: 14, lineHeight: 20, family: 'sans',   letterSpacing: 0 },
  bodySmall: { size: 12.5, lineHeight: 18, family: 'sans', letterSpacing: 0 },
  button:    { size: 14, lineHeight: 18, family: 'sans',   letterSpacing: 0.3, weight: '700' },
  chip:      { size: 11, lineHeight: 14, family: 'sans',   letterSpacing: 0.4, weight: '600' },

  // Metadata (JetBrains Mono — uppercased via textTransform)
  meta:      { size: 10.5, lineHeight: 14, family: 'mono', letterSpacing: 1.4, transform: 'uppercase' },
  metaSmall: { size: 10,   lineHeight: 12, family: 'mono', letterSpacing: 1.2, transform: 'uppercase' },
};

// 4-pt spacing scale.
// Use as `padding: spacing[4]` etc. Keep this small — the design is restrained.
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,   // standard screen horizontal padding
  7: 32,
  8: 40,
  9: 56,   // top of every screen below the status bar
  10: 64,  // primary CTA height
  11: 88,  // shutter button
  12: 120, // bottom-sheet padding bottom (clears tab bar)
};

// Radii — used consistently across cards, chips, sheets.
export const radii = {
  none: 0,
  sm: 8,
  md: 10,    // small chips
  lg: 12,    // inputs, setting rows
  xl: 14,    // cards, list rows, header buttons
  '2xl': 18, // care grid tiles, week strip card
  '3xl': 22, // tab bar
  sheet: 24, // bottom sheet top corners
  pill: 999,
};

// Shadows — subtle. Only the primary CTA + tab bar lift.
// On iOS use shadow*; on Android use elevation. We expose both per token.
export const shadows = {
  // CTA gradient button
  cta: {
    shadowColor: '#2E5238',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  // Bottom tab bar
  bar: {
    shadowColor: '#1F3A28',
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  // Card hover (use sparingly)
  card: {
    shadowColor: '#1F3A28',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // Bottom sheet (lift up from bottom)
  sheet: {
    shadowColor: '#0F1A12',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 12,
  },
};

// CTA gradient — pass through to expo-linear-gradient.
//   <LinearGradient colors={gradients.cta} style={...} />
export const gradients = {
  cta:    ['#5C8A5C', '#2E5238'],          // leaf → pine, the primary action
  cream:  ['transparent', '#F4F1E8'],      // for fading the bottom of scroll views into the tab bar
};

// Single default export so consumers can `import theme from './theme'`.
const theme = { colors, fonts, type, spacing, radii, shadows, gradients };
export default theme;
