// PURPOSE: Design tokens: every named colour and shared style the components use, in one place
//          (the MUI theme in muiStyling/theme.js sets the base palette and type; this file holds what the components add)
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// WHY A SEPARATE FILE: component files that also export constants stop Vite's fast refresh working; keeping tokens here avoids that

//  COLOURS: the sunset oranges, the blue accent (anything clickable or needing attention), and neutrals
export const C = {
  accent: '#2563EB',            // blue accent: buttons, active toggle, "sent" bars, words used
  accentDark: '#1D4ED8',        // blue text on light backgrounds ("Start here", "Click to change")
  accentTint: '#EFF6FF',        // light blue: rows that need attention (expected rule, differing scores), hover and focus

  orange: '#C2410C',            // burnt orange: spine, rules beside sentences, the gpt-5-mini colour
  rust: '#9A3412',              // labels and sub-section titles
  rustDark: '#7C2D12',          // wordmark, footer
  rustDeepest: '#431407',       // the dark end of the hero

  apricot: '#FDBA74',           // labels on the dark hero, the light end of the wordmark disc
  peach: '#FFEDD5',             // footer link text
  paleOrange: '#FFF7ED',        // hero and footer text on dark backgrounds
  cream: '#FFFBF5',             // card header rows, the page background
  amber: '#B45309',             // the edge on tied rows

  white: '#FFFFFF',
  stone: '#A8A29E',             // "not sent" bars
  stoneLight: '#F5F5F4',        // bar tracks
};

//  SUNSET: one stop per band, so the bands blend into one gradient from daylight (input) to dusk (output)
export const SUNSET = ['#FFFBF5', '#FFF4E6', '#FFEBD4', '#FFDDB8', '#FED7AA'];

//  MODEL COLOURS: fixed per model in meta.models order (gpt-4.1-mini, gpt-5-mini), never by rank;
//  validated as a pair for colour-blind separation (dataviz validate_palette.js: all checks pass)
export const MODEL_COLOURS = [C.accent, C.orange];

//  HERO BACKGROUND: dark rust, which sets the hero apart from the light steps and bookends the page with the footer
export const HERO_BG = `linear-gradient(135deg, ${C.rustDeepest} 0%, ${C.rustDark} 100%)`;

//  SURFACE: the white surface, used only where content needs one (input and answer cards, tables, tiles)
export const SURFACE = {
  backgroundColor: C.white,
  borderRadius: 3,                                      // 12px
  border: '1px solid rgba(124, 45, 18, 0.12)',          // quiet warm hairline
  boxShadow: '0 1px 2px rgba(124, 45, 18, 0.05), 0 6px 18px rgba(124, 45, 18, 0.06)',
};
