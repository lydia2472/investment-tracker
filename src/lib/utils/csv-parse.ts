/**
 * CSV 解析公共工具。
 *
 * 这里实现的解析符合 RFC 4180 对带引号字段的处理约定：
 * - 字段可以用双引号包裹
 * - 引号包裹的字段内部可以包含逗号、换行符（\n / \r\n）和双引号
 * - 字段内部的字面双引号用两个连续的双引号 "" 转义
 *
 * 历史上各导入器直接用 `content.split('\n')` 拆行，会错误地把引号内部的换行符
 * 当成记录分隔符，导致一行数据被拆成多行、列数与表头不一致，进而触发解析失败、
 * 产生垃圾记录。本模块提供统一的、引号感知的拆分能力来根除这一问题。
 */

/**
 * 将 CSV 内容拆分为"记录"（行）字符串数组。
 *
 * 注意：返回的每个元素仍是未拆分字段的原始行文本（可能仍包含逗号和引号），
 * 需要再调用 parseCSVLine 做字段拆分。这里只负责正确地识别记录边界。
 *
 * 行尾约定：
 * - 同时支持 `\n` 与 `\r\n`
 * - 去除文件开头的 BOM
 * - 去除首尾空白行后，保留中间的空行（空行的判断交给上层）
 */
export function splitCSVLines(content: string): string[] {
  const trimmed = content.replace(/^\uFEFF/, '').trim()
  if (!trimmed) return []

  const lines: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]

    if (char === '"') {
      // 处理转义的双引号 "" —— 属于当前字段，不切换引号状态
      if (inQuotes && trimmed[i + 1] === '"') {
        current += '""'
        i++
        continue
      }
      inQuotes = !inQuotes
      current += char
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      // 统一处理 \r\n 与 \n：遇到 \r\n 时跳过紧随的 \n
      if (char === '\r' && trimmed[i + 1] === '\n') {
        i++
      }
      lines.push(current)
      current = ''
      continue
    }

    current += char
  }

  // 推入最后一段
  if (current.length > 0) {
    lines.push(current)
  }

  return lines
}

/**
 * 将一行 CSV 文本拆分为字段数组（引号感知）。
 *
 * @param line   单行 CSV 文本（通常是 splitCSVLines 的某个元素）
 * @param delimiter 字段分隔符，默认为逗号
 */
export function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 转义的双引号
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
 * 计算一行 CSV 文本的字段数量（引号感知）。
 *
 * 用于校验场景：需要在不实际拆分字段的前提下判断列数是否与表头一致，
 * 同时避免被引号内部的逗号误导。
 *
 * @param line     单行 CSV 文本
 * @param delimiter 字段分隔符，默认为逗号
 */
export function countCSVFields(line: string, delimiter: string = ','): number {
  return parseCSVLine(line, delimiter).length
}
