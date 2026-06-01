import { isValid, parse } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'

import { getDefaultRiskLevel } from '@/lib/utils/risk-level-helpers'
import { AccountImport, ValidationResult, AccountImportResult, Account , AccountType, RiskLevel } from '@/types'

/**
 * 解析导入的 JSON 文件内容
 */
export function parseImportedAccountJSON(content: string): AccountImport[] {
  try {
    const data = JSON.parse(content)
    return Array.isArray(data) ? data : [data]
  } catch (error) {
    throw new Error('无效的 JSON 文件')
  }
}

/**
 * 检测CSV分隔符
 * 返回检测到的分隔符：逗号、分号或制表符
 */
function detectDelimiter(line: string): string {
  const delimiters = [';', '\t', ',']
  let maxCount = 0
  let detected = ','

  for (const delimiter of delimiters) {
    const count = (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length
    if (count > maxCount) {
      maxCount = count
      detected = delimiter
    }
  }

  return detected
}

/**
 * 解析 CSV 字符串为账户导入数据
 */
export function parseImportedAccountCSV(content: string): AccountImport[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV 文件为空或格式无效')
  }

  // 检测分隔符
  const delimiter = detectDelimiter(lines[0])

  // 解析表头
  const headers = parseCSVLine(lines[0], delimiter)
  const headerMap = createHeaderMap(headers)

  // 解析数据行
  const accounts: AccountImport[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter)
    if (values.length === 0 || values.every((v) => !v.trim())) continue // 跳过空行

    try {
      const account = mapCSVRowToAccountImport(values, headerMap)
      accounts.push(account)
    } catch (error) {
      // 在验证阶段处理错误
      accounts.push({
        name: '',
        type: AccountType.OTHER,
        balance: 0,
        initialBalance: 0,
        currency: '',
        _parseError: error instanceof Error ? error.message : '未知解析错误',
      } as any)
    }
  }

  return accounts
}

/**
 * 解析 CSV 行（处理引号包裹的字段）
 * @param line - CSV行字符串
 * @param delimiter - 分隔符（默认逗号）
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 转义的引号
        current += '"'
        i++
      } else {
        // 切换引号状态
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      // 字段分隔符
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * 创建表头映射（中英文映射）
 */
function createHeaderMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>()
  headers.forEach((header, index) => {
    const normalized = header.trim().toLowerCase()
    map.set(normalized, index)

    // 中文映射
    if (normalized === 'id' || normalized === '账户id' || normalized === 'id') map.set('id', index)
    if (normalized === '账户名称' || normalized === '名称' || normalized === 'name')
      map.set('name', index)
    if (normalized === '账户类型' || normalized === '类型' || normalized === 'type')
      map.set('type', index)
    if (normalized === '当前余额' || normalized === '余额' || normalized === 'balance')
      map.set('balance', index)
    // 自动修正常见的拼写错误
    if (normalized === '初始余额' || normalized === 'initialbalance' || normalized === 'initialbal' || normalized === 'initialbar')
      map.set('initialBalance', index)
    if (normalized === '货币' || normalized === 'currency') map.set('currency', index)
    if (normalized === '风险等级' || normalized === '风险' || normalized === 'risklevel')
      map.set('riskLevel', index)
    if (normalized === '描述' || normalized === 'description') map.set('description', index)
    if (normalized === '主题色' || normalized === '颜色' || normalized === 'color')
      map.set('color', index)
    if (normalized === '图标' || normalized === 'icon') map.set('icon', index)
    if (normalized === '创建时间' || normalized === 'createdat') map.set('createdAt', index)
    if (normalized === '更新时间' || normalized === 'updatedat') map.set('updatedAt', index)
  })
  return map
}

/**
 * 将 CSV 行映射为 AccountImport 对象
 */
function mapCSVRowToAccountImport(values: string[], headerMap: Map<string, number>): AccountImport {
  const getValue = (key: string): string => {
    const index = headerMap.get(key)
    const value = index !== undefined && index < values.length ? values[index] : ''
    return value
  }

  const id = getValue('id')
  const name = getValue('name')
  const typeStr = getValue('type')

  // CSV 的"当前余额"列 → 系统的 balance
  // CSV 的"初始余额"列 → 系统的 initialBalance
  let csvBalanceStr = getValue('balance') // CSV的"当前余额"列
  const csvInitialBalanceStr = getValue('initialBalance') // CSV的"初始余额"列

  // 如果缺少 balance 列，使用 initialBalance 作为 balance 的值
  if (!csvBalanceStr && csvInitialBalanceStr) {
    csvBalanceStr = csvInitialBalanceStr
  }

  const balance = csvBalanceStr ? parseFloat(csvBalanceStr) : 0
  const initialBalance = csvInitialBalanceStr ? parseFloat(csvInitialBalanceStr) : 0

  const currency = getValue('currency')
  const description = getValue('description')
  const color = getValue('color')
  const icon = getValue('icon')
  const riskLevelStr = getValue('riskLevel')
  const createdAtStr = getValue('createdAt')
  const updatedAtStr = getValue('updatedAt')

  // 解析账户类型
  let type: AccountType
  const typeLower = typeStr.toLowerCase().trim()
  if (typeLower === 'securities' || typeLower === '证券') {
    type = AccountType.SECURITIES
  } else if (typeLower === 'bank' || typeLower === '银行') {
    type = AccountType.BANK
  } else if (typeLower === 'cash' || typeLower === '现金') {
    type = AccountType.CASH
  } else if (typeLower === 'fixed_deposit' || typeLower === '定期存款' || typeLower === 'fixeddeposit') {
    type = AccountType.FIXED_DEPOSIT
  } else if (typeLower === 'fund' || typeLower === '基金') {
    type = AccountType.FUND
  } else if (typeLower === 'stock' || typeLower === '股票') {
    type = AccountType.STOCK
  } else if (typeLower === 'gold' || typeLower === '黄金') {
    type = AccountType.GOLD
  } else if (typeLower === 'other' || typeLower === '其他') {
    type = AccountType.OTHER
  } else {
    throw new Error(`无效的账户类型: ${typeStr}`)
  }

  // 解析风险等级
  let riskLevel: RiskLevel | undefined
  if (riskLevelStr) {
    const levelLower = riskLevelStr.toLowerCase().trim()
    if (levelLower === 'high' || levelLower === '高' || levelLower === '高风险') {
      riskLevel = RiskLevel.HIGH
    } else if (levelLower === 'medium' || levelLower === '中' || levelLower === '中风险') {
      riskLevel = RiskLevel.MEDIUM
    } else if (levelLower === 'low' || levelLower === '低' || levelLower === '低风险') {
      riskLevel = RiskLevel.LOW
    }
    // 如果解析失败，使用默认值
    if (!riskLevel) {
      riskLevel = getDefaultRiskLevel()
    }
  }

  // 解析余额（已在上面完成）

  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined

    // Try multiple date formats
    const formats = [
      'yyyy-MM-dd HH:mm:ss',
      'yyyy/M/d H:mm',
      'yyyy/M/d HH:mm',
      'yyyy-MM-dd',
      'yyyy/M/d'
    ]

    for (const format of formats) {
      const date = parse(dateStr, format, new Date())
      if (isValid(date)) {
        return date
      }
    }

    return undefined
  }

  const result = {
    id: id || undefined,
    name: name.trim(),
    type,
    balance,
    initialBalance,
    currency: currency.trim().toUpperCase() || 'CNY',
    description: description || undefined,
    color: color || undefined,
    icon: icon || undefined,
    riskLevel: riskLevel || undefined,
    createdAt: parseDate(createdAtStr),
    updatedAt: parseDate(updatedAtStr),
  }

  return result
}

/**
 * 验证单个账户数据
 */
export function validateImportedAccount(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.name) {
    errors.push('缺少账户名称')
  }

  if (!data.type) {
    errors.push('缺少账户类型')
  } else if (!Object.values(AccountType).includes(data.type)) {
    errors.push('无效的账户类型')
  }

  if (data.balance === undefined || data.balance === null) {
    errors.push('缺少当前余额')
  } else if (typeof data.balance !== 'number') {
    errors.push('余额必须是数字')
  } else if (data.balance < 0) {
    errors.push('余额不能为负数')
  }

  if (data.initialBalance === undefined || data.initialBalance === null) {
    errors.push('缺少初始余额')
  } else if (typeof data.initialBalance !== 'number') {
    errors.push('初始余额必须是数字')
  } else if (data.initialBalance < 0) {
    errors.push('初始余额不能为负数')
  }

  if (!data.currency) {
    errors.push('缺少货币代码')
  }

  if (data.createdAt) {
    const date = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt)
    if (!isValid(date)) {
      errors.push('创建时间格式无效')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 导入账户数据验证
 */
export function importAccounts(
  existingAccounts: Account[],
  importedData: AccountImport[]
): AccountImportResult {
  const result: AccountImportResult = {
    total: importedData.length,
    success: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  // 创建账户名称到账户的映射（不区分大小写）
  const existingAccountsByName = new Map<string, Account>()
  existingAccounts.forEach((acc) => {
    existingAccountsByName.set(acc.name.toLowerCase(), acc)
  })

  importedData.forEach((data, index) => {
    // 验证数据
    const validation = validateImportedAccount(data)

    if (!validation.valid) {
      result.failed++
      result.errors.push({
        index,
        row: data,
        error: validation.errors.join('; '),
      })
      return
    }

    // 根据账户名称查找现有账户
    const existingAccount = existingAccountsByName.get(data.name.toLowerCase())

    if (existingAccount) {
      // 找到同名账户，标记为更新
      result.updated++
    } else {
      // 没有找到，标记为新增
      result.success++
    }
  })

  return result
}

/**
 * 将导入的数据转换为 Account 格式
 */
export function convertImportedToAccount(data: AccountImport): Account {
  const id = data.id || uuidv4()
  const now = new Date()

  return {
    id,
    name: data.name,
    type: data.type,
    balance: data.balance,
    initialBalance: data.initialBalance,
    currency: data.currency,
    description: data.description || '',
    color: data.color || '#F5F0E6',
    icon: data.icon,
    riskLevel: data.riskLevel,
    createdAt:
      data.createdAt instanceof Date
        ? data.createdAt
        : data.createdAt
          ? new Date(data.createdAt)
          : now,
    updatedAt:
      data.updatedAt instanceof Date
        ? data.updatedAt
        : data.updatedAt
          ? new Date(data.updatedAt)
          : now,
  }
}

/**
 * 将导入数据转换为账户更新数据
 * 注意：只更新 initialBalance，保留系统中的 current balance
 */
export function convertImportedToAccountUpdate(data: AccountImport): Partial<Account> {
  return {
    name: data.name,
    type: data.type,
    // balance 不更新，保留系统中的当前余额
    initialBalance: data.initialBalance, // CSV中的初始余额 → 系统的初始余额
    currency: data.currency,
    description: data.description || '',
    color: data.color || '#F5F0E6',
    icon: data.icon,
    riskLevel: data.riskLevel,
  }
}
