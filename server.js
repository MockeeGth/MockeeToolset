import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import crypto from 'crypto';
import multer from 'multer';
import FormData from 'form-data';

const app = express();
const PORT = 3001;

// Cloudinary configuration (move from frontend)
const CLOUDINARY_CONFIG = {
  cloudName: 'dv6brx5oe',
  apiKey: '554749169912342',
  apiSecret: '2WmK9gOQWW2dETw9206jpsJW_Cw'
};

// Configure multer for handling file uploads
const upload = multer();

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Proxy endpoint for Replicate predictions
app.post('/api/replicate/predictions', async (req, res) => {
  try {
    const { apiKey, model, input } = req.body;
    
    const requestBody = {
      version: model, // Use full model version string
      input: input
    };
    
    console.log('Sending request to Replicate:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Replicate API error:', data);
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error creating prediction:', error);
    res.status(500).json({ error: 'Failed to create prediction' });
  }
});

// Proxy endpoint for getting prediction status
app.get('/api/replicate/predictions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { apiKey } = req.query;
    
    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        'Authorization': `Token ${apiKey}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error getting prediction:', error);
    res.status(500).json({ error: 'Failed to get prediction' });
  }
});

// Cloudinary upload endpoint
app.post('/api/cloudinary/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Create form data for Cloudinary
    const formData = new FormData();
    
    // Add file buffer to form data
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    // Generate timestamp and signature
    const timestamp = Math.round(new Date().getTime() / 1000);
    formData.append('timestamp', timestamp);
    
    // Create signature string and generate SHA-1 hash
    const signatureString = `timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex');
    
    formData.append('signature', signature);
    formData.append('api_key', CLOUDINARY_CONFIG.apiKey);

    // Upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Cloudinary error:', data);
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});