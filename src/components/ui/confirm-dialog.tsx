'use client'

import { Button } from 'animal-island-ui'
import { useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * 应用内确认对话框。
 *
 * 替代 window.confirm：Electron 渲染进程的原生 confirm 可能被系统抑制
 * （静默返回 false 导致操作被跳过），且样式与应用不统一。
 */

interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  /** 危险操作（删除等）：确认按钮显示为红色 */
  danger?: boolean
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

let pushRequest: ((request: ConfirmRequest) => void) | null = null

/** 弹出应用内确认框，resolve(true) = 用户确认 */
export function confirmAsync(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pushRequest) {
      resolve(false)
      return
    }
    pushRequest({ ...options, resolve })
  })
}

/** 确认框宿主：挂载一次（dashboard layout），供 confirmAsync 使用 */
export function ConfirmDialogHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  useEffect(() => {
    const handleRequest = (request: ConfirmRequest) => setRequest(request)
    pushRequest = handleRequest
    return () => {
      pushRequest = null
    }
  }, [])

  const settle = (ok: boolean) => {
    request?.resolve(ok)
    setRequest(null)
  }

  return (
    <Dialog
      open={!!request}
      onOpenChange={(open) => {
        if (!open) settle(false)
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
          {request?.description && (
            <DialogDescription className="whitespace-pre-line">
              {request.description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="default" onClick={() => settle(false)}>
            {request?.cancelText ?? '取消'}
          </Button>
          <Button
            type="primary"
            danger={request?.danger}
            onClick={() => settle(true)}
            autoFocus
          >
            {request?.confirmText ?? '确定'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
