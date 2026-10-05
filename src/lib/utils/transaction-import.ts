import { isValid, parse } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'

import { useAccountStore } from '@/lib/stores/account-store'
import { Snapshot, useSnapshotStore } from '@/lib/stores/snapshot-store'
import { splitCSVLines as splitCSVRecords } from '@/lib/utils/csv-parse'
import { Account, ImportResult, Transaction, TransactionImport, TransactionType, ValidationResult } from '@/types'

type ImportRecord = Record<string, unknown>

function toImportRecord(value: unknown): ImportRecord {
  return value && typeof value === 'object' ? (value as ImportRecord) : {}
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

function parseOptionalDate(value: unknown): Date | string | undefined {
  if (value instanceof Date || typeof value === 'string') {
    return value
  }

  return undefined
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function parseOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function remapAccountIdsForImport(
  item: ImportRecord,
  accounts?: Account[]
): ImportRecord {
  if (!accounts || accounts.length === 0) {
    return item
  }

  // 账户识别映射：名称 + 基金代码 都能定位到账户（代码是唯一识别）
  const accountNameToId = new Map<string, string>()
  accounts.forEach((account) => {
    accountNameToId.set(account.name, account.id)
    if (account.fundCode) {
      accountNameToId.set(account.fundCode, account.id)
    }
  })
  const validAccountIds = new Set(accounts.map((account) => account.id))

  const rawAccountId = typeof item.accountId === 'string' ? item.accountId : ''
  const rawAccountName = typeof item.accountName === 'string' ? item.accountName : ''
  const rawAccountFundCode = typeof item.accountFundCode === 'string' ? item.accountFundCode : ''
  const rawTransferToAccountId =
    typeof item.transferToAccountId === 'string' ? item.transferToAccountId : ''
  const rawTransferToAccountName =
    typeof item.transferToAccountName === 'string' ? item.transferToAccountName : ''
  const rawTransferFromAccountId =
    typeof item.transferFromAccountId === 'string' ? item.transferFromAccountId : ''
  const rawTransferFromAccountName =
    typeof item.transferFromAccountName === 'string' ? item.transferFromAccountName : ''

  const resolvedAccountId =
    (rawAccountId && validAccountIds.has(rawAccountId) ? rawAccountId : '') ||
    accountNameToId.get(rawAccountName) ||
    accountNameToId.get(rawAccountFundCode) ||
    rawAccountId

  const resolvedTransferToAccountId =
    (rawTransferToAccountId && validAccountIds.has(rawTransferToAccountId)
      ? rawTransferToAccountId
      : '') ||
    accountNameToId.get(rawTransferToAccountName) ||
    rawTransferToAccountId ||
    undefined

  const resolvedTransferFromAccountId =
    (rawTransferFromAccountId && validAccountIds.has(rawTransferFromAccountId)
      ? rawTransferFromAccountId
      : '') ||
    accountNameToId.get(rawTransferFromAccountName) ||
    rawTransferFromAccountId ||
    undefined

  return {
    ...item,
    accountId: resolvedAccountId,
    transferToAccountId: resolvedTransferToAccountId,
    transferFromAccountId: resolvedTransferFromAccountId,
  }
}

/**
 * 标准化交易类型（处理连字符、空格等）
 */
export function normalizeTransactionType(type: unknown): TransactionType {
  if (!type) return TransactionType.CONSUMPTION

  const typeStr = String(type).toLowerCase().trim().replace(/-/g, '_').replace(/\s+/g, '')
  console.log('[JSON类型标准化] 原始值:', type, '处理后:', typeStr)

  if (typeStr === 'income' || typeStr === '收入') {
    return TransactionType.INCOME
  } else if (typeStr === 'deposit' || typeStr === '存款') {
    return TransactionType.DEPOSIT
  } else if (typeStr === 'consumption' || typeStr === '消费' || typeStr === '支出') {
    return TransactionType.CONSUMPTION
  } else if (typeStr === 'transfer' || typeStr === '转账') {
    return TransactionType.TRANSFER
  } else if (typeStr === 'transfer_in' || typeStr === '转入') {
    console.log('[JSON类型标准化] 匹配到 TRANSFER_IN')
    return TransactionType.TRANSFER_IN
  } else if (typeStr === 'transfer_out' || typeStr === '转出') {
    return TransactionType.TRANSFER_OUT
  } else if (typeStr === 'loan' || typeStr === '放贷') {
    return TransactionType.LOAN
  } else if (typeStr === 'snapshot' || typeStr === '快照') {
    return TransactionType.SNAPSHOT
  } else if (Object.values(TransactionType).includes(type as TransactionType)) {
    return type as TransactionType
  } else {
    console.warn('[JSON类型标准化] 无效类型，默认使用 CONSUMPTION:', type)
    return TransactionType.CONSUMPTION
  }
}

/**
 * 解析导入的 JSON 文件内容
 */
export function parseImportedJSON(content: string, accounts?: Account[]): TransactionImport[] {
  try {
    const data: unknown = JSON.parse(content)
    const items = Array.isArray(data) ? data : [data]

    // 标准化所有交易记录中的类型字段
    return items.map((item): TransactionImport => {
      const remappedItem = remapAccountIdsForImport(toImportRecord(item), accounts)

      return {
        id: parseOptionalString(remappedItem.id),
        accountId: parseOptionalString(remappedItem.accountId) || '',
        type: normalizeTransactionType(remappedItem.type),
        amount: parseOptionalNumber(remappedItem.amount),
        balance: parseOptionalNumber(remappedItem.balance),
        transferToAccountId: parseOptionalString(remappedItem.transferToAccountId),
        transferFromAccountId: parseOptionalString(remappedItem.transferFromAccountId),
        transferPairId: parseOptionalString(remappedItem.transferPairId),
        description: parseOptionalString(remappedItem.description),
        note: parseOptionalString(remappedItem.note),
        tags: parseOptionalStringArray(remappedItem.tags),
        createdAt: parseOptionalDate(remappedItem.createdAt) || new Date(),
        updatedAt: parseOptionalDate(remappedItem.updatedAt),
      }
    })
  } catch {
    throw new Error('无效的 JSON 文件')
  }
}

/**
 * 解析 CSV 字符串为交易导入数据
 */
export function parseImportedCSV(content: string, accounts: Account[]): TransactionImport[] {
  // 注意：不能简单地 split('\n')，因为引号包裹的字段内部可能包含换行符（RFC 4180）。
  // 例如描述字段为 "第一行\n第二行" 时，必须把整个引号段落视为同一行，否则会导致行拆分错位、
  // 列数与表头不一致，进而触发解析失败。这里使用引号感知的行拆分。
  const lines = splitCSVRecords(content)
  if (lines.length < 2) {
    throw new Error('CSV 文件为空或格式无效')
  }

  // 账户识别映射：名称 + 基金代码 都能定位到账户
  const accountNameToId = new Map<string, string>()
  accounts.forEach((acc) => {
    accountNameToId.set(acc.name, acc.id)
    if (acc.fundCode) {
      accountNameToId.set(acc.fundCode, acc.id)
    }
  })
  console.log('[CSV账户映射] 可用账户列表:', Array.from(accountNameToId.entries()))
  console.log('[CSV账户映射] 账户数量:', accounts.length)

  // 解析表头
  const headers = parseCSVLine(lines[0])
  const headerMap = createHeaderMap(headers)

  // 解析数据行
  const transactions: TransactionImport[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0 || values.every((v) => !v.trim())) continue // 跳过空行

    try {
      const transaction = mapCSVRowToTransactionImport(values, headerMap, accountNameToId)
      transactions.push(transaction)
    } catch (error) {
      // 解析失败的行直接跳过，不再生成垃圾记录（避免错误行被当成 CONSUMPTION 写入）
      const errorMsg = error instanceof Error ? error.message : '未知解析错误'
      console.warn(`[CSV导入] 第 ${i + 1} 行解析失败，已跳过：${errorMsg}`)
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
    if (normalized === '基金代码' || normalized === 'fundcode' || normalized === 'accountfundcode')
      map.set('fundCode', index)
    if (normalized === '账户id' || normalized === 'accountid') map.set('accountId', index)
    if (normalized === '交易类型' || normalized === '类型' || normalized === 'type')
      map.set('type', index)
    if (normalized === '金额' || normalized === 'amount') map.set('amount', index)
    if (normalized === '余额' || normalized === 'balance') map.set('balance', index)
    if (normalized === '转账目标账户名称' || normalized === '转账目标')
      map.set('transferToAccountName', index)
    if (normalized === '转账来源账户名称' || normalized === '转账来源')
      map.set('transferFromAccountName', index)
    if (normalized === '转账配对id' || normalized === 'transferpairid')
      map.set('transferPairId', index)
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
  const accountNameFromCSV = getValue('accountName')
  const rawAccountId = getValue('accountId')
  const fundCodeFromCSV = getValue('fundCode')

  // 验证accountId是否有效（存在于系统中）
  const validAccountIds = new Set(accountNameToId.values())
  const isAccountIdValid = rawAccountId && validAccountIds.has(rawAccountId)

  console.log('[CSV账户映射] 原始accountId:', rawAccountId, '是否有效:', isAccountIdValid)
  console.log('[CSV账户映射] 查找账户:', accountNameFromCSV, '结果:', accountNameToId.get(accountNameFromCSV))

  // 如果CSV中的accountId无效，先用accountName查找，失败再用基金代码查找
  const accountId = isAccountIdValid
    ? rawAccountId
    : (accountNameToId.get(accountNameFromCSV) || accountNameToId.get(fundCodeFromCSV) || '')
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
    console.log('[CSV账户映射] 二次查找账户:', accountName, '结果:', accountNameToId.get(accountName))
    if (accountName) {
      finalAccountId = accountNameToId.get(accountName) || ''
    }
  }

  if (!finalAccountId) {
    // 改进错误消息，明确指出是账户不存在，并列出可用账户
    const accountName = getValue('accountName')
    const availableAccounts = Array.from(accountNameToId.keys()).join(', ')
    console.log('[CSV账户映射] 错误: 账户未找到 - 账户名称:', accountName, '可用账户:', availableAccounts)

    throw new Error(
      `账户名称 "${accountName}" 在系统中不存在。\n` +
        `请先在账户管理中创建该账户，或使用已有的账户名称。\n\n` +
        `系统中的可用账户: ${availableAccounts || '(无)'}`
    )
  }

  // 解析交易类型
  let type: TransactionType
  const typeLower = typeStr.toLowerCase().trim().replace(/-/g, '_').replace(/\s+/g, '') // 将连字符替换为下划线，移除所有空格
  console.log('[类型解析] 原始值:', typeStr, '处理后:', typeLower)

  if (typeLower === 'income' || typeLower === '收入') {
    type = TransactionType.INCOME
  } else if (typeLower === 'deposit' || typeLower === '存款') {
    type = TransactionType.DEPOSIT
  } else if (typeLower === 'consumption' || typeLower === '消费' || typeLower === '支出') {
    type = TransactionType.CONSUMPTION
  } else if (typeLower === 'transfer' || typeLower === '转账') {
    type = TransactionType.TRANSFER
  } else if (typeLower === 'transfer_in' || typeLower === '转入') {
    type = TransactionType.TRANSFER_IN
    console.log('[类型解析] 匹配到 TRANSFER_IN')
  } else if (typeLower === 'transfer_out' || typeLower === '转出') {
    type = TransactionType.TRANSFER_OUT
  } else if (typeLower === 'loan' || typeLower === '放贷') {
    type = TransactionType.LOAN
  } else if (typeLower === 'snapshot' || typeLower === '快照') {
    type = TransactionType.SNAPSHOT
  } else if (Object.values(TransactionType).includes(typeStr as TransactionType)) {
    type = typeStr as TransactionType
  } else {
    throw new Error(`无效的交易类型: ${typeStr}`)
  }
  console.log('[类型解析] 最终类型:', type, type === TransactionType.TRANSFER_IN ? '✓ 转入' : '✗ 其他')

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
  const tags = tagsStr
    ? tagsStr
        .split(';')
        .map((t) => t.trim())
        .filter((t) => t)
    : []

  // 解析日期 - 支持多种格式
  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined

    // 清理字符串：去除引号、多余空格
    const cleanedStr = dateStr
      .toString()
      .trim()
      .replace(/^['"]|['"]$/g, '')

    // 尝试多种格式
    // 注意：date-fns 的 parse 对模式串里的位数很严格 —— yyyy/MM/dd 只能匹配两位数的月份，
    // 而 Excel/Numbers 经常输出单位数月份（如 2026/5/31）。因此这里同时覆盖单/双位数、
    // 有秒/无秒、横线/斜线、ISO 等常见写法，确保 round-trip 不丢失日期。
    const formats = [
      'yyyy-MM-dd HH:mm:ss',
      'yyyy-MM-dd HH:mm',
      'yyyy-MM-dd',
      'yyyy/MM/dd HH:mm:ss',
      'yyyy/MM/dd HH:mm',
      'yyyy/MM/dd',
      // 单位数月/日（Excel、Numbers 导出的常见格式，如 2026/5/31 8:00）
      'yyyy/M/d HH:mm:ss',
      'yyyy/M/d HH:mm',
      'yyyy/M/d H:mm:ss',
      'yyyy/M/d H:mm',
      'yyyy/M/d',
      'yyyy-M-d HH:mm:ss',
      'yyyy-M-d HH:mm',
      'yyyy-M-d H:mm',
      'yyyy-M-d',
      "yyyy-MM-dd'T'HH:mm:ss",
      "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
    ]

    for (const format of formats) {
      try {
        const date = parse(cleanedStr, format, new Date())
        if (isValid(date)) {
          return date
        }
      } catch {
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
    updatedAt: parseDate(updatedAtStr),
  }
}

/**
 * 验证单个交易数据
 */
export function validateImportedTransaction(data: unknown): ValidationResult {
  const item = toImportRecord(data)
  const errors: string[] = []

  if (!item.accountId) {
    errors.push('缺少账户 ID')
  }

  if (!item.type) {
    errors.push('缺少交易类型')
  } else if (!Object.values(TransactionType).includes(item.type as TransactionType)) {
    errors.push('无效的交易类型')
  }

  if (!item.createdAt) {
    errors.push('缺少创建时间')
  } else {
    const date = item.createdAt instanceof Date ? item.createdAt : new Date(String(item.createdAt))
    if (!isValid(date)) {
      errors.push('创建时间格式无效')
    }
  }

  if (item.amount !== undefined) {
    if (typeof item.amount !== 'number') {
      errors.push('金额必须是数字')
    } else if (item.amount < 0) {
      errors.push('金额不能为负数')
    }
  }

  if (item.balance !== undefined) {
    if (typeof item.balance !== 'number') {
      errors.push('余额必须是数字')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 账户-月份数据接口
 */
interface AccountMonthData {
  transactionIds: string[]
  snapshotIds: string[]
}

/**
 * 检测导入数据与现有数据的月份重叠
 * @param existingTransactions 现有的交易记录
 * @param existingSnapshots 现有的快照记录
 * @param importedTransactions 导入的交易记录
 * @param importedSnapshots 导入的快照记录（如果有）
 * @returns Map<monthKey, AccountMonthData> 需要删除的数据
 */
export function detectOverlappingAccountMonths(
  existingTransactions: Transaction[],
  existingSnapshots: Snapshot[],
  importedTransactions: Transaction[],
  importedSnapshots: Snapshot[] | null
): Map<string, AccountMonthData> {
  const overlaps = new Map<string, AccountMonthData>()

  // 收集导入数据中的所有账户-月份组合
  const importedMonths = new Set<string>()

  importedTransactions.forEach((txn) => {
    const date = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
    const monthKey = `${txn.accountId}:${date.getFullYear()}:${date.getMonth()}`
    importedMonths.add(monthKey)
  })

  // 如果有导入的快照，也检查快照的月份
  if (importedSnapshots) {
    importedSnapshots.forEach((snap) => {
      const date = snap.snapshotDate instanceof Date
        ? snap.snapshotDate
        : new Date(snap.snapshotDate)
      const monthKey = `${snap.accountId}:${date.getFullYear()}:${date.getMonth()}`
      importedMonths.add(monthKey)
    })
  }

  // 检查现有交易是否在重叠的月份中
  existingTransactions.forEach((txn) => {
    const date = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
    const monthKey = `${txn.accountId}:${date.getFullYear()}:${date.getMonth()}`

    if (importedMonths.has(monthKey)) {
      if (!overlaps.has(monthKey)) {
        overlaps.set(monthKey, { transactionIds: [], snapshotIds: [] })
      }
      overlaps.get(monthKey)!.transactionIds.push(txn.id)
    }
  })

  // 检查现有快照是否在重叠的月份中
  existingSnapshots.forEach((snap) => {
    const date = snap.snapshotDate instanceof Date
      ? snap.snapshotDate
      : new Date(snap.snapshotDate)
    const monthKey = `${snap.accountId}:${date.getFullYear()}:${date.getMonth()}`

    if (importedMonths.has(monthKey)) {
      if (!overlaps.has(monthKey)) {
        overlaps.set(monthKey, { transactionIds: [], snapshotIds: [] })
      }
      overlaps.get(monthKey)!.snapshotIds.push(snap.id)
    }
  })

  return overlaps
}

/**
 * 导入交易数据到 store
 * 注意：此函数只处理非 SNAPSHOT 和非 TRANSFER_IN 类型的交易
 * SNAPSHOT 和 TRANSFER_IN 类型由调用方单独处理（通过 separateTransactionTypes 和 MonthlyDataService）
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
    // 新增字段：删除统计
    deleted: 0,
    deletedSnapshots: 0,
    deletedAccountMonths: [],
  }

  // ========== STEP 0: 检测月份重叠（不删除，只记录） ==========
  const existingSnapshots = useSnapshotStore.getState().snapshots
  const accountStore = useAccountStore.getState()

  // 将导入数据转换为 Transaction 格式（用于检测重叠）
  const importedTransactions: Transaction[] = importedData
    .filter((data) => data.accountId && data.type !== TransactionType.SNAPSHOT)
    .map((data) => ({
      id: uuidv4(),
      accountId: data.accountId!,
      type: data.type,
      amount: data.amount || 0,
      createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
      updatedAt: new Date(),
      description: data.description || '',
      tags: data.tags || [],
    }))

  // 检测月份重叠
  const overlaps = detectOverlappingAccountMonths(
    existingTransactions,
    existingSnapshots,
    importedTransactions,
    null // 快照在后面单独处理
  )

  // 记录需要删除的数据（不实际删除，由调用方决定）
  if (overlaps.size > 0) {
    overlaps.forEach((monthData, monthKey) => {
      const [accountId, year, month] = monthKey.split(':')
      const account = accountStore.getAccount(accountId)
      const accountName = account?.name || accountId

      // 记录需要删除的交易和快照数量
      result.deleted += monthData.transactionIds.length
      result.deletedSnapshots += monthData.snapshotIds.length

      // 记录需要删除的账户-月份信息
      result.deletedAccountMonths.push({
        accountId,
        accountName,
        year: parseInt(year),
        month: parseInt(month),
        deletedTransactionCount: monthData.transactionIds.length,
        deletedSnapshotCount: monthData.snapshotIds.length,
      })
    })
  }

  // ========== STEP 1: 继续原有的导入逻辑 ==========
  // 注意：由于调用方会先删除重叠数据，这里需要使用删除后的数据来检测重复
  // 但是为了保持原有逻辑不变，这里仍然使用传入的 existingTransactions
  // 如果有重叠数据存在，调用方负责在调用此函数前先删除

  // 创建业务主键映射：accountId + createdAt + type -> transactionId
  const businessKeyMap = new Map<string, string>()
  existingTransactions.forEach((t) => {
    // 将 createdAt 转换为字符串格式，确保时区一致
    const dateKey = formatDateKey(t.createdAt)
    const key = `${t.accountId}:${dateKey}:${t.type}` // 增加type到业务键
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

    // 检查是否已存在（根据 accountId + createdAt + type）
    const dateKey = formatDateKey(data.createdAt!)
    const businessKey = `${data.accountId}:${dateKey}:${data.type}` // 增加type到业务键

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
  if (
    data.type === TransactionType.SNAPSHOT &&
    balance === undefined &&
    data.amount !== undefined
  ) {
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
    updatedAt:
      data.updatedAt instanceof Date
        ? data.updatedAt
        : data.updatedAt
          ? new Date(data.updatedAt)
          : now,
  }
}

interface TransferEndpoints {
  sourceAccountId?: string
  targetAccountId?: string
}

function normalizeTransferAmount(amount: number | undefined): number | undefined {
  if (amount === undefined) {
    return undefined
  }

  return Math.abs(amount)
}

function getTransferTimestamp(value: Date | string | undefined): number | null {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  const time = date.getTime()
  return Number.isNaN(time) ? null : time
}

function resolveTransferEndpoints(data: TransactionImport): TransferEndpoints {
  if (data.type === TransactionType.TRANSFER_IN) {
    return {
      sourceAccountId: data.transferFromAccountId,
      targetAccountId: data.accountId,
    }
  }

  if (data.type === TransactionType.TRANSFER_OUT) {
    return {
      sourceAccountId: data.accountId,
      targetAccountId: data.transferToAccountId,
    }
  }

  if (data.type === TransactionType.TRANSFER) {
    if (data.accountId && data.transferToAccountId) {
      return {
        sourceAccountId: data.accountId,
        targetAccountId: data.transferToAccountId,
      }
    }

    if (data.transferFromAccountId && data.accountId) {
      return {
        sourceAccountId: data.transferFromAccountId,
        targetAccountId: data.accountId,
      }
    }
  }

  return {}
}

function buildTransferBusinessKey(data: TransactionImport): string | null {
  const { sourceAccountId, targetAccountId } = resolveTransferEndpoints(data)
  const timestamp = getTransferTimestamp(data.createdAt)
  const amount = normalizeTransferAmount(data.amount)

  if (!sourceAccountId || !targetAccountId || timestamp === null || amount === undefined) {
    return null
  }

  return `${sourceAccountId}:${targetAccountId}:${amount}:${timestamp}`
}

function createAutoTransferPairId(data: TransactionImport, index: number): string {
  const key = buildTransferBusinessKey(data)
  return key ? `auto-transfer-${key}` : `auto-transfer-${index + 1}`
}

export function expandImportedTransferPairs(importedData: TransactionImport[]): TransactionImport[] {
  const expanded: TransactionImport[] = []
  const explicitTransferSides = new Set<string>()

  importedData.forEach((data) => {
    const businessKey = buildTransferBusinessKey(data)
    if (!businessKey) {
      return
    }

    if (data.type === TransactionType.TRANSFER_IN || data.type === TransactionType.TRANSFER_OUT) {
      explicitTransferSides.add(`${data.type}:${businessKey}`)
    }
  })

  importedData.forEach((data, index) => {
    if (
      data.type !== TransactionType.TRANSFER &&
      data.type !== TransactionType.TRANSFER_IN &&
      data.type !== TransactionType.TRANSFER_OUT
    ) {
      expanded.push(data)
      return
    }

    const { sourceAccountId, targetAccountId } = resolveTransferEndpoints(data)
    const normalizedAmount = normalizeTransferAmount(data.amount)
    const pairId = data.transferPairId || createAutoTransferPairId(data, index)

    if (!sourceAccountId || !targetAccountId || normalizedAmount === undefined) {
      expanded.push({
        ...data,
        transferPairId: data.transferPairId || pairId,
      })
      return
    }

    const businessKey = buildTransferBusinessKey({
      ...data,
      amount: normalizedAmount,
      transferPairId: pairId,
    })

    if (data.type === TransactionType.TRANSFER) {
      expanded.push({
        ...data,
        accountId: sourceAccountId,
        type: TransactionType.TRANSFER_OUT,
        amount: normalizedAmount,
        transferToAccountId: targetAccountId,
        transferFromAccountId: undefined,
        transferPairId: pairId,
      })

      expanded.push({
        ...data,
        accountId: targetAccountId,
        type: TransactionType.TRANSFER_IN,
        amount: normalizedAmount,
        transferFromAccountId: sourceAccountId,
        transferToAccountId: undefined,
        transferPairId: pairId,
      })
      return
    }

    if (data.type === TransactionType.TRANSFER_IN) {
      expanded.push({
        ...data,
        amount: normalizedAmount,
        transferFromAccountId: sourceAccountId,
        transferPairId: pairId,
      })

      if (businessKey && !explicitTransferSides.has(`${TransactionType.TRANSFER_OUT}:${businessKey}`)) {
        expanded.push({
          ...data,
          accountId: sourceAccountId,
          type: TransactionType.TRANSFER_OUT,
          amount: normalizedAmount,
          transferToAccountId: targetAccountId,
          transferFromAccountId: undefined,
          transferPairId: pairId,
        })
      }
      return
    }

    expanded.push({
      ...data,
      amount: normalizedAmount,
      transferToAccountId: targetAccountId,
      transferPairId: pairId,
    })

    if (businessKey && !explicitTransferSides.has(`${TransactionType.TRANSFER_IN}:${businessKey}`)) {
      expanded.push({
        ...data,
        accountId: targetAccountId,
        type: TransactionType.TRANSFER_IN,
        amount: normalizedAmount,
        transferFromAccountId: sourceAccountId,
        transferToAccountId: undefined,
        transferPairId: pairId,
      })
    }
  })

  return expanded
}

/**
 * 分离三种交易类型：snapshot、transfer-in、其他
 * 用于导入时分别处理不同类型的交易
 *
 * @param importedData - 导入的交易数据
 * @returns 包含三种交易类型的对象
 */
export function separateTransactionTypes(
  importedData: TransactionImport[]
): {
  snapshots: TransactionImport[]
  transferIns: TransactionImport[]
  otherTransactions: TransactionImport[]
} {
  const snapshots: TransactionImport[] = []
  const transferIns: TransactionImport[] = []
  const otherTransactions: TransactionImport[] = []

  importedData.forEach((data) => {
    // 防御：跳过没有有效 accountId 的记录（解析失败的垃圾记录）
    if (!data.accountId) {
      console.warn('[导入分类] 跳过缺少 accountId 的记录', data)
      return
    }

    if (data.type === TransactionType.SNAPSHOT) {
      snapshots.push(data)
    } else if (data.type === TransactionType.TRANSFER_IN) {
      transferIns.push(data)
    } else {
      otherTransactions.push(data)
    }
  })

  return { snapshots, transferIns, otherTransactions }
}

/**
 * 计算每个快照对应月份的投资金额
 * 投资金额来自同月同账户的所有 transfer-in 类型交易的金额总和
 *
 * @param snapshots - 快照列表
 * @param transferIns - 转入列表
 * @returns Map<快照索引, 投资金额>
 */
export function calculateInvestmentAmounts(
  snapshots: TransactionImport[],
  transferIns: TransactionImport[]
): Map<number, number> {
  const investmentMap = new Map<number, number>()

  snapshots.forEach((snapshot, snapshotIndex) => {
    const snapshotAccountId = snapshot.accountId
    const snapshotDate = new Date(snapshot.createdAt!)
    const snapshotYear = snapshotDate.getFullYear()
    const snapshotMonth = snapshotDate.getMonth()

    // 累加同月同账户的转入金额
    const totalTransferIn = transferIns.reduce((sum, transferIn) => {
      if (transferIn.accountId !== snapshotAccountId) {
        return sum
      }

      const transferInDate = new Date(transferIn.createdAt!)
      const transferInYear = transferInDate.getFullYear()
      const transferInMonth = transferInDate.getMonth()

      // 判断是否为同月
      if (transferInYear === snapshotYear && transferInMonth === snapshotMonth) {
        return sum + (transferIn.amount || 0)
      }

      return sum
    }, 0)

    investmentMap.set(snapshotIndex, totalTransferIn)
  })

  return investmentMap
}
