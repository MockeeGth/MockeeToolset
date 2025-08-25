import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { SERVER_API_URL } from '../config/cloudinary'
import JSZip from 'jszip'
import PromptInput from '../components/PromptInput'
import { galleryUtils } from '../utils/galleryUtils'
import { promptUtils } from '../utils/promptUtils'
import './Canny.css'

function FluxGenerate() {
  const [generatedImages, setGeneratedImages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [generationsPerImage, setGenerationsPerImage] = useState('')
  const [steps, setSteps] = useState(30)
  const [selectedModel, setSelectedModel] = useState('flux-dev')
  const [currentImageIndex, setCurrentImageIndex] = useState({})
  const [processingCanceled, setProcessingCanceled] = useState(false)
  const cancelRef = useRef(false)

  const removeImage = (id) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id))
    // Remove from current index state
    setCurrentImageIndex(prev => {
      const newState = { ...prev }
      delete newState[id]
      return newState
    })
  }

  const navigateProcessedImage = (imageId, direction) => {
    const image = generatedImages.find(img => img.id === imageId)
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

    // Model configurations
    const modelConfigs = {
      'flux-dev': {
        model: 'black-forest-labs/flux-dev:6e4a938f85952bdabcc15aa329178c4d681c52bf25a0342403287dc26944661d',
        input: {
          prompt: prompt,
          guidance: 3,
          num_outputs: 1,
          aspect_ratio: '1:1',
          megapixels: '1',
          num_inference_steps: steps,
          output_format: 'jpg',
          output_quality: 100
        }
      },
      'flux-pro-1.1': {
        model: 'black-forest-labs/flux-1.1-pro:80a09d66baa990429c2f5ae8a4306bf778a1b3775afd01cc2cc8bdbe9033769c',
        input: {
          prompt: prompt,
          aspect_ratio: '1:1',
          output_format: 'jpg',
          output_quality: 100,
          safety_tolerance: 2,
          prompt_upsampling: false
        }
      }
    }

    const config = modelConfigs[selectedModel]

    // Create prediction through proxy server
    const apiUrl = `${SERVER_API_URL}/api/replicate/predictions`
    console.log('Making API call to:', apiUrl)
    const predictionResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: replicateApiKey,
        model: config.model,
        input: config.input
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
    if (!prompt.trim()) {
      alert('Please enter a prompt before generating')
      return
    }
    
    // Auto-save prompt when generation starts
    promptUtils.autoSavePrompt(prompt)
    
    console.log('Starting generation...')
    setIsProcessing(true)
    setProcessingCanceled(false)
    cancelRef.current = false
    
    try {
      // Generate the specified number of images
      const numGenerations = generationsPerImage === '' ? 1 : parseInt(generationsPerImage) || 1
      for (let i = 0; i < numGenerations; i++) {
        if (cancelRef.current) {
          console.log(`Generation canceled during image ${i + 1}`)
          break
        }
        
        console.log(`Generating image ${i + 1} of ${numGenerations}`)
        
        // Create a new image entry for this generation
        const newImageId = Date.now() + Math.random() + i
        const newImage = {
          id: newImageId,
          name: `generated_${i + 1}.jpg`,
          prompt: prompt,
          processedUrls: [],
          status: 'generating'
        }
        
        // Add to generated images list
        setGeneratedImages(prev => [...prev, newImage])
        
        // Generate image with Replicate
        const generatedOutput = await processWithReplicate(null, prompt)
        
        // Save generated image to gallery
        galleryUtils.addImage({
          id: `flux_gen_${newImageId}`,
          url: generatedOutput,
          filename: `flux_generated_${Date.now()}.jpg`,
          type: 'generated',
          tool: 'FluxGenerate',
          prompt: prompt,
          timestamp: Date.now()
        })
        
        // Update with generated result
        setGeneratedImages(prev => 
          prev.map(img => 
            img.id === newImageId 
              ? { ...img, processedUrls: [generatedOutput], status: 'completed' }
              : img
          )
        )
      }
    } catch (error) {
      console.error('Generation failed:', error)
      alert(`Generation failed: ${error.message}`)
    }
    
    console.log('Processing finished or canceled')
    setIsProcessing(false)
  }

  const getFileNameWithoutExtension = (filename) => {
    return filename.substring(0, filename.lastIndexOf('.')) || filename
  }

  const downloadAllImages = async () => {
    const zip = new JSZip()
    
    // Filter images that have generated results
    const generatedImagesWithResults = generatedImages.filter(img => img.processedUrls && img.processedUrls.length > 0)
    
    if (generatedImagesWithResults.length === 0) {
      alert('No generated images to download')
      return
    }

    try {
      // Download and add each generated image to the zip
      for (const image of generatedImagesWithResults) {
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

  // Check if there are generated images
  const hasGeneratedImages = generatedImages.some(img => img.processedUrls && img.processedUrls.length > 0)
  const canDownload = hasGeneratedImages && !isProcessing

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
          <h1 className="tool-page-title">Flux Generate</h1>
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
          <div className="generation-section">
            <div className="model-selection-section">
              <label htmlFor="model-select" className="model-label">
                <strong>Model</strong>
              </label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="model-select"
              >
                <option value="flux-dev">FLUX Dev</option>
                <option value="flux-pro-1.1">FLUX Pro 1.1</option>
              </select>
            </div>
            
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              placeholder="Enter your prompt here (e.g., 'a futuristic robot in a cyberpunk city')"
              label="Prompt for AI Processing"
            />
            
            <div className="generations-section">
              <label htmlFor="generations-input" className="generations-label">
                Number of Images
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
                Number of images to generate from the prompt
              </p>
            </div>
            
            {selectedModel === 'flux-dev' && (
              <div className="steps-section">
                <label htmlFor="steps-input" className="steps-label">
                  <strong>Steps</strong>
                </label>
                <input
                  id="steps-input"
                  type="number"
                  value={steps}
                  onChange={(e) => setSteps(parseInt(e.target.value) || 30)}
                  min="1"
                  max="50"
                  className="steps-input"
                />
              </div>
            )}
            
            <button 
              className={`process-button ${isProcessing ? 'cancel-mode' : ''}`}
              onClick={isProcessing ? cancelProcessing : handleProcess}
              disabled={!isProcessing && !prompt.trim()}
            >
              {isProcessing ? 'Cancel Generation' : 'Generate'}
            </button>
          </div>
        </div>

        <div className="right-column">
          {generatedImages.length > 0 && (
            <div className="images-section">
              <div className="images-list">
                {generatedImages.map(image => (
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
                    <div className="generated-image-container">
                      <h4>Generated Image</h4>
                      <div className="image-preview">
                        {image.processedUrls.length > 0 ? (
                          <img 
                            src={image.processedUrls[0]} 
                            alt={`Generated: ${image.prompt}`} 
                          />
                        ) : (
                          <div className="placeholder">
                            {image.status === 'generating' ? 'Generating...' : 'Waiting to generate'}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="image-info">
                      <div className="image-details">
                        <h3 className="image-name">{image.name}</h3>
                        <p className="image-prompt">"{image.prompt}"</p>
                        <div className="image-status">
                          {image.status === 'generating' && <span className="status-processing">🔄 Generating with AI...</span>}
                          {image.status === 'completed' && (
                            <span className="status-success">✓ Generated</span>
                          )}
                          {image.status === 'error' && <span className="status-error">✗ Generation failed</span>}
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

export default FluxGenerate