'use client'

import { InfoIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'

interface CardLogicHintProps {
  title: string
  lines: string[]
  /** 隐藏"口径"文字，只保留图标。默认 false（显示文字）。 */
  hideLabel?: boolean
}

export function CardLogicHint({ title, lines, hideLabel = false }: CardLogicHintProps) {
  return (
    <div className="group/logic relative">
      <button
        type="button"
        className={cn(
          'inline-flex h-8 items-center gap-1 text-xs font-semibold text-white/90 transition hover:text-white focus-visible:text-white',
          hideLabel
            ? 'px-0'
            : 'rounded-full border border-white/20 bg-white/10 px-2 hover:bg-white/20 focus-visible:bg-white/20'
        )}
        onClick={(event) => {
          event.stopPropagation()
        }}
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
      >
        <InfoIcon className={hideLabel ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        {!hideLabel && <span>口径</span>}
      </button>
      <div className="pointer-events-none absolute right-0 top-10 z-50 w-80 translate-y-1 rounded-2xl border border-[#d7d0be] bg-[#fffaf0] p-4 text-[#4d3d2b] opacity-0 shadow-md transition duration-150 group-hover/logic:translate-y-0 group-hover/logic:opacity-100 group-focus-within/logic:translate-y-0 group-focus-within/logic:opacity-100">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-bold text-[#6b4f2d]">{title}</div>
            <div className="mt-1 text-xs text-[#8a7455]">当前卡片的计算逻辑与包含范围</div>
          </div>
          <div className="space-y-2 text-xs leading-5 text-[#5b4a35]">
            {lines.map((line) => (
              <div key={line} className="rounded-xl bg-[#f7efdc] px-3 py-2">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
