// PURPOSE: Vite build settings; enables the React plugin (JSX, fast refresh)
// SOURCE: Vite React starter template, as used in https://github.com/csdurkin/WebProgramming_ReactVite_TicketmasterAPI/blob/main/vite.config.js (moved, template code)
// AUTHORSHIP: Vite template; moved by Claude; reviewed by Connor
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
