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
import ReportPage from './components/ReportPage.jsx';
import Footer from './components/Footer.jsx';

const App = () => {

  //STATE MANAGEMENT
    //view: which section is shown ('report', 'past' or 'run'); opens on the report, the overview
    //pastCase: the case Past results opens on when the Report page links to one; null = its usual first case
    const [view, setView] = useState('report');
    const [pastCase, setPastCase] = useState(null);

    //OPEN CASE: from the Report page's failing cases to that case on Past results, at the top of the page
    const openCase = (id) => {
      setPastCase(id);
      setView('past');
      window.scrollTo(0, 0);
    };

    //CHANGE VIEW: from the menu; Past results goes back to its usual first case
    const changeView = (next) => {
      setPastCase(null);
      setView(next);
    };

  return (

    <ThemeProvider theme={theme}>

      <CssBaseline />

        <div className="App">

          {/* MENU: Navigation receives the current view and a way to change it */}
          <Navigation view={view} onChange={changeView} />

          {/*NOTES:
              - Replaces the Routes block: one page, no URL changes.
              - Only the chosen section is drawn; the others are not rendered at all.
              - key on Past results: a new case from the Report page starts it afresh on that case.
          */}
          <main>
            {view === 'report' && <ReportPage onOpenCase={openCase} />}
            {view === 'past' && <PastResultsPage key={pastCase ?? 'default'} initialCaseId={pastCase} />}
            {view === 'run' && <RunPromptsPage />}
          </main>

          {/* FOOTER: shared by all sections */}
          <Footer />

        </div>

    </ThemeProvider>

  );
};

export default App;
