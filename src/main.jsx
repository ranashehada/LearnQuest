import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

try {
  const savedSettings = JSON.parse(
    localStorage.getItem("learnquest-settings") || "{}"
  );

  document.documentElement.setAttribute(
    "data-lq-theme",
    savedSettings.theme === "dark" ? "dark" : "light"
  );
} catch {
  document.documentElement.setAttribute(
    "data-lq-theme",
    "light"
  );
}


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
