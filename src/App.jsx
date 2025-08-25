import { Routes, Route, Link } from 'react-router-dom'
import { useState } from 'react'
import './App.css'
import Home from './pages/Home'
import Canny from './pages/Canny'
import FluxUpscale from './pages/FluxUpscale'
import FluxGenerate from './pages/FluxGenerate'
import Gallery from './pages/Gallery'
import SettingsModal from './components/SettingsModal'

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <img src="/logo.png" className="logo" alt="Mockee logo" />
          <h1 className="title">Mockee Mockup Toolset</h1>
        </div>
        <div className="header-right">
          <Link to="/gallery" className="gallery-button" aria-label="Gallery">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </Link>
          <button 
            className="settings-button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
          >
            <img src="/setting.png" width="20" height="20" alt="Settings" />
          </button>
        </div>
      </header>
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/canny" element={<Canny />} />
        <Route path="/flux-upscale" element={<FluxUpscale />} />
        <Route path="/flux-generate" element={<FluxGenerate />} />
        <Route path="/gallery" element={<Gallery />} />
      </Routes>
      
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  )
}

export default App
