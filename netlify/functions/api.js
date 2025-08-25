// Netlify Function for API proxying - updated to use axios
const axios = require('axios')

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

  const path = event.path.replace('/.netlify/functions/api/', '').replace('/.netlify/functions/api', '')
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
    
    // Cloudinary upload proxy (placeholder)
    if (path === '/cloudinary/upload' && event.httpMethod === 'POST') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Cloudinary upload endpoint' })
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