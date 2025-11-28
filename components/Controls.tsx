import React, { useRef } from 'react';

interface ControlsProps {
  isProcessing: boolean;
  onUpload: (file: File) => void;
  onGenerate: () => void;
  hasImage: boolean;
}

const Controls: React.FC<ControlsProps> = ({ isProcessing, onUpload, onGenerate, hasImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto mt-8 z-20 relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />
      
      {!hasImage ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group relative px-6 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm overflow-hidden"
        >
          <span className="relative z-10 text-white font-light tracking-wider uppercase text-sm">
            Upload Image
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>
      ) : (
        <div className="flex gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex-1 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors text-sm uppercase tracking-wide disabled:opacity-30"
          >
            Replace
          </button>
          <button
            onClick={onGenerate}
            disabled={isProcessing}
            className="flex-1 group relative px-6 py-4 rounded-xl bg-white text-black font-semibold uppercase tracking-wide overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all duration-300 disabled:opacity-50 disabled:shadow-none"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing
                </>
              ) : (
                'Enhance'
              )}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Controls;
