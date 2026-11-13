// PURPOSE: Entry point; mounts the App component into the page's "root" div
// SOURCE: https://github.com/csdurkin/WebProgramming_ReactVite_TicketmasterAPI/blob/main/src/main.jsx (adapted: BrowserRouter and index.css removed, as the viewer is one page with no routes)
// AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor

// IMPORTS (Notes for each on right)
import React from 'react';                          // React: helps build dynamic, interactive web pages that feel like a single page
import ReactDOM from 'react-dom/client';            // ReactDOM: Necessary to launch site, in this file, createRoot is used to connect application to specific part of the website
import App from './App.jsx';                        // App: main component of the app


ReactDOM.createRoot(document.getElementById('root')).render(

  //StrictMode: development-only checks that warn about unsafe patterns; no effect on the built site
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
