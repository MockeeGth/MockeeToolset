# Netlify Deployment Fixes for API Functions

This document outlines the solutions to common issues encountered when deploying serverless functions to Netlify, specifically for API proxying functionality.

## Problem Summary

The main issue was that the Netlify serverless function for API proxying was returning 404/502 errors in production, while working fine in development. The function handles requests to the Replicate API for AI image generation.

## Root Causes and Solutions

### 1. Node-fetch Compatibility Issues

**Problem**: Node-fetch v3+ uses ES modules and cannot be imported with `require()` in Netlify functions.

**Error Message**:
```
Error [ERR_REQUIRE_ESM]: require() of ES Module /var/task/node_modules/node-fetch/src/index.js from /var/task/netlify/functions/api.js not supported.
```

**Solution**: Replace node-fetch with axios, which has better CommonJS compatibility.

```javascript
// Before (problematic)
const fetch = require('node-fetch')

// After (working)
const axios = require('axios')
```

**HTTP Request Changes**:
```javascript
// Before (fetch)
const response = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
})
const data = await response.json()

// After (axios)
const response = await axios.post('https://api.replicate.com/v1/predictions', requestBody, {
  headers: {
    'Authorization': `Token ${apiKey}`,
    'Content-Type': 'application/json'
  }
})
const data = response.data
```

### 2. Dependency Management

**Problem**: Netlify functions with separate `package.json` files don't automatically install dependencies.

**Error Message**:
```
A Netlify Function is using "axios" but that dependency has not been installed yet.
```

**Solutions** (choose one):

**Option A**: Add dependencies to main `package.json` (recommended)
```json
{
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

**Option B**: Add plugin to `netlify.toml`
```toml
[[plugins]]
package = "@netlify/plugin-functions-install-core"
```

**Option C**: Manually install in build command
```toml
[build]
command = "npm ci && npm run build && cd netlify/functions && npm install"
```

### 3. Path Handling in Netlify Functions

**Problem**: Incorrect path parsing caused the function to not match the expected routes.

**Netlify Redirect Configuration**:
```toml
[[redirects]]
from = "/api/*"
to = "/.netlify/functions/api/:splat"
status = 200
```

**Path Processing**:
```javascript
// The function receives: /api/replicate/predictions
// After redirect it becomes: /.netlify/functions/api/replicate/predictions

// Correct path cleaning
const path = event.path.replace('/.netlify/functions/api/', '').replace('/.netlify/functions/api', '')
// Result: replicate/predictions

// Route matching
if (path.includes('replicate/predictions')) {
  // Handle the request
}
```

### 4. Package Lock Synchronization

**Problem**: `npm ci` fails when `package-lock.json` is out of sync with `package.json`.

**Error Message**:
```
`npm ci` can only install packages when your package.json and package-lock.json are in sync.
Missing: axios@1.11.0 from lock file
```

**Solution**: Always run `npm install` locally after changing dependencies, then commit the updated `package-lock.json`.

```bash
npm install
git add package-lock.json
git commit -m "Update package-lock.json for new dependencies"
```

## Complete Working Function Structure

```javascript
const axios = require('axios')

exports.handler = async (event, context) => {
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
  
  try {
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
      
      if (event.httpMethod === 'GET') {
        const pathParts = path.split('/')
        const predictionId = pathParts[pathParts.length - 1]
        const apiKey = event.queryStringParameters.apiKey
        
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
```

## File Structure

```
project-root/
├── package.json (includes axios in dependencies)
├── package-lock.json (synchronized)
├── netlify.toml (with correct redirects)
└── netlify/
    └── functions/
        └── api.js (no separate package.json needed)
```

## Debugging Tips

1. **Add logging** to understand what paths and parameters the function receives:
   ```javascript
   console.log('Function called with path:', event.path)
   console.log('Function called with method:', event.httpMethod)
   console.log('Processed path:', path)
   ```

2. **Check Netlify function logs** in the dashboard under Functions tab

3. **Test the redirect** by visiting `https://your-site.netlify.app/.netlify/functions/api` directly

4. **Use browser dev tools** to inspect the exact URLs being called and response codes

## Prevention Checklist

- [ ] Use axios instead of node-fetch for HTTP requests in Netlify functions
- [ ] Add HTTP client dependencies to main package.json, not function-specific ones
- [ ] Always run `npm install` locally after changing dependencies
- [ ] Commit updated package-lock.json files
- [ ] Test API routes with proper path handling
- [ ] Add comprehensive error logging
- [ ] Verify CORS headers are properly set
- [ ] Test both development and production environments

### 5. Missing Cloudinary Upload Functionality

**Problem**: Canny tool was failing with 404 errors because the Netlify function had only a placeholder for the Cloudinary upload endpoint.

**Error Message**:
```
Failed to load resource: the server responded with a status of 404 ()
Cloudinary upload error: Object
Processing failed: Error: Upload failed: Not found
```

**Root Cause**: The Netlify function at `netlify/functions/api.js` only had a placeholder return for the Cloudinary endpoint:
```javascript
// Before (placeholder only)
if (path === '/cloudinary/upload' && event.httpMethod === 'POST') {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Cloudinary upload endpoint' })
  }
}
```

**Solution**: Implement the full Cloudinary upload functionality in the Netlify function, including:
- Proper multipart form data parsing
- Cloudinary API signature generation
- File upload to Cloudinary

**Required Dependencies**:
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "form-data": "^4.0.4"
  }
}
```

**Complete Cloudinary Implementation**:
```javascript
// Cloudinary configuration
const CLOUDINARY_CONFIG = {
  cloudName: 'dv6brx5oe',
  apiKey: '554749169912342',
  apiSecret: '2WmK9gOQWW2dETw9206jpsJW_Cw'
}

// Cloudinary upload proxy
if (path === 'cloudinary/upload' && event.httpMethod === 'POST') {
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

    const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
    
    // Extract file content
    const contentTypeMatch = body.toString().match(/Content-Type:\s*([^\r\n]+)/i)
    const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/jpeg'
    
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
    formData.append('file', fileData, {
      filename: 'uploaded_file',
      contentType: contentType
    })
    
    // Generate timestamp and signature
    const timestamp = Math.round(new Date().getTime() / 1000)
    formData.append('timestamp', timestamp)
    
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
```

**Important Notes**:
- The path matching uses `'cloudinary/upload'` (without leading slash) because the path processing removes the function prefix
- Multipart form data parsing in serverless functions requires careful handling of binary data
- Both `form-data` and `crypto` packages must be available in the main `package.json`

## Related Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Axios Documentation](https://axios-http.com/docs/intro)
- [Netlify Redirects](https://docs.netlify.com/routing/redirects/)
- [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference)