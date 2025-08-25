import { useState, useEffect } from 'react'
import { promptUtils } from '../utils/promptUtils'
import './PromptInput.css'

const PromptInput = ({ 
  value, 
  onChange, 
  placeholder = "Enter your prompt here", 
  label = "Prompt for AI Processing",
  rows = 6,
  autoLoadLast = true 
}) => {
  const [showSavedPrompts, setShowSavedPrompts] = useState(false)
  const [savedPrompts, setSavedPrompts] = useState([])

  // Load saved prompts on mount
  useEffect(() => {
    const prompts = promptUtils.loadSavedPrompts()
    setSavedPrompts(prompts)
    
    // Auto-load last prompt if enabled and no current value
    if (autoLoadLast && !value && prompts.length > 0) {
      onChange(prompts[0])
    }
  }, [])

  const handleSavePrompt = () => {
    if (!value || !value.trim()) return
    
    const newPrompts = promptUtils.savePrompt(value)
    setSavedPrompts(newPrompts)
  }

  const handleSelectPrompt = (selectedPrompt) => {
    onChange(selectedPrompt)
    setShowSavedPrompts(false)
  }

  return (
    <div className="prompt-input-section">
      <div className="prompt-input-header">
        <label className="prompt-input-label">
          {label}
        </label>
        <div className="prompt-input-buttons">
          <button
            type="button"
            className="saved-prompts-button"
            onClick={() => setShowSavedPrompts(!showSavedPrompts)}
            title="View saved prompts"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
              <polyline points="9,9 9,15"/>
              <polyline points="15,9 15,15"/>
            </svg>
            Saved ({savedPrompts.length})
          </button>
          <button
            type="button"
            className="save-prompt-button"
            onClick={handleSavePrompt}
            disabled={!value || !value.trim()}
            title="Save current prompt"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17,21 17,13 7,13 7,21"/>
              <polyline points="7,3 7,8 15,8"/>
            </svg>
            Save
          </button>
        </div>
      </div>
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="prompt-textarea"
        rows={rows}
      />
      
      {showSavedPrompts && savedPrompts.length > 0 && (
        <div className="saved-prompts-popup">
          <div className="saved-prompts-header">
            <h4>Saved Prompts</h4>
            <button
              type="button"
              className="close-popup-button"
              onClick={() => setShowSavedPrompts(false)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="saved-prompts-list">
            {savedPrompts.map((savedPrompt, index) => (
              <div
                key={index}
                className="saved-prompt-item"
                onClick={() => handleSelectPrompt(savedPrompt)}
              >
                <span className="saved-prompt-text">
                  {savedPrompt.length > 80 ? `${savedPrompt.substring(0, 80)}...` : savedPrompt}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PromptInput