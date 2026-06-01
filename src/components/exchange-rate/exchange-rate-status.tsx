'use client'

import { Card } from 'animal-island-ui'
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { useEffect } from 'react'

import { useExchangeRateStore } from '@/lib/stores/exchange-rate-store'

export function ExchangeRateStatus() {
  const { rates, isLoading, error, isExpired, fetchRates, clearError } = useExchangeRateStore()

  useEffect(() => {
    // 初始化时获取汇率
    if (!rates) {
      fetchRates()
    }
  }, [])

  useEffect(() => {
    // 每24小时自动更新汇率
    if (isExpired(24)) {
      fetchRates()
    }
  }, [rates])

  const handleRefresh = () => {
    clearError()
    fetchRates()
  }

  if (!rates && !isLoading) {
    return null // 首次加载时不显示
  }

  return (
    <Card color="app-yellow">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : error ? (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <span className="text-sm font-medium">汇率状态</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="rounded-md p-2 hover:bg-muted transition-colors"
            title="刷新汇率"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && <div className="mt-2 text-xs text-orange-600">{error}</div>}

        {rates && !isLoading && (
          <div className="mt-2 text-xs text-muted-foreground">
            更新时间:{' '}
            {(typeof rates.lastUpdated === 'string'
              ? new Date(rates.lastUpdated)
              : rates.lastUpdated
            ).toLocaleString('zh-CN')}
          </div>
        )}

        {rates && (
          <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium">USD</div>
              <div className="text-muted-foreground">{rates.rates.USD.toFixed(4)}</div>
            </div>
            <div className="text-center">
              <div className="font-medium">EUR</div>
              <div className="text-muted-foreground">{rates.rates.EUR.toFixed(4)}</div>
            </div>
            <div className="text-center">
              <div className="font-medium">HKD</div>
              <div className="text-muted-foreground">{rates.rates.HKD.toFixed(4)}</div>
            </div>
            <div className="text-center">
              <div className="font-medium">JPY</div>
              <div className="text-muted-foreground">{rates.rates.JPY.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="font-medium">CNY</div>
              <div className="text-muted-foreground">1.0000</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
