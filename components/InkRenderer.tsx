import React, { useRef, useEffect } from 'react';
import { RenderState } from '../types';

interface InkRendererProps {
  imageOldSrc: string;
  imageNewSrc: string;
  renderState: RenderState;
  sliderPos: number; // 0.0 to 1.0
  className?: string;
}

// ------------------------------------------------------------------
// GLSL SHADERS
// ------------------------------------------------------------------

const vertexShaderSource = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    // Flip Y because WebGL texture coords are often flipped relative to images
    vUv.y = 1.0 - vUv.y; 
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  
  uniform sampler2D uTextureOld;
  uniform sampler2D uTextureNew;
  uniform float uTime;
  uniform float uSliderPos;
  uniform int uState; // 0: Breath, 1: Crystal, 2: Interactive
  uniform float uProgress; // For transition state (0->1)
  
  varying vec2 vUv;

  // Simple pseudo-random noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // 2D Noise function
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Fractal Brownian Motion for smoke/ink look
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 5; ++i) {
      v += a * noise(p);
      p = rot * p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    
    // --- STATE 0: BREATHING (INK LOADING) ---
    if (uState == 0) {
      // Fetch base image (low res/old)
      vec4 baseColor = texture2D(uTextureOld, uv);
      
      // Create breathing ink effect
      float timeScale = uTime * 0.8;
      float fog = fbm(uv * 3.0 + vec2(timeScale * 0.2, timeScale * 0.1));
      
      // Breathing pulsate
      float breath = sin(uTime * 2.0) * 0.1 + 0.9; 
      
      // Darken areas based on noise to simulate ink flowing
      float inkMask = smoothstep(0.3, 0.7, fog * breath);
      
      // Blur simulation (very cheap/fake blur by offsetting UVs slightly with noise)
      float blurNoise = noise(uv * 20.0 + uTime);
      vec4 blurredColor = texture2D(uTextureOld, uv + vec2(blurNoise * 0.005));

      // Add static grain/noise to simulate raw input (low fidelity)
      float grain = hash(uv * (uTime * 10.0)) * 0.08; 
      blurredColor += vec4(grain, grain, grain, 0.0);
      
      gl_FragColor = mix(blurredColor, vec4(0.05, 0.05, 0.05, 1.0), inkMask * 0.6);
    }
    
    // --- STATE 1: CRYSTALLIZATION (TRANSITION) ---
    else if (uState == 1) {
      // uProgress goes from 0.0 to 1.0
      
      // Liquid reveal effect using noise
      float n = fbm(uv * 4.0);
      
      // The edge of the liquid
      float limit = uProgress * 1.5 - 0.25; // Scale to cover full range
      float mask = smoothstep(limit - 0.1, limit + 0.1, n + uv.y * 0.2); // slight vertical bias
      
      // Inverse mask because we want to reveal the NEW image
      float reveal = 1.0 - mask;
      
      vec4 oldColor = texture2D(uTextureOld, uv);
      vec4 newColor = texture2D(uTextureNew, uv);
      
      // "Glass" highlight at the transition edge
      float edge = 1.0 - abs(mask - 0.5) * 2.0;
      edge = smoothstep(0.8, 1.0, edge);
      
      vec4 finalColor = mix(oldColor, newColor, reveal);
      
      // Add a flash of light at the crystallization wavefront
      finalColor += vec4(0.8, 0.9, 1.0, 0.0) * edge * 0.5;
      
      gl_FragColor = finalColor;
    } 
    
    // --- STATE 2: INTERACTIVE (INK SLASH) ---
    else {
      // Noise for the jagged edge
      float n = noise(uv * 10.0) * 0.03; 
      
      // Calculate split position
      float split = uSliderPos;
      
      // Mask: 1.0 if Left of split (Before side), 0.0 if Right of split (After side)
      float mask = step(uv.x + n, split);
      
      // --- BEFORE IMAGE (Raw/Unprocessed) ---
      // Removed liquid distortion as per request. 
      // Still applying slight tint/grain to distinguish from "clean" after image.
      
      vec4 oldColor = texture2D(uTextureOld, uv);
      
      // 2. Tinting: Slight desaturation + ink tint to contrast with the clean new image
      float gray = dot(oldColor.rgb, vec3(0.299, 0.587, 0.114));
      // Mix slight blue/ink tint
      oldColor.rgb = mix(oldColor.rgb, vec3(gray * 0.8, gray * 0.9, gray + 0.1), 0.2);
      
      // 3. Grain: Keep a bit of the raw grain
      float grain = hash(uv * uTime * 10.0) * 0.05;
      oldColor.rgb += grain;


      // --- AFTER IMAGE (Clean & Highlighted) ---
      vec4 newColor = texture2D(uTextureNew, uv);
      
      // 1. Enhance: Slight contrast boost to make it look "Clean"
      newColor.rgb = (newColor.rgb - 0.5) * 1.1 + 0.5;
      
      // 2. Highlight: Slight brightness boost
      newColor.rgb *= 1.05;


      // --- MIX ---
      // Left (mask=1) is Old. Right (mask=0) is New.
      vec4 finalColor = mix(newColor, oldColor, mask);
      
      
      // --- SPLIT LINE GLOW ---
      float dist = abs((uv.x + n) - split);
      
      // Sharp glass refraction line
      float glassLine = smoothstep(0.005, 0.0, dist);
      
      // Wider glow around the cut
      float glow = smoothstep(0.06, 0.0, dist) * 0.5;
      
      // Add highlights
      finalColor += vec4(0.9, 1.0, 1.0, 1.0) * glassLine;
      finalColor += vec4(0.4, 0.8, 1.0, 1.0) * glow;
      
      gl_FragColor = finalColor;
    }
  }
`;

// ------------------------------------------------------------------
// COMPONENT
// ------------------------------------------------------------------

const InkRenderer: React.FC<InkRendererProps> = ({
  imageOldSrc,
  imageNewSrc,
  renderState,
  sliderPos,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const contextRef = useRef<{
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    textures: { old: WebGLTexture | null; new: WebGLTexture | null };
    locs: any;
  } | null>(null);

  // Transition animation state
  const transitionProgressRef = useRef(0);

  // Helper to load texture
  const loadTexture = (gl: WebGLRenderingContext, src: string): Promise<WebGLTexture> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = src;
      img.onload = () => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (tex) resolve(tex);
        else reject('Failed to create texture');
      };
      img.onerror = (e) => reject(e);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Compile Shaders
    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }

    // Fullscreen Quad
    const verts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform Locations
    const locs = {
      uTime: gl.getUniformLocation(program, 'uTime'),
      uSliderPos: gl.getUniformLocation(program, 'uSliderPos'),
      uState: gl.getUniformLocation(program, 'uState'),
      uProgress: gl.getUniformLocation(program, 'uProgress'),
      uTextureOld: gl.getUniformLocation(program, 'uTextureOld'),
      uTextureNew: gl.getUniformLocation(program, 'uTextureNew'),
    };

    contextRef.current = { gl, program, textures: { old: null, new: null }, locs };

    // Initial load
    Promise.all([
      loadTexture(gl, imageOldSrc),
      loadTexture(gl, imageNewSrc),
    ]).then(([texOld, texNew]) => {
      if (contextRef.current) {
        contextRef.current.textures.old = texOld;
        contextRef.current.textures.new = texNew;
      }
    }).catch(err => console.error("Texture Load Error", err));
    
    // Animation Loop
    const loop = () => {
      if (!contextRef.current) return;
      const { gl, program, locs, textures } = contextRef.current;
      const now = (Date.now() - startTimeRef.current) / 1000;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);

      // Bind Textures
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures.old);
      gl.uniform1i(locs.uTextureOld, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures.new);
      gl.uniform1i(locs.uTextureNew, 1);

      // Uniforms
      gl.uniform1f(locs.uTime, now);
      gl.uniform1f(locs.uSliderPos, sliderPos);

      // State Logic Mapping
      let stateInt = 0;
      if (renderState === RenderState.BREATHING) stateInt = 0;
      if (renderState === RenderState.CRYSTALLIZING) stateInt = 1;
      if (renderState === RenderState.INTERACTIVE) stateInt = 2;
      
      gl.uniform1i(locs.uState, stateInt);

      // Animation for Crystallization
      if (renderState === RenderState.CRYSTALLIZING) {
        transitionProgressRef.current += 0.015; // Speed of crystallization
        if (transitionProgressRef.current > 1.2) transitionProgressRef.current = 1.0;
      } else if (renderState === RenderState.BREATHING) {
        transitionProgressRef.current = 0;
      } else {
        transitionProgressRef.current = 1;
      }
      gl.uniform1f(locs.uProgress, transitionProgressRef.current);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      reqRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [imageOldSrc, imageNewSrc]); // Re-init if sources change

  // Update canvas size on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
         // High DPI handling
         const dpr = window.devicePixelRatio || 1;
         // We use the parent element size to size the canvas
         const rect = canvas.parentElement?.getBoundingClientRect();
         if (rect) {
            const newWidth = Math.floor(rect.width * dpr);
            const newHeight = Math.floor(rect.height * dpr);
            
            if (canvas.width !== newWidth || canvas.height !== newHeight) {
                canvas.width = newWidth;
                canvas.height = newHeight;
            }
         }
    };

    updateSize();

    // Use ResizeObserver for robust element resizing (better than window.resize for dynamic containers)
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    
    // Fallback
    window.addEventListener('resize', updateSize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full block object-cover ${className}`} 
    />
  );
};

export default InkRenderer;