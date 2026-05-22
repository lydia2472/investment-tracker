'use client'
import { ReactNode, useEffect } from 'react'
import { useAccountStore, useTransactionStore } from '@/lib/stores'

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize stores on client side
    useAccountStore.getState()
    useTransactionStore.getState()
  }, [])

  return <>{children}</>
}
