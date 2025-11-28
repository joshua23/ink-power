import React, { ReactNode } from 'react';
import { RenderState } from '../types';

interface GlassFrameProps {
  children: ReactNode;
  renderState: RenderState;
  sliderPos: number;
  onSliderChange: (val: number) => void;
  aspectRatio?: number;
}

const GlassFrame: React.FC<GlassFrameProps> = ({ children, renderState, sliderPos, onSliderChange, aspectRatio = 0.8 }) => {
  const isInteractive = renderState === RenderState.INTERACTIVE;
  const isCrystallizing = renderState === RenderState.CRYSTALLIZING;

  // Handle touch/mouse move for slider
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isInteractive) return;
    
    // Get container dimensions
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    
    // Calculate X position
    let clientX;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }
    
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = x / rect.width;
    
    onSliderChange(percent);
  };

  return (
    <div 
      className={`relative w-full mx-auto rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ${isCrystallizing || isInteractive ? 'animate-rim-flash' : ''}`}
      style={{ 
        boxShadow: isInteractive ? '0 0 40px -10px rgba(255, 255, 255, 0.1)' : 'none',
        aspectRatio: aspectRatio,
        maxHeight: '75vh' // Safety cap for very tall images
      }}
    >
      {/* Background (Obsidian) */}
      <div className="absolute inset-0 bg-obsidian z-0" />

      {/* The Render Content */}
      <div className="absolute inset-0 z-10">
        {children}
      </div>

      {/* Interactive Layer (for slider events) */}
      <div 
        className={`absolute inset-0 z-30 ${isInteractive ? 'cursor-ew-resize' : 'pointer-events-none'}`}
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        onClick={handleMove}
      />

      {/* Decorative Glass Overlay (Pointer events none) */}
      <div className="absolute inset-0 z-20 pointer-events-none rounded-2xl border border-white/10">
        {/* Inner Gloss Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/40 opacity-60 mix-blend-overlay" />
        
        {/* Slider Handle Visual (Only visible when interactive) */}
        {isInteractive && (
          <div 
            className="absolute top-0 bottom-0 w-px bg-white/30 shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-transform duration-75 ease-out"
            style={{ 
              left: `${sliderPos * 100}%`,
              transform: 'translateX(-50%)' 
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-white/30 bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg">
              <div className="w-1 h-4 bg-white/50 rounded-full" />
            </div>
          </div>
        )}
      </div>
      
      {/* Status Text Overlay */}
      <div className="absolute top-6 left-6 z-20 mix-blend-difference pointer-events-none">
        <h1 className="text-white font-bold tracking-widest uppercase text-xs opacity-50">
          {renderState === RenderState.IDLE && 'Ready to Render'}
          {renderState === RenderState.BREATHING && 'Ink Breathing...'}
          {renderState === RenderState.CRYSTALLIZING && 'Crystallizing...'}
        </h1>
      </div>
    </div>
  );
};

export default GlassFrame;