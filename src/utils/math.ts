export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}
