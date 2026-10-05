/**
 * CSV验证工具
 */

import { countCSVFields, parseCSVLine, splitCSVLines } from '@/lib/utils/csv-parse'

/**
 * 检测CSV可能处于筛选状态
 */
export function detectPotentialFilterIssues(content: string): {
  hasIssue: boolean
  warnings: string[]
  suggestions: string[]
} {
  const warnings: string[] = []
  const suggestions: string[] = []
  let hasIssue = false

  // 引号感知的行拆分：避免引号字段内部的换行符被误判为记录分隔符，
  // 否则会把一条合法记录拆成多行，进而误报"列数不一致"。
  const lines = splitCSVLines(content)

  if (lines.length < 2) {
    return {
      hasIssue: true,
      warnings: ['CSV文件为空或只有表头'],
      suggestions: ['请确保CSV文件包含数据行']
    }
  }

  // 检查1：行数是否过少（可能被筛选）
  if (lines.length < 10) {
    hasIssue = true
    warnings.push(`CSV只有 ${lines.length - 1} 行数据，可能处于筛选状态`)
    suggestions.push('清除Excel/Numbers中的筛选，显示所有行后重新保存')
  }

  // 检查2：是否有空行（可能是被隐藏的行）
  const emptyLines = lines.filter((line, index) => {
    if (index === 0) return false // 跳过表头
    return line.trim() === '' || parseCSVLine(line).every((cell) => !cell.trim())
  })

  if (emptyLines.length > 0) {
    hasIssue = true
    warnings.push(`发现 ${emptyLines.length} 个空行`)
    suggestions.push('检查是否有被筛选隐藏的行')
  }

  // 检查3：每行列数是否一致（引号感知，避免被字段内部的逗号误导）
  const firstLineCols = countCSVFields(lines[0])
  const inconsistentLines = lines.filter((line, index) => {
    if (index === 0) return false
    return countCSVFields(line) !== firstLineCols
  })

  if (inconsistentLines.length > 0) {
    hasIssue = true
    warnings.push(`${inconsistentLines.length} 行的列数与表头不一致`)
    suggestions.push('确保所有行都有完整的列数据')
  }

  return {
    hasIssue,
    warnings,
    suggestions
  }
}

/**
 * 获取CSV基本信息
 */
export function getCSVMetaInfo(content: string): {
  totalRows: number
  dataRows: number
  columns: number
  hasHeader: boolean
  columnNames: string[]
} {
  const lines = splitCSVLines(content)

  if (lines.length === 0) {
    return {
      totalRows: 0,
      dataRows: 0,
      columns: 0,
      hasHeader: false,
      columnNames: []
    }
  }

  const headers = parseCSVLine(lines[0])

  return {
    totalRows: lines.length,
    dataRows: lines.length - 1,
    columns: headers.length,
    hasHeader: true,
    columnNames: headers
  }
}
