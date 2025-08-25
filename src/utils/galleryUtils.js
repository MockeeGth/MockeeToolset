// Gallery utilities for managing image storage
const STORAGE_KEY = 'gallery-images'
const MAX_IMAGES = 100

export const galleryUtils = {
  // Get all images from storage
  getAllImages: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Error loading gallery images:', error)
      return []
    }
  },

  // Add a new image to gallery
  addImage: (imageData) => {
    try {
      const images = galleryUtils.getAllImages()
      
      // Create image object with required fields
      const newImage = {
        id: imageData.id || `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: imageData.url,
        filename: imageData.filename || imageData.name,
        type: imageData.type || 'uploaded', // 'uploaded' or 'generated'
        tool: imageData.tool, // 'Canny', 'FluxGenerate', etc.
        prompt: imageData.prompt, // for generated images
        timestamp: imageData.timestamp || Date.now(),
        size: imageData.size,
        cloudinaryUrl: imageData.cloudinaryUrl || imageData.url
      }

      // Add to beginning of array and limit to MAX_IMAGES
      const updatedImages = [newImage, ...images].slice(0, MAX_IMAGES)
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedImages))
      return updatedImages
    } catch (error) {
      console.error('Error adding image to gallery:', error)
      return galleryUtils.getAllImages()
    }
  },

  // Add multiple images at once
  addImages: (imageDataArray) => {
    try {
      const images = galleryUtils.getAllImages()
      
      const newImages = imageDataArray.map(imageData => ({
        id: imageData.id || `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: imageData.url,
        filename: imageData.filename || imageData.name,
        type: imageData.type || 'uploaded',
        tool: imageData.tool,
        prompt: imageData.prompt,
        timestamp: imageData.timestamp || Date.now(),
        size: imageData.size,
        cloudinaryUrl: imageData.cloudinaryUrl || imageData.url
      }))

      // Add new images to beginning and limit total
      const updatedImages = [...newImages, ...images].slice(0, MAX_IMAGES)
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedImages))
      return updatedImages
    } catch (error) {
      console.error('Error adding images to gallery:', error)
      return galleryUtils.getAllImages()
    }
  },

  // Remove a specific image
  removeImage: (imageId) => {
    try {
      const images = galleryUtils.getAllImages()
      const filteredImages = images.filter(img => img.id !== imageId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredImages))
      return filteredImages
    } catch (error) {
      console.error('Error removing image from gallery:', error)
      return galleryUtils.getAllImages()
    }
  },

  // Clear all images
  clearAll: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      return []
    } catch (error) {
      console.error('Error clearing gallery:', error)
      return []
    }
  },

  // Get images by type
  getImagesByType: (type) => {
    const images = galleryUtils.getAllImages()
    return images.filter(img => img.type === type)
  },

  // Get images by tool
  getImagesByTool: (tool) => {
    const images = galleryUtils.getAllImages()
    return images.filter(img => img.tool === tool)
  },

  // Check if gallery has space for more images
  hasSpace: () => {
    const images = galleryUtils.getAllImages()
    return images.length < MAX_IMAGES
  },

  // Get gallery stats
  getStats: () => {
    const images = galleryUtils.getAllImages()
    const uploaded = images.filter(img => img.type === 'uploaded').length
    const generated = images.filter(img => img.type === 'generated').length
    
    return {
      total: images.length,
      uploaded,
      generated,
      available: MAX_IMAGES - images.length
    }
  }
}