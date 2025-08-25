import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { galleryUtils } from '../utils/galleryUtils'
import './Gallery.css'

function Gallery() {
  const [images, setImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [filter, setFilter] = useState('all') // all, uploaded, generated

  useEffect(() => {
    const savedImages = galleryUtils.getAllImages()
    setImages(savedImages)
  }, [])

  const filteredImages = images.filter(image => {
    if (filter === 'all') return true
    return image.type === filter
  })

  const downloadImage = async (image) => {
    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = image.filename || `image-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading image:', error)
      alert('Failed to download image')
    }
  }

  const deleteImage = (imageId) => {
    if (confirm('Are you sure you want to delete this image from the gallery?')) {
      galleryUtils.removeImage(imageId)
      setImages(images.filter(img => img.id !== imageId))
      setSelectedImage(null)
    }
  }

  const clearAllImages = () => {
    if (confirm('Are you sure you want to clear the entire gallery? This cannot be undone.')) {
      galleryUtils.clearAll()
      setImages([])
      setSelectedImage(null)
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <main className="gallery-page">
      <div className="gallery-header">
        <div className="header-left">
          <Link to="/" className="back-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </Link>
          <h1 className="gallery-title">Gallery</h1>
          <span className="image-count">({filteredImages.length} images)</span>
        </div>
        <div className="header-right">
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-btn ${filter === 'uploaded' ? 'active' : ''}`}
              onClick={() => setFilter('uploaded')}
            >
              Uploaded
            </button>
            <button 
              className={`filter-btn ${filter === 'generated' ? 'active' : ''}`}
              onClick={() => setFilter('generated')}
            >
              Generated
            </button>
          </div>
          {images.length > 0 && (
            <button 
              className="clear-button"
              onClick={clearAllImages}
              title="Clear all images"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              Clear All
            </button>
          )}
        </div>
      </div>

      {filteredImages.length === 0 ? (
        <div className="empty-gallery">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </div>
          <h2>No images in gallery</h2>
          <p>Images you upload or generate will appear here</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {filteredImages.map(image => (
            <div 
              key={image.id} 
              className="gallery-item"
              onClick={() => setSelectedImage(image)}
            >
              <div className="image-container">
                <img 
                  src={image.url} 
                  alt={image.filename || 'Gallery image'} 
                  loading="lazy"
                />
                <div className="image-overlay">
                  <div className="image-type">{image.type}</div>
                  <div className="image-actions">
                    <button
                      className="action-btn download-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadImage(image)
                      }}
                      title="Download image"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteImage(image.id)
                      }}
                      title="Delete image"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <div className="image-info">
                <div className="image-filename">{image.filename || 'Untitled'}</div>
                <div className="image-date">{formatDate(image.timestamp)}</div>
                {image.tool && <div className="image-tool">from {image.tool}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div className="image-modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedImage.filename || 'Untitled'}</h3>
              <button 
                className="close-modal-btn"
                onClick={() => setSelectedImage(null)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-image">
              <img src={selectedImage.url} alt={selectedImage.filename || 'Gallery image'} />
            </div>
            <div className="modal-info">
              <div className="info-row">
                <span>Type:</span> {selectedImage.type}
              </div>
              <div className="info-row">
                <span>Date:</span> {formatDate(selectedImage.timestamp)}
              </div>
              {selectedImage.tool && (
                <div className="info-row">
                  <span>Tool:</span> {selectedImage.tool}
                </div>
              )}
              {selectedImage.prompt && (
                <div className="info-row">
                  <span>Prompt:</span> {selectedImage.prompt}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn download-btn"
                onClick={() => downloadImage(selectedImage)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </button>
              <button
                className="modal-btn delete-btn"
                onClick={() => deleteImage(selectedImage.id)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default Gallery