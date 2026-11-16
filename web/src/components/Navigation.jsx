// PURPOSE: Top menu bar; slim, frosted and sticky. Wordmark on the left, the three sections as a segmented toggle on the right
// SOURCE: https://github.com/csdurkin/WebProgramming_ReactGraphQL_LibraryApp/blob/main/react_client/src/components/Navigation.jsx (adapted: NavLink routes replaced by buttons that set the shown section, as the viewer is one page with no router; title and buttons changed; buttons grouped into a segmented toggle; bar made sticky and frosted)
// AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor

import { AppBar, Toolbar, Button, Box, Typography } from '@mui/material';
import { C } from '../lib/design.js';

//HIDE ON PHONE: visually hidden below the sm breakpoint, but kept for screen readers (display: none would remove the h1 for them too)
const HIDE_ON_PHONE = {
    position: { xs: 'absolute', sm: 'static' }, width: { xs: '1px', sm: 'auto' }, height: { xs: '1px', sm: 'auto' },
    overflow: { xs: 'hidden', sm: 'visible' }, clip: { xs: 'rect(0 0 0 0)', sm: 'auto' },
};

//SECTIONS: one entry per menu button; "key" is what App stores as the current section; "tag" is an optional small note
const SECTIONS = [
    { key: 'report', label: 'Report' },
    { key: 'past', label: 'Past results' },
    { key: 'run', label: 'Run prompts' },
];

// Props: view (the section shown now), onChange (called with a section key when a button is clicked)
function Navigation({ view, onChange }) {

    return (

        // NOTES
            // AppBar: Defines the top-level navigation bar with consistent styling (frosted look set in theme.js)
            // position="sticky": the bar stays at the top while the page scrolls under it
            // Toolbar: Provides a flexible container for arranging navigation items
            // Box: A flexible container component for layout and spacing in Material-UI
            // Button: A Material-UI component for clickable button elements with consistent styling
            // className 'active': marks the current section; the navLink style in theme.js colours it
            // disableGutters: Removes default padding to align content flush with the container edges

        <AppBar position="sticky" elevation={0}>

                <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 60 }, maxWidth: 1280, width: '100%', marginX: 'auto', paddingX: { xs: 2, sm: 4 }, gap: 2 }}>

                    {/* WORDMARK: a small sunset disc and the name */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                            <Box aria-hidden="true" sx={{ width: 20, height: 20, borderRadius: '50%', background: `linear-gradient(180deg, ${C.apricot} 0%, ${C.orange} 100%)` }} />
                            <Typography variant="h1" sx={{ fontSize: '1.125rem', color: C.rustDark, whiteSpace: 'nowrap', ...HIDE_ON_PHONE }}>   {/* hidden on phones so three tabs fit (still read by screen readers: it is the page's h1); the disc stays */}
                                Agent Arena
                            </Typography>
                        </Box>

                    {/* NAVIGATION: a segmented toggle; one button per section; the current one gets the 'active' class*/}
                        <Box role="group" aria-label="Sections" sx={{ display: 'flex', gap: 0.5, padding: '4px', borderRadius: 999, backgroundColor: 'rgba(124, 45, 18, 0.07)' }}>
                            {SECTIONS.map(({ key, label, tag }) => (
                                <Button
                                    key={key}
                                    variant="navLink"
                                    className={view === key ? 'active' : ''}
                                    aria-current={view === key ? 'page' : undefined}
                                    onClick={() => onChange(key)}
                                    sx={{ whiteSpace: 'nowrap', paddingX: { xs: 1.25, sm: 2 }, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}   // three tabs fit one line on a phone
                                >
                                    {label}
                                    {tag && (
                                        <Box component="span" sx={{ marginLeft: 0.75, fontSize: '0.6875rem', fontWeight: 600, paddingX: 0.75, borderRadius: 999, backgroundColor: 'rgba(124, 45, 18, 0.10)', color: C.rustDark }}>
                                            {tag}
                                        </Box>
                                    )}
                                </Button>
                            ))}
                        </Box>

                </Toolbar>

        </AppBar>
    );
}

export default Navigation;
