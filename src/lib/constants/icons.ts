export interface AccountIcon {
  id: string
  name: string
  /** emoji 字符(直接存入账户 icon 字段,零版权) */
  emoji: string
}

/** 账户图标候选集(系统 emoji,无版权限制) */
export const ACCOUNT_ICONS: AccountIcon[] = [
  { id: 'wallet', name: '钱包', emoji: '👛' },
  { id: 'money-bag', name: '钱袋', emoji: '💰' },
  { id: 'coin', name: '金币', emoji: '🪙' },
  { id: 'bank', name: '银行', emoji: '🏦' },
  { id: 'card', name: '银行卡', emoji: '💳' },
  { id: 'chart-up', name: '上涨', emoji: '📈' },
  { id: 'chart-down', name: '下跌', emoji: '📉' },
  { id: 'piggy', name: '储蓄罐', emoji: '🐷' },
  { id: 'rocket', name: '火箭', emoji: '🚀' },
  { id: 'star', name: '星星', emoji: '⭐' },
  { id: 'gem', name: '宝石', emoji: '💎' },
  { id: 'shield', name: '盾牌', emoji: '🛡️' },
  { id: 'bear', name: '熊市', emoji: '🐻' },
  { id: 'bull', name: '牛市', emoji: '🐮' },
  { id: 'panda', name: '熊猫', emoji: '🐼' },
  { id: 'tiger', name: '老虎', emoji: '🐯' },
  { id: 'rabbit', name: '兔子', emoji: '🐰' },
  { id: 'cat', name: '猫', emoji: '🐱' },
  { id: 'dog', name: '狗', emoji: '🐶' },
  { id: 'penguin', name: '企鹅', emoji: '🐧' },
  { id: 'house', name: '房子', emoji: '🏠' },
  { id: 'globe', name: '全球', emoji: '🌍' },
  { id: 'computer', name: '电脑', emoji: '💻' },
  { id: 'phone', name: '手机', emoji: '📱' },
  { id: 'book', name: '账本', emoji: '📕' },
]

/** 兼容旧命名(迁移期) */
export const ANIMAL_CROSSING_ICONS = ACCOUNT_ICONS
