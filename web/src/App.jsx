// PURPOSE: App shell; applies the MUI theme and shows the top bar above the page content
// SOURCE: https://github.com/csdurkin/WebProgramming_ReactVite_TicketmasterAPI/blob/main/src/components/app/App.jsx (adapted: routes, Navigation and page imports removed; one page instead of routes; title changed)
// AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor

// IMPORTS FOR REACT AND MUI
import React from 'react';
import { AppBar, Toolbar, Typography, ThemeProvider, CssBaseline } from '@mui/material';
import theme from './muiStyling/theme.js';
import './App.css';     //Applies the root layout once, for the whole application

const App = () => {

  return (

    <ThemeProvider theme={theme}>

      <CssBaseline />

        <div className="App">

        {/*
          - AppBar: Top navigation container.
          - Toolbar: Aligns and spaces items.
          - Typography: Displays 'Agent Arena' as a heading.
          - flexgrow - fills available space
        */}

        <AppBar position="static">

          <Toolbar>

            <Typography variant="h1" sx={{ flexGrow: 1, textAlign: 'left' }}>
              Agent Arena
            </Typography>

          </Toolbar>

        </AppBar>

          {/* PURPOSE: Page content area; ArenaPage goes here in step 3
              SOURCE: new
              AUTHORSHIP: drafted by Claude; reviewed by Connor */}
          <main>

          </main>

        </div>

    </ThemeProvider>

  );
};

export default App;
