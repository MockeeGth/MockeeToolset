import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import './App.css'
import Home from './pages/Home'
import Canny from './pages/Canny'
import FluxUpscale from './pages/FluxUpscale'
import FluxGenerate from './pages/FluxGenerate'
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
        <button 
          className="settings-button"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Settings"
        >
          <img src="/setting.png" width="20" height="20" alt="Settings" />
        </button>
      </header>
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/canny" element={<Canny />} />
        <Route path="/flux-upscale" element={<FluxUpscale />} />
        <Route path="/flux-generate" element={<FluxGenerate />} />
      </Routes>
      
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  )
}

export default App
