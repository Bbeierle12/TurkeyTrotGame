import React from 'react'
import ReactDOM from 'react-dom/client'
// Refactored component - uses GameEngine for all game logic
import TurkeyTrotDefense from './TurkeyTrotDefense'
// Old monolithic component (kept for reference)
// import TurkeyTrotDefensePhase5 from './TurkeyTrotDefensePhase5'

ReactDOM.createRoot(document.getElementById('root')).render(
  <TurkeyTrotDefense />
)
