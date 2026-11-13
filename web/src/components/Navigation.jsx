// PURPOSE: Top menu bar; title plus one button per section (Run Prompts, See Past Results)
// SOURCE: https://github.com/csdurkin/WebProgramming_ReactGraphQL_LibraryApp/blob/main/react_client/src/components/Navigation.jsx (adapted: NavLink routes replaced by buttons that set the shown section, as the viewer is one page with no router; title and buttons changed)
// AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor

import { AppBar, Toolbar, Button, Box, Typography } from '@mui/material';

//SECTIONS: one entry per menu button; "key" is what App stores as the current section
const SECTIONS = [
    { key: 'run', label: 'Run Prompts' },
    { key: 'past', label: 'See Past Results' },
];

// Props: view (the section shown now), onChange (called with a section key when a button is clicked)
function Navigation({ view, onChange }) {

    return (

        // NOTES
            // AppBar: Defines the top-level navigation bar with consistent styling
            // Toolbar: Provides a flexible container for arranging navigation items
            // flexGrow: Allows an element to expand and take up remaining space in a flex container
            // Box: A flexible container component for layout and spacing in Material-UI
            // Button: A Material-UI component for clickable button elements with consistent styling
            // className 'active': marks the current section; the navLink style in theme.js colours it
            // disableGutters: Removes default padding to align content flush with the container edges

        <AppBar position="static">

                <Toolbar disableGutters sx={{ justifyContent: 'space-between', flexWrap: 'wrap', paddingX: 2 }}>

                    {/* TITLE*/}
                        <Typography variant="h1" sx={{ flexGrow: 1, textAlign: 'left', color: 'white' }}>
                            Agent Arena
                        </Typography>

                    {/* NAVIGATION: one button per section; the current one gets the 'active' class*/}
                        <Box display="flex" gap={2}>
                            {SECTIONS.map(({ key, label }) => (
                                <Button
                                    key={key}
                                    variant="navLink"
                                    className={view === key ? 'active' : ''}
                                    aria-current={view === key ? 'page' : undefined}
                                    onClick={() => onChange(key)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </Box>

                </Toolbar>

        </AppBar>
    );
}

export default Navigation;
