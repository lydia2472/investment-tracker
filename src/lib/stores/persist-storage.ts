import { createJSONStorage, type StateStorage } from 'zustand/middleware'

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

function getElectronStorage() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.electronAPI?.storage
}

const stateStorage: StateStorage = {
  getItem: (name) => {
    const localStorage = getLocalStorage()
    const browserValue = localStorage?.getItem(name) ?? null

    if (browserValue !== null) {
      return browserValue
    }

    const electronStorage = getElectronStorage()
    if (!electronStorage) {
      return null
    }

    return electronStorage.getItem(name).then((nativeValue) => {
      if (nativeValue !== null && localStorage) {
        localStorage.setItem(name, nativeValue)
      }

      return nativeValue
    })
  },

  setItem: (name, value) => {
    const localStorage = getLocalStorage()
    if (localStorage) {
      localStorage.setItem(name, value)
    }

    void getElectronStorage()?.setItem(name, value)
  },

  removeItem: (name) => {
    const localStorage = getLocalStorage()
    if (localStorage) {
      localStorage.removeItem(name)
    }

    void getElectronStorage()?.removeItem(name)
  },
}

export const persistStorage = createJSONStorage(() => stateStorage)
