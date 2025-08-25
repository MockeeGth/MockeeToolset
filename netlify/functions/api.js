// Netlify Function for API proxying
exports.handler = async (event, context) => {
  const fetch = (await import('node-fetch')).default;
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

  const path = event.path.replace('/.netlify/functions/api', '')
  
  try {
    // Replicate predictions proxy
    if (path.startsWith('/replicate/predictions')) {
      if (event.httpMethod === 'POST') {
        const { apiKey, model, input } = JSON.parse(event.body)
        
        const requestBody = {
          version: model,
          input: input
        }
        
        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })

        const data = await response.json()
        
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify(data)
        }
      }
      
      // GET request for prediction status
      if (event.httpMethod === 'GET') {
        const predictionId = path.split('/').pop()
        const apiKey = event.queryStringParameters.apiKey
        
        const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()
        
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify(data)
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}