import React from 'react'
import ReactDOM from 'react-dom/client'
import HomesteadSiege from './HomesteadSiege'
import ErrorBoundary from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <HomesteadSiege />
  </ErrorBoundary>
)
