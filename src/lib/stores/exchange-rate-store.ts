import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { persistStorage } from './persist-storage'

// 支持的货币类型
export type SupportedCurrency = 'CNY' | 'USD' | 'EUR' | 'HKD' | 'JPY'

// 汇率数据接口
interface ExchangeRates {
  base: SupportedCurrency // 基准货币（固定为CNY）
  rates: Record<SupportedCurrency, number> // 汇率表
  lastUpdated: Date // 最后更新时间
  timestamp: number // API返回的时间戳
}

// 汇率状态接口
interface ExchangeRateState {
  rates: ExchangeRates | null
  isLoading: boolean
  error: string | null
  lastFetchAttempt: Date | null
  fetchRates: () => Promise<void>
  convert: (amount: number, from: SupportedCurrency, to?: SupportedCurrency) => number
  isExpired: (hours?: number) => boolean
  clearError: () => void
}

// 默认汇率（当API失败时的降级方案）
const DEFAULT_RATES: Record<SupportedCurrency, number> = {
  CNY: 1,
  USD: 0.138,
  EUR: 0.127,
  HKD: 1.08,
  JPY: 21.5,
}

export const useExchangeRateStore = create<ExchangeRateState>()(
  persist(
    (set, get) => ({
      rates: null,
      isLoading: false,
      error: null,
      lastFetchAttempt: null,

      // 获取最新汇率
      fetchRates: async () => {
        set({ isLoading: true, error: null, lastFetchAttempt: new Date() })

        try {
          const response = await fetch('https://api.exchangerate-api.com/v4/latest/CNY')

          if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`)
          }

          const data = await response.json()

          // 验证并转换数据
          const rates: ExchangeRates = {
            base: 'CNY',
            rates: {
              CNY: 1,
              USD: data.rates.USD ?? DEFAULT_RATES.USD,
              EUR: data.rates.EUR ?? DEFAULT_RATES.EUR,
              HKD: data.rates.HKD ?? DEFAULT_RATES.HKD,
              JPY: data.rates.JPY ?? DEFAULT_RATES.JPY,
            },
            lastUpdated: new Date(),
            timestamp: data.time_last_update,
          }

          set({ rates, isLoading: false, error: null })
        } catch (error) {
          console.error('获取汇率失败:', error)

          // 使用默认汇率作为降级方案
          const fallbackRates: ExchangeRates = {
            base: 'CNY',
            rates: DEFAULT_RATES,
            lastUpdated: new Date(),
            timestamp: Date.now(),
          }

          set({
            rates: fallbackRates,
            isLoading: false,
            error: '使用离线汇率数据',
          })
        }
      },

      // 货币转换
      convert: (amount: number, from: SupportedCurrency, to: SupportedCurrency = 'CNY') => {
        const { rates } = get()

        if (!rates) {
          console.warn('汇率数据不可用，使用默认汇率')
          return (amount / DEFAULT_RATES[from]) * DEFAULT_RATES[to]
        }

        // 先转换为CNY，再转换为目标货币
        const amountInCNY = amount / rates.rates[from]
        return amountInCNY * rates.rates[to]
      },

      // 检查汇率是否过期（默认24小时）
      isExpired: (hours: number = 24) => {
        const { rates } = get()
        if (!rates) return true

        // 处理从 localStorage 恢复的数据（lastUpdated 可能是字符串）
        const lastUpdated =
          typeof rates.lastUpdated === 'string' ? new Date(rates.lastUpdated) : rates.lastUpdated

        const now = new Date()
        const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)
        return hoursSinceUpdate >= hours
      },

      // 清除错误状态
      clearError: () => set({ error: null }),
    }),
    {
      name: 'exchange-rate-storage',
      storage: persistStorage,
      version: 1,
    }
  )
)
