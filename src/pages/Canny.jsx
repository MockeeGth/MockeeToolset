import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { SERVER_API_URL } from '../config/cloudinary'
import JSZip from 'jszip'
import PromptInput from '../components/PromptInput'
import { galleryUtils } from '../utils/galleryUtils'
import { promptUtils } from '../utils/promptUtils'
import './Canny.css'

function Canny() {
  const [uploadedImages, setUploadedImages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [generationsPerImage, setGenerationsPerImage] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState({})
  const [processingCanceled, setProcessingCanceled] = useState(false)
  const cancelRef = useRef(false)

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files)
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const newImage = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            preview: e.target.result,
            file: file,
            cloudinaryUrl: null,
            processedUrls: [],
            status: 'pending' // pending, uploading, uploaded, processing, processed, error
          }
          
          // Save uploaded image to gallery
          galleryUtils.addImage({
            id: newImage.id,
            url: e.target.result,
            filename: file.name,
            type: 'uploaded',
            tool: 'Canny',
            size: file.size,
            timestamp: Date.now()
          })
          
          setUploadedImages(prev => [...prev, newImage])
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const removeImage = (id) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id))
    // Remove from current index state
    setCurrentImageIndex(prev => {
      const newState = { ...prev }
      delete newState[id]
      return newState
    })
  }

  const navigateProcessedImage = (imageId, direction) => {
    const image = uploadedImages.find(img => img.id === imageId)
    if (!image || image.processedUrls.length <= 1) return

    const currentIndex = currentImageIndex[imageId] || 0
    let newIndex

    if (direction === 'next') {
      newIndex = (currentIndex + 1) % image.processedUrls.length
    } else {
      newIndex = currentIndex === 0 ? image.processedUrls.length - 1 : currentIndex - 1
    }

    setCurrentImageIndex(prev => ({
      ...prev,
      [imageId]: newIndex
    }))
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const uploadToCloudinary = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${SERVER_API_URL}/api/cloudinary/upload`, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Cloudinary upload error:', errorData)
      throw new Error(`Upload failed: ${errorData.error || 'Unknown error'}`)
    }
    
    return response.json()
  }

  const processWithReplicate = async (imageUrl, prompt) => {
    const replicateApiKey = localStorage.getItem('replicate-api-key')
    if (!replicateApiKey) {
      throw new Error('Replicate API key not found. Please set it in Settings.')
    }

    // Create prediction through proxy server
    const predictionResponse = await fetch(`${SERVER_API_URL}/api/replicate/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: replicateApiKey,
        model: 'black-forest-labs/flux-canny-dev:aeb2a8dbfe2580e25d41d8881cc1df1a0b1e52c87de99c1a65fc587ac3918179',
        input: {
          control_image: imageUrl,
          prompt: prompt,
          output_format: 'jpg',
          guidance: 30,
          num_inference_steps: 28,
          num_outputs: 1,
          megapixels: '1'
        }
      })
    })

    if (!predictionResponse.ok) {
      const errorData = await predictionResponse.json()
      throw new Error(`Failed to create prediction: ${errorData.error || 'Unknown error'}`)
    }

    const prediction = await predictionResponse.json()
    
    // Poll for completion
    return await pollPrediction(prediction.id, replicateApiKey)
  }

  const pollPrediction = async (predictionId, apiKey) => {
    const maxAttempts = 60 // 5 minutes max
    let attempts = 0

    while (attempts < maxAttempts) {
      const response = await fetch(`${SERVER_API_URL}/api/replicate/predictions/${predictionId}?apiKey=${apiKey}`)

      if (!response.ok) {
        throw new Error('Failed to get prediction status')
      }

      const prediction = await response.json()
      
      if (prediction.status === 'succeeded') {
        return prediction.output
      } else if (prediction.status === 'failed') {
        throw new Error('Prediction failed')
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++
    }

    throw new Error('Prediction timed out')
  }

  const cancelProcessing = () => {
    console.log('Canceling processing...')
    cancelRef.current = true
    setProcessingCanceled(true)
    setIsProcessing(false)
    
    // Reset any images that were in processing state back to pending
    setUploadedImages(prev => 
      prev.map(img => {
        if (img.status === 'processing' || img.status === 'uploading') {
          return { ...img, status: 'pending' }
        }
        return img
      })
    )
  }

  const handleProcess = async () => {
    if (uploadedImages.length === 0) return
    if (!prompt.trim()) {
      alert('Please enter a prompt before processing')
      return
    }
    
    // Auto-save prompt when processing starts
    promptUtils.autoSavePrompt(prompt)
    
    console.log('Starting processing...')
    setIsProcessing(true)
    setProcessingCanceled(false)
    cancelRef.current = false
    
    for (const image of uploadedImages) {
      if (cancelRef.current) {
        console.log('Processing canceled, breaking out of main loop')
        break
      }
      
      if (image.status === 'pending') {
        // Step 1: Upload to Cloudinary
        setUploadedImages(prev => 
          prev.map(img => 
            img.id === image.id 
              ? { ...img, status: 'uploading' }
              : img
          )
        )
        
        try {
          if (cancelRef.current) {
            console.log('Processing canceled during upload')
            break
          }
          
          const result = await uploadToCloudinary(image.file)
          
          // Update with Cloudinary URL
          setUploadedImages(prev => 
            prev.map(img => 
              img.id === image.id 
                ? { ...img, status: 'uploaded', cloudinaryUrl: result.secure_url }
                : img
            )
          )

          // Step 2: Process with Replicate (multiple generations)
          setUploadedImages(prev => 
            prev.map(img => 
              img.id === image.id 
                ? { ...img, status: 'processing' }
                : img
            )
          )

          const processedResults = []
          const numGenerations = generationsPerImage === '' ? 1 : parseInt(generationsPerImage) || 1
          for (let i = 0; i < numGenerations; i++) {
            if (cancelRef.current) {
              console.log(`Processing canceled during generation ${i + 1}`)
              break
            }
            
            console.log(`Processing generation ${i + 1} of ${numGenerations}`)
            const processedOutput = await processWithReplicate(result.secure_url, prompt)
            processedResults.push(processedOutput)
            
            // Save generated image to gallery
            galleryUtils.addImage({
              id: `${image.id}_gen_${i}`,
              url: processedOutput,
              filename: `${image.name.split('.')[0]}_generated_${i + 1}.jpg`,
              type: 'generated',
              tool: 'Canny',
              prompt: prompt,
              timestamp: Date.now()
            })
            
            // Update with partial results
            setUploadedImages(prev => 
              prev.map(img => 
                img.id === image.id 
                  ? { ...img, processedUrls: [...processedResults] }
                  : img
              )
            )
          }
          
          // Mark as completed (only if not canceled)
          if (!cancelRef.current) {
            setUploadedImages(prev => 
              prev.map(img => 
                img.id === image.id 
                  ? { ...img, status: 'processed' }
                  : img
              )
            )
          } else {
            console.log('Skipping completion marking due to cancellation')
          }
        } catch (error) {
          console.error('Processing failed:', error)
          
          // Update status to error
          setUploadedImages(prev => 
            prev.map(img => 
              img.id === image.id 
                ? { ...img, status: 'error' }
                : img
            )
          )
        }
      }
    }
    
    console.log('Processing finished or canceled')
    setIsProcessing(false)
  }

  const getFileNameWithoutExtension = (filename) => {
    return filename.substring(0, filename.lastIndexOf('.')) || filename
  }

  const downloadAllImages = async () => {
    const zip = new JSZip()
    
    // Filter images that have processed results
    const processedImages = uploadedImages.filter(img => img.processedUrls && img.processedUrls.length > 0)
    
    if (processedImages.length === 0) {
      alert('No processed images to download')
      return
    }

    try {
      // Download and add each processed image to the zip
      for (const image of processedImages) {
        const baseName = getFileNameWithoutExtension(image.name)
        
        for (let i = 0; i < image.processedUrls.length; i++) {
          const url = image.processedUrls[i]
          const filename = `${baseName}_gen${i + 1}.jpg`
          
          // Fetch the image as blob
          const response = await fetch(url)
          const blob = await response.blob()
          
          // Add to zip
          zip.file(filename, blob)
        }
      }
      
      // Generate and download the zip file
      const content = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = 'processed_images.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Error creating zip file:', error)
      alert('Error creating zip file')
    }
  }

  // Check if all images are processed
  const allImagesProcessed = uploadedImages.length > 0 && uploadedImages.every(img => img.status === 'processed')
  const hasProcessedImages = uploadedImages.some(img => img.processedUrls && img.processedUrls.length > 0)
  const canDownload = hasProcessedImages && !isProcessing

  return (
    <main className="tool-page">
      <div className="tool-header">
        <div className="header-left">
          <Link to="/" className="back-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </Link>
          <h1 className="tool-page-title">Canny Edge Detection</h1>
        </div>
        <div className="header-right">
          <button 
            className={`download-button ${canDownload ? 'active' : 'disabled'}`}
            onClick={downloadAllImages}
            disabled={!canDownload}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download All
          </button>
        </div>
      </div>

      <div className="two-column-layout">
        <div className="left-column">
          <div className="upload-section">
            <div className="upload-area">
              <input
                type="file"
                id="image-upload"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="upload-input"
              />
              <label htmlFor="image-upload" className="upload-label">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Click to upload images or drag & drop</span>
                <p>Support for PNG, JPG, JPEG, GIF, WebP</p>
              </label>
            </div>
            
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              placeholder="Enter your prompt here (e.g., 'a futuristic robot in a cyberpunk city')"
              label="Prompt for AI Processing"
            />
            
            <div className="generations-section">
              <label htmlFor="generations-input" className="generations-label">
                Generations per Image
              </label>
              <input
                id="generations-input"
                type="text"
                value={generationsPerImage}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '')
                  setGenerationsPerImage(value === '' ? '' : parseInt(value) || '')
                }}
                className="generations-input"
                placeholder="1"
              />
              <p className="generations-description">
                Number of AI generations to create for each uploaded image
              </p>
            </div>
            
            <button 
              className={`process-button ${isProcessing ? 'cancel-mode' : ''}`}
              onClick={isProcessing ? cancelProcessing : handleProcess}
              disabled={!isProcessing && uploadedImages.length === 0}
            >
              {isProcessing ? 'Cancel Processing' : 'Process'}
            </button>
          </div>
        </div>

        <div className="right-column">
          {uploadedImages.length > 0 && (
            <div className="images-section">
              <div className="images-list">
                {uploadedImages.map(image => (
                  <div key={image.id} className="image-item">
                    <button 
                      className="remove-button-corner"
                      onClick={() => removeImage(image.id)}
                      aria-label="Remove image"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                    <div className="image-comparison">
                      <div className="image-column">
                        <h4>Original</h4>
                        <div className="image-preview">
                          <img src={image.preview} alt={image.name} />
                        </div>
                      </div>
                      
                      <div className="image-column">
                        <h4>
                          Processed 
                          {image.processedUrls.length > 0 && (
                            <span className="image-counter">
                              ({(currentImageIndex[image.id] || 0) + 1}/{image.processedUrls.length})
                            </span>
                          )}
                        </h4>
                        <div className="processed-image-container">
                          {image.processedUrls.length > 0 ? (
                            <>
                              <div className="image-preview">
                                <img 
                                  src={image.processedUrls[currentImageIndex[image.id] || 0]} 
                                  alt={`Processed ${image.name} - ${(currentImageIndex[image.id] || 0) + 1}`} 
                                />
                              </div>
                              {image.processedUrls.length > 1 && (
                                <div className="image-navigation">
                                  <button 
                                    className="nav-button nav-prev"
                                    onClick={() => navigateProcessedImage(image.id, 'prev')}
                                    aria-label="Previous image"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M15 18l-6-6 6-6"/>
                                    </svg>
                                  </button>
                                  <button 
                                    className="nav-button nav-next"
                                    onClick={() => navigateProcessedImage(image.id, 'next')}
                                    aria-label="Next image"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M9 18l6-6-6-6"/>
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="image-preview">
                              <div className="placeholder">
                                {image.status === 'processing' ? 'Processing...' : 'Not processed yet'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="image-info">
                      <div className="image-details">
                        <h3 className="image-name">{image.name}</h3>
                        <p className="image-size">{formatFileSize(image.size)}</p>
                        <div className="image-status">
                          {image.status === 'pending' && <span className="status-pending">Ready to process</span>}
                          {image.status === 'uploading' && <span className="status-uploading">Uploading...</span>}
                          {image.status === 'uploaded' && <span className="status-uploaded">✓ Uploaded</span>}
                          {image.status === 'processing' && <span className="status-processing">🔄 Processing with AI...</span>}
                          {image.status === 'processed' && (
                            <span className="status-success">✓ Processed</span>
                          )}
                          {image.status === 'error' && <span className="status-error">✗ Processing failed</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default Canny