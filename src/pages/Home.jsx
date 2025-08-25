import { Link } from 'react-router-dom'
import cannyIcon from '../assets/images/canny.jpg'
import upscaleIcon from '../assets/images/2x.jpg'
import generateIcon from '../assets/images/generate.jpg'

function Home() {
  return (
    <main className="main">
      <h2 className="choose-tool-text">Choose your tool</h2>
      <div className="tools-grid">
        <Link to="/canny" className="tool-card">
          <img src={cannyIcon} alt="Canny tool" className="tool-icon-image" />
          <div className="tool-overlay">Follow the shape</div>
        </Link>
        
        <Link to="/flux-upscale" className="tool-card">
          <img src={upscaleIcon} alt="Flux Upscale tool" className="tool-icon-image" />
          <div className="tool-overlay">2X Upscale</div>
        </Link>
        
        <Link to="/flux-generate" className="tool-card">
          <img src={generateIcon} alt="Flux Generate tool" className="tool-icon-image" />
          <div className="tool-overlay">Generate Image with Prompt</div>
        </Link>
      </div>
    </main>
  )
}

export default Home