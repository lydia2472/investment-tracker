export const isDevelopment = process.env.NODE_ENV === 'development'

export function debugLog(...args: unknown[]) {
  if (isDevelopment) {
    console.log(...args)
  }
}

export function debugWarn(...args: unknown[]) {
  if (isDevelopment) {
    console.warn(...args)
  }
}
