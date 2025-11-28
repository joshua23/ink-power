export enum RenderState {
  IDLE = 'IDLE',         // Initial state
  BREATHING = 'BREATHING', // Waiting/Loading (Ink effect)
  CRYSTALLIZING = 'CRYSTALLIZING', // Transition (Liquid effect)
  INTERACTIVE = 'INTERACTIVE' // Comparison (Slash effect)
}

export interface ShaderProps {
  imageOld: HTMLImageElement | null;
  imageNew: HTMLImageElement | null;
  renderState: RenderState;
  sliderPos: number;
  width: number;
  height: number;
}
