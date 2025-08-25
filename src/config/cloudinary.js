// Server API base URL - dynamically set based on environment
export const SERVER_API_URL = process.env.NODE_ENV === 'production' 
  ? '' // Use relative URLs in production (Netlify functions)
  : 'http://localhost:3001' // Use local server in development

// Helper function to generate Cloudinary URL (using public cloud name)
export const getCloudinaryUrl = (publicId, transformations = '') => {
  const baseUrl = 'https://res.cloudinary.com/dv6brx5oe/image/upload'
  return transformations ? `${baseUrl}/${transformations}/${publicId}` : `${baseUrl}/${publicId}`
}