import React from 'react'
import ReactDOM from 'react-dom/client'
import "./index.css"
import App from './App'

if (import.meta.env.DEV) {
  import('./utils/devHomeDetailsSeed.js')
    .then(({ registerHomeDetailsSeedHelpers }) => registerHomeDetailsSeedHelpers())
    .catch((error) => console.warn('Falha ao registrar helpers de seed:', error));

  import('./utils/devBulkAcademicActions.js')
    .then(({ registerBulkAcademicHelpers }) => registerBulkAcademicHelpers())
    .catch((error) => console.warn('Falha ao registrar helpers de bulk acadêmico:', error));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
