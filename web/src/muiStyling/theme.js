// PURPOSE: MUI theme; colours, fonts and component styles for the whole viewer
// SOURCE: https://github.com/csdurkin/WebProgramming_ReactVite_TicketmasterAPI/blob/main/src/components/muiStyling/theme.js (adapted: structure, sections and comments kept; palette changed to sunset oranges with blue as the accent; typography changed to Inter with Plus Jakarta Sans headings and Fraunces serif for tested language, a 1.25x scale with three distinct heading tiers, per-variant line heights, left-aligned headings; the sunset now runs through full-width page bands (Band.jsx); frosted sticky menu bar, pill chips and quiet table styles added; Card, CardMedia and Link styles removed, as the viewer does not use those components; the navLink button variant is marked separately below)
// AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor

// Theme configuration for the application

import { createTheme } from '@mui/material/styles';

/* Fonts (loaded in index.html; system fonts if they cannot load). The rule for mixing them:
     SERIF  = the language being tested: the question (input) and the models' answers (output), in matching cards (LanguageCard.jsx)
     SANS   = the harness: titles, labels, measurements, the conclusion (Plus Jakarta Sans for headings and figures, Inter for text)
   Serif text is set at 1.0625rem so it looks the same size as 1rem Inter (a serif reads smaller at the same size). */
export const SERIF_FONT = 'Fraunces, Georgia, "Times New Roman", serif';
export const SERIF_SIZE = '1.0625rem';
const BODY_FONT = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
export const HEADING_FONT = '"Plus Jakarta Sans", Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

/* Palette: Defines color scheme for the application */
const theme = createTheme({
  palette: {
    primary: { main: '#2563EB' },                         // accent blue: only for things you click or that need attention
    secondary: { main: '#C2410C' },                       // burnt orange: spine, labels, emphasis
    background: { default: '#FFFBF5', paper: '#ffffff' }, // cream; the sunset runs through the page bands (Band.jsx)
    text: { primary: '#292524', secondary: '#57534E' },   // warm near-black and warm grey (dark enough for 4.5:1 on the peach bands)
  },

  /* Typography: Manages font styles and sizes
     Three heading tiers that look clearly different:
       h3 section title (large, heading font) > h4 sub-section title (medium, heading font) > h5 label (small grey capitals)
     Scale steps are about 1.25x; headings have tight line height, reading text has room. */
  typography: {
    fontFamily: BODY_FONT,
    fontSize: 16,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontFamily: HEADING_FONT, fontSize: '1.375rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.01em', textAlign: 'left' },   // brand in the menu bar
    h2: { fontFamily: HEADING_FONT, fontSize: '2rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', textAlign: 'left' },
    h3: { fontFamily: HEADING_FONT, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.015em', textAlign: 'left' },
    h4: { fontFamily: HEADING_FONT, fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.005em', color: '#9A3412', textAlign: 'left' },   // sub-section title in rust, so it stands apart from body text
    h5: { fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#57534E', textAlign: 'left' },   // label
    h6: { fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'left' },
    subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },
    body1: { fontSize: '1rem', lineHeight: 1.65 },
    body2: { fontSize: '0.875rem', lineHeight: 1.55 },
    button: { fontSize: '0.875rem', fontWeight: 600 },
  },

  /* Components: Customizes specific Material-UI components */
  components: {

    /* CssBaseline: page background is cream; the sunset itself runs through the full-width bands (Band.jsx) */
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#FFFBF5',
          minHeight: '100vh',
        },
        // Smooth scrolling for in-page links (e.g. "Start comparing"), only for people who have not asked their system to reduce motion
        '@media (prefers-reduced-motion: no-preference)': {
          html: { scrollBehavior: 'smooth' },
        },
      },
    },

    /* AppBar: slim frosted bar that stays at the top; the page shows through it, blurred */
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 251, 245, 0.75)',
          backdropFilter: 'saturate(180%) blur(12px)',
          color: '#292524',
          borderBottom: '1px solid rgba(124, 45, 18, 0.10)',
          borderRadius: 0,
          padding: 0,
        },
      },
    },

    /* Button: Custom styles for buttons */
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '10px 20px',
        },
      },

      // PURPOSE: "navLink" button style for the top menu; the active section is highlighted
      // SOURCE: https://github.com/csdurkin/WebProgramming_ReactGraphQL_LibraryApp/blob/main/react_client/src/muiStyling/theme.js (adapted: moved from styleOverrides into variants, which is where MUI 5 reads custom variants; recoloured to this palette; active colour now differs from the base)
      // AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor
      // STYLE (header pass): one half of a segmented toggle; the active half is a raised white pill with blue text (blue = accent)
      variants: [
        {
          props: { variant: 'navLink' },
          style: {
            textTransform: 'none',
            borderRadius: 999,
            padding: '6px 16px',
            minWidth: 0,
            backgroundColor: 'transparent',
            color: '#57534E',
            transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              color: '#292524',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
            },
            '&.active': {
              color: '#1D4ED8',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(124, 45, 18, 0.18)',
            },
          },
        },
      ],
    },

    /* Chip: pill-shaped tags with medium-weight text */
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 500,
        },
      },
    },

    /* TableCell: quiet hairlines; small uppercase grey column headings */
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(124, 45, 18, 0.08)',
        },
        head: {
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#57534E',
        },
      },
    },

    /* Typography: line height is now set per variant in typography above (tight headings, roomy reading text),
       so the single lineHeight: 1.5 that was here would override them; numbers line up in columns (tabular figures) */
    MuiTypography: {
      styleOverrides: {
        root: {
          fontVariantNumeric: 'tabular-nums',
        },
      },
    },

    /* Paper: Custom styles for paper elements */
    MuiPaper: {
      styleOverrides: {
        root: {
          padding: '16px',
          borderRadius: 12,
        },
      },
    },

  },
});

export default theme;

/* DEFINITIONS:
- palette: Defines color themes, including primary, secondary, background, and text colors.
- typography: Sets global font styles, sizes, and weights.
- maxWidth: Specifies the maximum width an element can take.
- margin: Adds space around elements.
- padding: Adds space inside an element.
- border: Defines the style, width, and color of borders.
- borderRadius: Rounds the corners of an element.
- textTransform: Controls capitalization of text.
- textDecoration: Sets or removes text decoration like underlines.
- linear-gradient: Blends smoothly between colours along a line (here, top to bottom).
- boxShadow: Draws a soft shadow around an element, so it appears to sit above the page.
- letterSpacing: Adjusts the space between letters; slightly negative tightens large headings.
*/
