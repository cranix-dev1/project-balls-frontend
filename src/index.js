import React from 'react';
import ReactDOM from 'react-dom/client'; // React 18+ root API for concurrent features
import './index.css'; // Global styles (Tailwind directives + base resets)
import App from './App'; // Main application entry component

// === Create a root DOM node for the React app to mount ===
const root = ReactDOM.createRoot(document.getElementById('root'));

// === Render the application wrapped in React.StrictMode ===
// Helps catch potential problems in development (e.g., side effects)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
