'use client'

import { Icon as AnimalIslandIcon } from 'animal-island-ui'
import * as LucideIcons from 'lucide-react'
import { HTMLAttributes } from 'react'

interface IconProps extends HTMLAttributes<HTMLElement> {
  className?: string
  size?: number
}

// animal-island-ui 图标映射（6 个）
const ANIMAL_ISLAND_ICONS = {
  HomeIcon: 'icon-map',
  ShoppingIcon: 'icon-shopping',
  ChatIcon: 'icon-chat',
  DesignIcon: 'icon-design',
  TrophyIcon: 'icon-miles',
  MapIcon: 'icon-map',
} as const

// lucide-react 图标映射（27 个）
const LUCIDE_ICONS = {
  ShellIcon: LucideIcons.Shell,
  ArrowRightLeftIcon: LucideIcons.ArrowLeftRight,
  BarChartIcon: LucideIcons.BarChart3,
  SparklesIcon: LucideIcons.Sparkles,
  MenuIcon: LucideIcons.Menu,
  SearchIcon: LucideIcons.Search,
  BellIcon: LucideIcons.Bell,
  TrendingUpIcon: LucideIcons.TrendingUp,
  TrendingDownIcon: LucideIcons.TrendingDown,
  CalendarIcon: LucideIcons.Calendar,
  InfoIcon: LucideIcons.Info,
  PlusIcon: LucideIcons.Plus,
  EditIcon: LucideIcons.Edit,
  TrashIcon: LucideIcons.Trash2,
  XIcon: LucideIcons.X,
  ChevronDownIcon: LucideIcons.ChevronDown,
  ChevronUpIcon: LucideIcons.ChevronUp,
  ChevronRightIcon: LucideIcons.ChevronRight,
  ArrowUpIcon: LucideIcons.ArrowUp,
  ArrowDownIcon: LucideIcons.ArrowDown,
  FilterIcon: LucideIcons.Filter,
  SettingsIcon: LucideIcons.Settings,
  MoonIcon: LucideIcons.Moon,
  SunIcon: LucideIcons.Sun,
  CheckIcon: LucideIcons.Check,
  CheckCircleIcon: LucideIcons.CheckCircle,
  AlertIcon: LucideIcons.AlertTriangle,
  AlertTriangleIcon: LucideIcons.AlertTriangle,
  ShieldIcon: LucideIcons.Shield,
  ShieldCheckIcon: LucideIcons.ShieldCheck,
  MoreVerticalIcon: LucideIcons.MoreVertical,
  TurnipIcon: LucideIcons.Carrot,
  WalletIcon: LucideIcons.Wallet,
  DownloadIcon: LucideIcons.Download,
  UploadIcon: LucideIcons.Upload,
} as const

// animal-island-ui 图标工厂
function createAnimalIslandIcon(iconName: keyof typeof ANIMAL_ISLAND_ICONS) {
  return function Icon({ className = '', size = 20 }: IconProps) {
    return (
      <AnimalIslandIcon name={ANIMAL_ISLAND_ICONS[iconName]} size={size} className={className} />
    )
  }
}

// lucide-react 图标工厂
function createLucideIcon(LucideComponent: React.ComponentType<any>) {
  return function Icon({ className = '', size = 20 }: IconProps) {
    return <LucideComponent className={className} size={size} />
  }
}

// 导出所有图标（保持原有命名，无需修改使用方代码）
export const HomeIcon = createAnimalIslandIcon('HomeIcon')
export const ShoppingIcon = createAnimalIslandIcon('ShoppingIcon')
export const ChatIcon = createAnimalIslandIcon('ChatIcon')
export const DesignIcon = createAnimalIslandIcon('DesignIcon')
export const TrophyIcon = createAnimalIslandIcon('TrophyIcon')
export const MapIcon = createAnimalIslandIcon('MapIcon')

export const ShellIcon = createLucideIcon(LUCIDE_ICONS.ShellIcon)
export const ArrowRightLeftIcon = createLucideIcon(LUCIDE_ICONS.ArrowRightLeftIcon)
export const BarChartIcon = createLucideIcon(LUCIDE_ICONS.BarChartIcon)
export const SparklesIcon = createLucideIcon(LUCIDE_ICONS.SparklesIcon)
export const MenuIcon = createLucideIcon(LUCIDE_ICONS.MenuIcon)
export const SearchIcon = createLucideIcon(LUCIDE_ICONS.SearchIcon)
export const BellIcon = createLucideIcon(LUCIDE_ICONS.BellIcon)
export const TrendingUpIcon = createLucideIcon(LUCIDE_ICONS.TrendingUpIcon)
export const TrendingDownIcon = createLucideIcon(LUCIDE_ICONS.TrendingDownIcon)
export const CalendarIcon = createLucideIcon(LUCIDE_ICONS.CalendarIcon)
export const InfoIcon = createLucideIcon(LUCIDE_ICONS.InfoIcon)
export const PlusIcon = createLucideIcon(LUCIDE_ICONS.PlusIcon)
export const EditIcon = createLucideIcon(LUCIDE_ICONS.EditIcon)
export const TrashIcon = createLucideIcon(LUCIDE_ICONS.TrashIcon)
export const XIcon = createLucideIcon(LUCIDE_ICONS.XIcon)
export const ChevronDownIcon = createLucideIcon(LUCIDE_ICONS.ChevronDownIcon)
export const ChevronUpIcon = createLucideIcon(LUCIDE_ICONS.ChevronUpIcon)
export const ChevronRightIcon = createLucideIcon(LUCIDE_ICONS.ChevronRightIcon)
export const ArrowUpIcon = createLucideIcon(LUCIDE_ICONS.ArrowUpIcon)
export const ArrowDownIcon = createLucideIcon(LUCIDE_ICONS.ArrowDownIcon)
export const FilterIcon = createLucideIcon(LUCIDE_ICONS.FilterIcon)
export const SettingsIcon = createLucideIcon(LUCIDE_ICONS.SettingsIcon)
export const MoonIcon = createLucideIcon(LUCIDE_ICONS.MoonIcon)
export const SunIcon = createLucideIcon(LUCIDE_ICONS.SunIcon)
export const CheckIcon = createLucideIcon(LUCIDE_ICONS.CheckIcon)
export const CheckCircleIcon = createLucideIcon(LUCIDE_ICONS.CheckCircleIcon)
export const AlertIcon = createLucideIcon(LUCIDE_ICONS.AlertIcon)
export const AlertTriangleIcon = createLucideIcon(LUCIDE_ICONS.AlertTriangleIcon)
export const ShieldIcon = createLucideIcon(LUCIDE_ICONS.ShieldIcon)
export const ShieldCheckIcon = createLucideIcon(LUCIDE_ICONS.ShieldCheckIcon)
export const MoreVerticalIcon = createLucideIcon(LUCIDE_ICONS.MoreVerticalIcon)
export const TurnipIcon = createLucideIcon(LUCIDE_ICONS.TurnipIcon)
export const WalletIcon = createLucideIcon(LUCIDE_ICONS.WalletIcon)
export const DownloadIcon = createLucideIcon(LUCIDE_ICONS.DownloadIcon)
export const UploadIcon = createLucideIcon(LUCIDE_ICONS.UploadIcon)
