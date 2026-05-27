import { TransactionImport, ValidationResult, ImportResult, Transaction, Account } from '@/types'
import { TransactionType } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { isValid, parse } from 'date-fns'

/**
 * 解析导入的 JSON 文件内容
 */
export function parseImportedJSON(content: string): TransactionImport[] {
  try {
    const data = JSON.parse(content)
    return Array.isArray(data) ? data : [data]
  } catch (error) {
    throw new Error('无效的 JSON 文件')
  }
}

/**
 * 解析 CSV 字符串为交易导入数据
 */
export function parseImportedCSV(content: string, accounts: Account[]): TransactionImport[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV 文件为空或格式无效')
  }

  // 创建账户名称到ID的映射
  const accountNameToId = new Map(accounts.map(acc => [acc.name, acc.id]))

  // 解析表头
  const headers = parseCSVLine(lines[0])
  const headerMap = createHeaderMap(headers)

  // 解析数据行
  const transactions: TransactionImport[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0 || values.every(v => !v.trim())) continue // 跳过空行

    try {
      const transaction = mapCSVRowToTransactionImport(values, headerMap, accountNameToId)
      transactions.push(transaction)
    } catch (error) {
      // 在验证阶段处理错误
      transactions.push({
        accountId: '',
        type: TransactionType.CONSUMPTION,
        createdAt: new Date(),
        _parseError: error instanceof Error ? error.message : '未知解析错误'
      } as any)
    }
  }

  return transactions
}

/**
 * 解析 CSV 行（处理引号包裹的字段）
 */
function parseCSVLine(line: string): string[] {
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
    } else if (char === ',' && !inQuotes) {
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
    if (normalized === 'id' || normalized === '交易id') map.set('id', index)
    if (normalized === '账户名称' || normalized === '账户name') map.set('accountName', index)
    if (normalized === '账户id' || normalized === 'accountid') map.set('accountId', index)
    if (normalized === '交易类型' || normalized === '类型' || normalized === 'type') map.set('type', index)
    if (normalized === '金额' || normalized === 'amount') map.set('amount', index)
    if (normalized === '余额' || normalized === 'balance') map.set('balance', index)
    if (normalized === '转账目标账户名称' || normalized === '转账目标') map.set('transferToAccountName', index)
    if (normalized === '转账来源账户名称' || normalized === '转账来源') map.set('transferFromAccountName', index)
    if (normalized === '转账配对id' || normalized === 'transferpairid') map.set('transferPairId', index)
    if (normalized === '描述' || normalized === 'description') map.set('description', index)
    if (normalized === '备注' || normalized === 'note') map.set('note', index)
    if (normalized === '标签' || normalized === 'tags') map.set('tags', index)
    if (normalized === '创建时间' || normalized === 'createdat') map.set('createdAt', index)
    if (normalized === '更新时间' || normalized === 'updatedat') map.set('updatedAt', index)
  })
  return map
}

/**
 * 将 CSV 行映射为 TransactionImport 对象
 */
function mapCSVRowToTransactionImport(
  values: string[],
  headerMap: Map<string, number>,
  accountNameToId: Map<string, string>
): TransactionImport {
  const getValue = (key: string): string => {
    const index = headerMap.get(key)
    return index !== undefined && index < values.length ? values[index] : ''
  }

  const id = getValue('id')
  const accountId = getValue('accountId') || accountNameToId.get(getValue('accountName')) || ''
  const typeStr = getValue('type')
  const amountStr = getValue('amount')
  const balanceStr = getValue('balance')
  const transferToAccountName = getValue('transferToAccountName')
  const transferFromAccountName = getValue('transferFromAccountName')
  const transferPairId = getValue('transferPairId')
  const description = getValue('description')
  const note = getValue('note')
  const tagsStr = getValue('tags')
  const createdAtStr = getValue('createdAt')
  const updatedAtStr = getValue('updatedAt')

  // 如果没有直接提供 accountId，尝试从账户名称查找
  let finalAccountId = accountId
  if (!finalAccountId) {
    const accountName = getValue('accountName')
    if (accountName) {
      finalAccountId = accountNameToId.get(accountName) || ''
    }
  }

  if (!finalAccountId) {
    // 改进错误消息，明确指出是账户不存在，并列出可用账户
    const accountName = getValue('accountName')
    const availableAccounts = Array.from(accountNameToId.keys()).join(', ')

    throw new Error(
      `账户名称 "${accountName}" 在系统中不存在。\n` +
      `请先在账户管理中创建该账户，或使用已有的账户名称。\n\n` +
      `系统中的可用账户: ${availableAccounts || '(无)'}`
    )
  }

  // 解析交易类型
  let type: TransactionType
  const typeLower = typeStr.toLowerCase().trim()
  if (typeLower === 'income' || typeLower === '收入' || typeLower === 'deposit' || typeLower === '存款') {
    type = TransactionType.INCOME
  } else if (typeLower === 'consumption' || typeLower === '消费' || typeLower === '支出') {
    type = TransactionType.CONSUMPTION
  } else if (typeLower === 'transfer' || typeLower === '转账') {
    type = TransactionType.TRANSFER
  } else if (typeLower === 'transfer_in' || typeLower === '转入') {
    type = TransactionType.TRANSFER_IN
  } else if (typeLower === 'transfer_out' || typeLower === '转出') {
    type = TransactionType.TRANSFER_OUT
  } else if (typeLower === 'deposit' || typeLower === '存款') {
    type = TransactionType.DEPOSIT
  } else if (typeLower === 'loan' || typeLower === '放贷') {
    type = TransactionType.LOAN
  } else if (typeLower === 'snapshot' || typeLower === '快照') {
    type = TransactionType.SNAPSHOT
  } else if (Object.values(TransactionType).includes(typeStr as TransactionType)) {
    type = typeStr as TransactionType
  } else {
    throw new Error(`无效的交易类型: ${typeStr}`)
  }

  // 解析金额和余额
  const amount = amountStr ? parseFloat(amountStr) : undefined
  const balance = balanceStr ? parseFloat(balanceStr) : undefined

  // 解析转账账户ID
  const transferToAccountId = transferToAccountName
    ? accountNameToId.get(transferToAccountName)
    : undefined
  const transferFromAccountId = transferFromAccountName
    ? accountNameToId.get(transferFromAccountName)
    : undefined

  // 解析标签
  const tags = tagsStr ? tagsStr.split(';').map(t => t.trim()).filter(t => t) : []

  // 解析日期 - 支持多种格式
  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined

    // 清理字符串：去除引号、多余空格
    const cleanedStr = dateStr.toString().trim().replace(/^['"]|['"]$/g, '')

    // 尝试多种格式
    const formats = [
      'yyyy-MM-dd HH:mm:ss',
      'yyyy-MM-dd',
      'yyyy/MM/dd HH:mm:ss',
      'yyyy/MM/dd',
      "yyyy-MM-dd'T'HH:mm:ss",
    ]

    for (const format of formats) {
      try {
        const date = parse(cleanedStr, format, new Date())
        if (isValid(date)) {
          return date
        }
      } catch (e) {
        // 继续尝试下一个格式
      }
    }

    // 所有格式都失败，返回 undefined
    return undefined
  }

  const createdAt = parseDate(createdAtStr) || new Date()

  return {
    id: id || undefined,
    accountId: finalAccountId,
    type,
    amount,
    balance,
    transferToAccountId,
    transferFromAccountId,
    transferPairId: transferPairId || undefined,
    description: description || undefined,
    note: note || undefined,
    tags: tags.length > 0 ? tags : undefined,
    createdAt,
    updatedAt: parseDate(updatedAtStr)
  }
}

/**
 * 验证单个交易数据
 */
export function validateImportedTransaction(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.accountId) {
    errors.push('缺少账户 ID')
  }

  if (!data.type) {
    errors.push('缺少交易类型')
  } else if (!Object.values(TransactionType).includes(data.type)) {
    errors.push('无效的交易类型')
  }

  if (!data.createdAt) {
    errors.push('缺少创建时间')
  } else {
    const date = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt)
    if (!isValid(date)) {
      errors.push('创建时间格式无效')
    }
  }

  if (data.amount !== undefined) {
    if (typeof data.amount !== 'number') {
      errors.push('金额必须是数字')
    } else if (data.amount < 0) {
      errors.push('金额不能为负数')
    }
  }

  if (data.balance !== undefined) {
    if (typeof data.balance !== 'number') {
      errors.push('余额必须是数字')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 导入交易数据到 store
 */
export function importTransactions(
  existingTransactions: Transaction[],
  importedData: TransactionImport[],
  existingAccountIds: string[]
): ImportResult {
  const result: ImportResult = {
    total: importedData.length,
    success: 0,
    updated: 0,
    failed: 0,
    errors: [],
    updates: [],
  }

  // 创建业务主键映射：accountId + createdAt -> transactionId
  const businessKeyMap = new Map<string, string>()
  existingTransactions.forEach(t => {
    // 将 createdAt 转换为字符串格式，确保时区一致
    const dateKey = formatDateKey(t.createdAt)
    const key = `${t.accountId}:${dateKey}`
    businessKeyMap.set(key, t.id)
  })

  // 辅助函数：格式化日期为字符串（忽略时间部分）
  function formatDateKey(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date)
    return d.toISOString().split('T')[0] // yyyy-mm-dd 格式
  }

  importedData.forEach((data, index) => {
    // 验证数据
    const validation = validateImportedTransaction(data)

    if (!validation.valid) {
      result.failed++
      result.errors.push({
        index,
        row: data,
        error: validation.errors.join('; '),
      })
      return
    }

    // 验证账户是否存在
    if (!existingAccountIds.includes(data.accountId)) {
      result.failed++
      result.errors.push({
        index,
        row: data,
        error: `账户 ID "${data.accountId}" 不存在`,
      })
      return
    }

    // 检查是否已存在（根据 accountId + createdAt）
    const dateKey = formatDateKey(data.createdAt!)
    const businessKey = `${data.accountId}:${dateKey}`

    const existingId = businessKeyMap.get(businessKey)

    if (existingId) {
      // 找到重复，使用现有ID进行更新
      data.id = existingId
      result.updated++
      result.updates.push(index)
    } else {
      // 新记录，生成新ID或使用提供的ID
      if (!data.id) {
        data.id = uuidv4()
      }
      result.success++
    }
  })

  return result
}

/**
 * 将导入的数据转换为 Transaction 格式
 */
export function convertImportedToTransaction(data: TransactionImport): Transaction {
  const id = data.id || uuidv4()
  const now = new Date()

  // 对于快照交易，如果没有 balance 但有 amount，则使用 amount 作为 balance
  let balance = data.balance
  if (data.type === TransactionType.SNAPSHOT && balance === undefined && data.amount !== undefined) {
    balance = data.amount
  }

  return {
    id,
    accountId: data.accountId,
    type: data.type,
    amount: data.amount,
    balance: balance,
    transferToAccountId: data.transferToAccountId,
    transferFromAccountId: data.transferFromAccountId,
    transferPairId: data.transferPairId,
    description: data.description,
    note: data.note,
    tags: data.tags || [],
    createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt ? new Date(data.updatedAt) : now),
  }
}
