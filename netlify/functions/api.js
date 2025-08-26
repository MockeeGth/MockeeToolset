// Netlify Function for API proxying - updated to use axios
const axios = require('axios')
const crypto = require('crypto')
const FormData = require('form-data')

// Cloudinary configuration
const CLOUDINARY_CONFIG = {
  cloudName: 'dv6brx5oe',
  apiKey: '554749169912342',
  apiSecret: '2WmK9gOQWW2dETw9206jpsJW_Cw'
}

exports.handler = async (event, context) => {
  console.log('Function called with path:', event.path)
  console.log('Function called with method:', event.httpMethod)
  console.log('Query string parameters:', event.queryStringParameters)
  console.log('Full event object keys:', Object.keys(event))
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  let path = event.path.replace('/.netlify/functions/api', '')
  // Remove leading slash if present
  if (path.startsWith('/')) {
    path = path.substring(1)
  }
  console.log('Processed path:', path)
  
  try {
    // Replicate predictions proxy
    if (path.includes('replicate/predictions')) {
      if (event.httpMethod === 'POST') {
        const { apiKey, model, input } = JSON.parse(event.body)
        
        const requestBody = {
          version: model,
          input: input
        }
        
        const response = await axios.post('https://api.replicate.com/v1/predictions', requestBody, {
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify(response.data)
        }
      }
      
      // GET request for prediction status
      if (event.httpMethod === 'GET') {
        const pathParts = path.split('/')
        const predictionId = pathParts[pathParts.length - 1]
        const apiKey = event.queryStringParameters.apiKey
        
        console.log('GET request - prediction ID:', predictionId)
        
        if (!predictionId || predictionId === 'undefined') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing prediction ID' })
          }
        }
        
        const response = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`, {
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify(response.data)
        }
      }
    }
    
    // Cloudinary upload proxy
    if (path === 'api/cloudinary/upload' && event.httpMethod === 'POST') {
      try {
        // Parse multipart form data from the body
        const boundary = event.headers['content-type']?.split('boundary=')[1]
        if (!boundary) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No boundary found in content-type' })
          }
        }

        // For simplicity, we'll extract the file from the event body
        // In a real scenario, you'd want to properly parse multipart data
        const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
        
        // Extract file content (this is a simplified approach)
        // In production, you'd use a proper multipart parser
        const contentTypeMatch = body.toString().match(/Content-Type:\s*([^\r\n]+)/i)
        const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/jpeg'
        
        // Find the actual file data after the headers
        const fileDataStart = body.indexOf('\r\n\r\n')
        if (fileDataStart === -1) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid multipart data' })
          }
        }
        
        const fileData = body.slice(fileDataStart + 4, body.lastIndexOf('\r\n--'))

        // Create form data for Cloudinary
        const formData = new FormData()
        
        // Add file buffer to form data
        formData.append('file', fileData, {
          filename: 'uploaded_file',
          contentType: contentType
        })
        
        // Generate timestamp and signature
        const timestamp = Math.round(new Date().getTime() / 1000)
        formData.append('timestamp', timestamp)
        
        // Create signature string and generate SHA-1 hash
        const signatureString = `timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`
        const signature = crypto.createHash('sha1').update(signatureString).digest('hex')
        
        formData.append('signature', signature)
        formData.append('api_key', CLOUDINARY_CONFIG.apiKey)

        // Upload to Cloudinary
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`
        const response = await axios.post(cloudinaryUrl, formData, {
          headers: {
            ...formData.getHeaders()
          }
        })
        
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify(response.data)
        }
      } catch (error) {
        console.error('Error uploading to Cloudinary:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to upload image' })
        }
      }
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    }
    
  } catch (error) {
    console.error('Function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}