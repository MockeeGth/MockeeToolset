import { Link } from 'react-router-dom'

function Home() {
  return (
    <main className="main">
      <h2 className="choose-tool-text">Choose your tool</h2>
      <div className="tools-grid">
        <Link to="/canny" className="tool-card">
          <div className="tool-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"/>
              <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
            </svg>
          </div>
          <h3 className="tool-title">Canny</h3>
          <p className="tool-description">Upload and process images with edge detection</p>
        </Link>
        
        <Link to="/flux-upscale" className="tool-card">
          <div className="tool-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 3l-6 6-4-4-6 6"/>
              <path d="M21 9v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
            </svg>
          </div>
          <h3 className="tool-title">Flux 2x Upscale</h3>
          <p className="tool-description">Upscale images using AI</p>
        </Link>
        
        <Link to="/flux-generate" className="tool-card">
          <div className="tool-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <h3 className="tool-title">Flux Generate</h3>
          <p className="tool-description">Generate images with AI</p>
        </Link>
        
        <Link to="/gallery" className="tool-card">
          <div className="tool-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </div>
          <h3 className="tool-title">Gallery</h3>
          <p className="tool-description">View and download your generated images</p>
        </Link>
      </div>
    </main>
  )
}

export default Home