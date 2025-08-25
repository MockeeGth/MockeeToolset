// Shared prompt management utilities
const STORAGE_KEY = 'saved-prompts'
const MAX_PROMPTS = 10

export const promptUtils = {
  // Load saved prompts from localStorage
  loadSavedPrompts: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Error loading saved prompts:', error)
      return []
    }
  },

  // Save a new prompt (adds to beginning, removes duplicates, limits to MAX_PROMPTS)
  savePrompt: (promptText) => {
    if (!promptText || !promptText.trim()) return []
    
    try {
      const prompts = promptUtils.loadSavedPrompts()
      const cleanedPrompt = promptText.trim()
      
      // Remove existing instance of this prompt and add to beginning
      const newPrompts = [cleanedPrompt, ...prompts.filter(p => p !== cleanedPrompt)]
        .slice(0, MAX_PROMPTS)
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrompts))
      return newPrompts
    } catch (error) {
      console.error('Error saving prompt:', error)
      return promptUtils.loadSavedPrompts()
    }
  },

  // Get the most recent prompt (for default loading)
  getLastPrompt: () => {
    const prompts = promptUtils.loadSavedPrompts()
    return prompts.length > 0 ? prompts[0] : ''
  },

  // Clear all saved prompts
  clearAllPrompts: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      return []
    } catch (error) {
      console.error('Error clearing prompts:', error)
      return []
    }
  }
}