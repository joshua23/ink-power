import React, { useState, useEffect } from 'react';
import InkRenderer from './components/InkRenderer';
import GlassFrame from './components/GlassFrame';
import Controls from './components/Controls';
import { RenderState } from './types';
// import { generateHighResImage } from './services/geminiService'; 

// Placeholder images for demo purposes
// In a real app, 'new' image would come from the API.
const DEFAULT_OLD = "https://picsum.photos/seed/inkold/800/1000?grayscale&blur=2"; // Simulate low quality
const DEFAULT_NEW = "https://picsum.photos/seed/inkold/800/1000"; // High quality

const App: React.FC = () => {
  const [renderState, setRenderState] = useState<RenderState>(RenderState.IDLE);
  const [sliderPos, setSliderPos] = useState(0.5);
  
  // Image sources
  const [imageOld, setImageOld] = useState<string>(DEFAULT_OLD);
  const [imageNew, setImageNew] = useState<string>(DEFAULT_NEW);
  
  // Aspect Ratio (Default to 0.8 for the placeholder 800x1000)
  const [aspectRatio, setAspectRatio] = useState<number>(0.8);

  // File handling
  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      
      // Load image to calculate aspect ratio and prevent distortion
      const img = new Image();
      img.onload = () => {
        setAspectRatio(img.width / img.height);
        setImageOld(src);
        // For demo, we just duplicate it as "new" until generated, 
        // but maybe blur the 'old' one in the shader to simulate low-res.
        setImageNew(src); 
        setRenderState(RenderState.IDLE);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    // 1. Enter Breathing State (Wait Time)
    setRenderState(RenderState.BREATHING);
    
    // 2. Simulate API Call delay (or call actual API)
    // The "Ink Breathing" happens here.
    
    try {
      // In a real implementation: 
      // const highResUrl = await generateHighResImage("Enhance", imageOld);
      // setImageNew(highResUrl);
      
      // Simulate network delay for effect
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Swap to a "better" image for the demo effect (using picsum with different seed/params if it were real)
      // Since we can't easily get a "better version" of a user upload without a real backend,
      // We will apply a visual trick or if using the default, swap to the high-res version.
      if (imageOld === DEFAULT_OLD) {
         setImageNew(DEFAULT_NEW);
      } else {
         // If user uploaded, we just keep the same image for the demo
         // but the shader will still show the "Crystal" transition effect
         // implying it "solidified". Ideally, the API returns the enhanced version.
         setImageNew(imageOld); 
      }

      // 3. Liquid Crystallization (Transition)
      setRenderState(RenderState.CRYSTALLIZING);

      // 4. After transition animation finishes, enable interaction
      setTimeout(() => {
        setRenderState(RenderState.INTERACTIVE);
      }, 1500); // 1.5s for the crystallization wave
      
    } catch (e) {
      console.error(e);
      setRenderState(RenderState.IDLE);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-4 selection:bg-white/20">
      
      {/* Header */}
      <header className="mb-8 text-center space-y-2">
        <h1 className="text-3xl md:text-5xl font-thin tracking-[0.2em] text-white uppercase opacity-90">
          Ink & Crystal
        </h1>
        <p className="text-white/40 text-xs tracking-widest uppercase">
          Industrial Grade Rendering
        </p>
      </header>

      {/* Main Display */}
      <main className="w-full max-w-4xl flex flex-col items-center">
        {/* 
          Wrapper to constrain size based on aspect ratio.
          If aspect ratio < 1 (Portrait), we assume we need to limit width so height doesn't exceed 75vh.
          Formula: MaxWidth = MaxHeight * AspectRatio
        */}
        <div 
          className="w-full transition-all duration-500"
          style={{ 
            maxWidth: aspectRatio < 1 ? `calc(75vh * ${aspectRatio})` : '100%' 
          }}
        >
          <GlassFrame 
            renderState={renderState} 
            sliderPos={sliderPos}
            onSliderChange={setSliderPos}
            aspectRatio={aspectRatio}
          >
            <InkRenderer 
              imageOldSrc={imageOld}
              imageNewSrc={imageNew}
              renderState={renderState}
              sliderPos={sliderPos}
            />
          </GlassFrame>
        </div>

        {/* Controls */}
        <Controls 
          isProcessing={renderState === RenderState.BREATHING || renderState === RenderState.CRYSTALLIZING}
          onUpload={handleUpload}
          onGenerate={handleGenerate}
          hasImage={!!imageOld}
        />
      </main>

      {/* Footer */}
      <footer className="mt-16 text-white/20 text-xs">
        <p>Powered by GLSL Shaders & React</p>
      </footer>
    </div>
  );
};

export default App;