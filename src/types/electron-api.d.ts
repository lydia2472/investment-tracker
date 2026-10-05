export {}

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void
      maximize: () => void
      close: () => void
      storage?: {
        getItem: (key: string) => Promise<string | null>
        setItem: (key: string, value: string) => Promise<boolean>
        removeItem: (key: string) => Promise<boolean>
      }
      platform: string
      versions: NodeJS.ProcessVersions
      isDev: boolean
    }
  }
}
