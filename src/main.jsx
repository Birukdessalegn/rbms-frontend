import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "tailwindcss";
import './index.css';
import App from './App.jsx'

// Global error logging for browser Inspect / DevTools console
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.error("🚨 [UNCAUGHT WINDOW ERROR]:", event.message, {
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("🚨 [UNHANDLED PROMISE REJECTION]:", event.reason);
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
