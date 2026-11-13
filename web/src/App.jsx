// PURPOSE: App shell; applies the MUI theme, shows the menu, and shows the chosen section below it
// SOURCE: https://github.com/csdurkin/WebProgramming_ReactVite_TicketmasterAPI/blob/main/src/components/app/App.jsx (adapted: routes and page imports removed; the AppBar moved into Navigation.jsx; a "view" state picks the section instead of the URL)
// AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor

// IMPORTS FOR REACT AND MUI
import React, { useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './muiStyling/theme.js';
import './App.css';     //Applies the root layout once, for the whole application

// IMPORT OF SECTIONS
import Navigation from './components/Navigation.jsx';
import RunPromptsPage from './components/RunPromptsPage.jsx';
import PastResultsPage from './components/PastResultsPage.jsx';
import Footer from './components/Footer.jsx';

const App = () => {

  //STATE MANAGEMENT
    //view: which section is shown ('run' or 'past'); opens on past results, the only built section
    const [view, setView] = useState('past');

  return (

    <ThemeProvider theme={theme}>

      <CssBaseline />

        <div className="App">

          {/* MENU: Navigation receives the current view and a way to change it */}
          <Navigation view={view} onChange={setView} />

          {/*NOTES:
              - Replaces the Routes block: one page, no URL changes.
              - Only the chosen section is drawn; the other is not rendered at all.
          */}
          <main>
            {view === 'run' ? <RunPromptsPage /> : <PastResultsPage />}
          </main>

          {/* FOOTER: shared by both sections */}
          <Footer />

        </div>

    </ThemeProvider>

  );
};

export default App;
