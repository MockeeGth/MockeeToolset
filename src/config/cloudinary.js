// Server API base URL
export const SERVER_API_URL = 'http://localhost:3001'

// Helper function to generate Cloudinary URL (using public cloud name)
export const getCloudinaryUrl = (publicId, transformations = '') => {
  const baseUrl = 'https://res.cloudinary.com/dv6brx5oe/image/upload'
  return transformations ? `${baseUrl}/${transformations}/${publicId}` : `${baseUrl}/${publicId}`
}