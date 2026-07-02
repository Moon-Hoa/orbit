/** Converts radians to degrees, rounded to avoid floating-point noise in displayed values. */
export const radToDeg = (radians: number): number =>
  Math.round(((radians * 180) / Math.PI) * 1e9) / 1e9

export const degToRad = (degrees: number): number => (degrees * Math.PI) / 180
