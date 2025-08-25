import { useState, useEffect } from 'react'
import './SettingsModal.css'

function SettingsModal({ onClose }) {
  const [replicateApiKey, setReplicateApiKey] = useState('')

  useEffect(() => {
    const savedReplicateKey = localStorage.getItem('replicate-api-key')
    if (savedReplicateKey) setReplicateApiKey(savedReplicateKey)
  }, [])

  const handleSave = () => {
    localStorage.setItem('replicate-api-key', replicateApiKey)
    onClose()
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="settings-overlay" onClick={handleOverlayClick}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div className="settings-content">
          <div className="setting-group">
            <label htmlFor="replicate-api-key">Replicate API Key</label>
            <input
              id="replicate-api-key"
              type="password"
              value={replicateApiKey}
              onChange={(e) => setReplicateApiKey(e.target.value)}
              placeholder="Enter your Replicate API key"
              className="api-key-input"
            />
            <p className="setting-description">
              This key will be used for AI tools that require Replicate API access.
            </p>
          </div>
        </div>
        
        <div className="settings-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="save-button" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal