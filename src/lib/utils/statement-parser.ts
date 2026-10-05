/**
 * 对账单（月度透视表）解析工具。
 *
 * 支持两类文件：
 *  1. CSV：券商/基金导出的对账单常在表格前有若干说明行（机构名、打印时间、
 *     客户信息等）。本工具自动扫描定位表头行，跳过说明行，直接给出干净的表格。
 *  2. PDF：按文本坐标重建表格（行按 y 聚类、列按 x 间距分割），输出 string[][]。
 *
 * 所有函数都是纯逻辑，便于单测。
 */

import { parseCSVLine, splitCSVLines } from '@/lib/utils/csv-parse'

/** 解析出的表格结构 */
export interface ParsedTable {
  /** 检测到的表头（可能为 null，如 PDF 无明显表头时） */
  headers: string[] | null
  /** 数据行（不含表头） */
  rows: string[][]
  /** CSV 场景：跳过的说明行数 */
  skippedLineCount: number
  /** 解析来源 */
  source: 'csv' | 'pdf'
  /** PDF 场景：总页数 */
  pdfPageCount?: number
  /** 使用的解析模式（蚂蚁基金交易明细 / 蚂蚁基金资产证明 / 通用） */
  parserMode?: 'ant-fund' | 'ant-asset' | 'generic'
}

/** PDF 文本块 */
export type PdfItem = { str: string; x: number; y: number; width: number }
/** PDF 视觉行（items 已按 x 排序） */
export type PdfLine = { page: number; y: number; items: PdfItem[] }
/** 一页的行集合 */
export type PdfPageLines = { page: number; lines: PdfLine[] }

/** 蚂蚁基金对账单：每页重复的页眉/页脚行，直接丢弃（资产证明页眉用半角括号） */
const ANT_DROP_PATTERNS = [
  /^蚂蚁[（(]杭州[）)]基金销售有限公司$/,
  /^基金交易明细$/,
  /^基金（含资产管理计划）交易明细$/,
  /^基金资产证明$/,
  /^基金（含资产管理计划）资产证明$/,
  /^\d+\s*\/\s*\d+$/,
]

/** 蚂蚁基金模式：文本块到列锚点的最大距离（超过视为游离文字丢弃） */
const ANT_COL_TOL = 40

/** 提取表头列锚点，并把 pdfjs 拆碎的表头块（如"基金名称"→"基金名"+"称"）合并。
 *  相邻列锚点间距一般 >30pt，距离 <12pt 的碎片合并回同一列。 */
function extractHeaderAnchors(
  pages: PdfPageLines[],
  isHeaderLine: (text: string) => boolean
): Array<{ name: string; x: number }> | null {
  let rawAnchors: Array<{ name: string; x: number }> | null = null
  for (const pg of pages) {
    for (const ln of pg.lines) {
      const text = ln.items.map((i) => i.str).join('')
      if (isHeaderLine(text)) {
        rawAnchors = ln.items.map((i) => ({ name: i.str.trim(), x: i.x }))
        break
      }
    }
    if (rawAnchors) break
  }
  if (!rawAnchors) return null

  const anchors: Array<{ name: string; x: number }> = []
  for (const a of [...rawAnchors].sort((p, q) => p.x - q.x)) {
    const prev = anchors[anchors.length - 1]
    if (prev && a.x - prev.x < 12) {
      prev.name += a.name
    } else {
      anchors.push({ ...a })
    }
  }
  return anchors
}

/** 行归列器：文本块按最近锚点归列（容差 40pt）。
 *  距所有锚点都超过容差的文本块（常见于换行基金名的缩进漂移）不再静默丢弃，
 *  作为游离文本返回，由调用方决定是否兜底回收。 */
function makeCellAssigner(anchors: Array<{ name: string; x: number }>) {
  return (ln: PdfLine): { cells: string[][]; dropped: PdfItem[] } => {
    const cells: string[][] = anchors.map(() => [])
    const dropped: PdfItem[] = []
    for (const it of ln.items) {
      let best = -1
      let bestD = Infinity
      for (let c = 0; c < anchors.length; c++) {
        const d = Math.abs(it.x - anchors[c].x)
        if (d < bestD) {
          bestD = d
          best = c
        }
      }
      if (bestD <= ANT_COL_TOL) cells[best].push(it.str)
      else dropped.push(it)
    }
    return { cells, dropped }
  }
}

/**
 * 蚂蚁基金交易明细专用解析（多行记录模式）。
 *
 * 该对账单特点：一条记录跨 3~5 个视觉行（订单号拆 4 段、基金名换行、日期折行），
 * 通用"一行=一条记录"算法必然错位。本算法：
 *  1) 从表头行（"订单号…确认日期"）取各列 x 锚点；
 *  2) 按订单号累计位数（32 位）切分记录边界——订单号满 32 位后的无数字行
 *     属于上条尾部换行或下条头部换行，按到上/下锚点的垂直距离就近归属；
 *  3) 记录内多视觉行按列锚点归列后拼接成单行。
 */
export function parseAntFundStatement(
  pages: PdfPageLines[],
  maxRows: number,
  pageCount: number
): ParsedTable {
  const empty: ParsedTable = {
    headers: null,
    rows: [],
    skippedLineCount: 0,
    source: 'pdf',
    pdfPageCount: pageCount,
    parserMode: 'ant-fund',
  }

  // ---- 表头行提取列锚点 ----
  const anchors = extractHeaderAnchors(
    pages,
    (t) => t.startsWith('订单号') && t.includes('确认日期')
  )
  if (!anchors) return empty

  const headerNames = anchors.map((a) => a.name)
  const toCells = makeCellAssigner(anchors)

  const isDropped = (ln: PdfLine): boolean => {
    const t = ln.items.map((i) => i.str).join('').trim()
    return ANT_DROP_PATTERNS.some((re) => re.test(t))
  }

  // ---- 记录切分（按订单号累计位数）----
  type RecordBlock = { lines: PdfLine[] }
  const records: RecordBlock[] = []
  let orderDigits = 0
  let footerStarted = false
  let pending: PdfLine[] = []

  const lastRecord = (): RecordBlock | null =>
    records.length > 0 ? records[records.length - 1] : null

  const startRecord = (): RecordBlock => {
    const rec = { lines: [] }
    records.push(rec)
    orderDigits = 0
    return rec
  }

  // 待判定行就近归属：距上条尾部近归上，距下条（首个带订单号数字的行）近归下
  const flushPending = (digitLine: PdfLine) => {
    if (pending.length === 0) return
    const prev = lastRecord()
    const oldLastY = prev && prev.lines.length ? prev.lines[prev.lines.length - 1].y : null
    const keep: PdfLine[] = []
    let belowY = digitLine.y
    for (let i = pending.length - 1; i >= 0; i--) {
      const p = pending[i]
      const aboveY = i === 0 ? oldLastY : pending[i - 1].y
      const dUp = aboveY == null ? Infinity : aboveY - p.y
      const dDown = p.y - belowY
      if (dUp <= dDown && prev) prev.lines.push(p)
      else keep.unshift(p)
      belowY = p.y
    }
    pending = keep
  }

  for (const pg of pages) {
    if (pg.page === 1) continue // 第 1 页是封面（只有页码）
    for (const ln of pg.lines) {
      const t = ln.items.map((i) => i.str).join('').trim()
      if (footerStarted) continue
      if (/^注\s*[:：]/.test(t)) {
        footerStarted = true
        continue
      }
      if (isDropped(ln)) continue
      if (t.startsWith('订单号') && t.includes('确认日期')) continue // 页内重复表头

      const col1 = toCells(ln).cells[0].join('')
      const digits = col1.replace(/\D/g, '').length
      const isDateFragment = /^202\d{5}$/.test(col1)
      if (
        records.length === 0 ||
        (digits > 0 && (orderDigits >= 32 || (isDateFragment && orderDigits > 0)))
      ) {
        flushPending(ln)
        const rec = startRecord()
        for (const p of pending) rec.lines.push(p)
        pending = []
        rec.lines.push(ln)
        orderDigits += digits
      } else if (digits === 0 && orderDigits >= 32) {
        pending.push(ln)
      } else {
        lastRecord()!.lines.push(ln)
        orderDigits += digits
      }
    }
  }
  if (pending.length) {
    const prev = lastRecord()
    if (prev) prev.lines.push(...pending)
  }

  // ---- 每个记录块拼接为单行 ----
  const fundNameIndex = Math.max(headerNames.indexOf('基金名称'), 3) // 标准布局第4列
  const codeIndex = headerNames.indexOf('基金代码')
  const confirmAmountIndex = headerNames.indexOf('确认金额')
  const confirmDateIndex = headerNames.indexOf('确认日期')
  const rawRows: string[][] = []
  for (const rec of records) {
    const cols: string[][] = anchors.map(() => [])
    const droppedNameFrags: string[] = []
    for (const ln of rec.lines) {
      const { cells, dropped } = toCells(ln)
      for (let c = 0; c < anchors.length; c++) cols[c].push(...cells[c])
      // 基金名称是表格中唯一的长中文自由文本列：游离文本若含中文，
      // 按阅读顺序留作名称列兜底，避免名称因锚点容差不足而静默丢失
      for (const it of dropped) {
        if (/[\u4e00-\u9fff]/.test(it.str)) droppedNameFrags.push(it.str)
      }
    }
    const row = cols.map((frags) => frags.join('').replace(/\s+/g, ' ').trim())
    if (row.every((c) => c === '')) continue
    if (/^\d{20,40}$/.test(row[0])) {
      if (row[fundNameIndex] === '' && droppedNameFrags.length > 0) {
        row[fundNameIndex] = droppedNameFrags.join('').replace(/\s+/g, ' ').trim()
      }
      rawRows.push(row)
    }
  }

  // ---- 输出标准化：账户名称/基金代码/确认金额/日期（当月最后一天）/交易类型 ----
  // 确认日期（T+1 确认日）统一归到当月最后一天，交易类型统一为 transfer_in（转入）。
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateToMonthEnd = (raw: string): string => {
    const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/.exec(raw)
    if (!m) return raw
    const y = Number(m[1])
    const mo = Number(m[2])
    const lastDay = new Date(y, mo, 0).getDate() // Date 的 month 为 0 基
    return `${y}/${pad(mo)}/${pad(lastDay)}`
  }
  const outRows = rawRows.map((row) => [
    row[fundNameIndex] ?? '',
    row[codeIndex] ?? '',
    row[confirmAmountIndex] ?? '',
    confirmDateIndex >= 0 ? dateToMonthEnd(row[confirmDateIndex] ?? '') : '',
    'transfer_in',
  ])

  return {
    headers: ['账户名称', '基金代码', '确认金额', '日期', '交易类型'],
    rows: maxRows > 0 ? outRows.slice(0, maxRows) : outRows,
    skippedLineCount: 0,
    source: 'pdf',
    pdfPageCount: pageCount,
    parserMode: 'ant-fund',
  }
}

/** 蚂蚁基金资产证明中名称换行片段与主行的最大垂直距离（超过视为页眉/页脚丢弃） */
const ANT_ASSET_NAME_TOL = 12

/**
 * 蚂蚁基金"资产证明"（持仓快照）专用解析。
 *
 * 该对账单特点：每条持仓记录一个主行（序号列为 1~3 位数字），基金名称过长时
 * 换行片段在主行的上方或下方独立成视觉行（距主行 4~5pt）。通用
 * "一行=一条记录"算法会把主行与名称行拆开，导致主行名称列为空。
 * 本算法：无序号行（名称换行、页眉等）先挂起，遇到下一个主行时按垂直距离
 * 就近归属（≤12pt 归相邻主行，否则丢弃——页眉/页脚/封面文字均远超此距离）。
 */
export function parseAntFundAssetStatement(
  pages: PdfPageLines[],
  maxRows: number,
  pageCount: number
): ParsedTable {
  const empty: ParsedTable = {
    headers: null,
    rows: [],
    skippedLineCount: 0,
    source: 'pdf',
    pdfPageCount: pageCount,
    parserMode: 'ant-asset',
  }

  const anchors = extractHeaderAnchors(
    pages,
    (t) => t.includes('基金名称') && t.includes('资产小计')
  )
  if (!anchors) return empty

  const headerNames = anchors.map((a) => a.name)
  const toCells = makeCellAssigner(anchors)

  const isDropped = (ln: PdfLine): boolean => {
    const t = ln.items.map((i) => i.str).join('').trim()
    return ANT_DROP_PATTERNS.some((re) => re.test(t))
  }
  const isHeaderRow = (ln: PdfLine): boolean => {
    const t = ln.items.map((i) => i.str).join('')
    return t.includes('基金名称') && t.includes('资产小计')
  }
  /** 主数据行：序号列（首列）为 1~3 位纯数字 */
  const isMainRow = (ln: PdfLine): boolean => /^\d{1,3}$/.test(toCells(ln).cells[0].join(''))

  type RecordBlock = { lines: PdfLine[]; mainY: number; page: number }
  const records: RecordBlock[] = []
  let pending: PdfLine[] = []
  let footerStarted = false

  for (const pg of pages) {
    for (const ln of pg.lines) {
      if (footerStarted) continue
      const t = ln.items.map((i) => i.str).join('').trim()
      if (/^注\s*[:：]/.test(t)) {
        footerStarted = true
        continue
      }
      if (isDropped(ln) || isHeaderRow(ln)) continue

      if (isMainRow(ln)) {
        const rec: RecordBlock = { lines: [ln], mainY: ln.y, page: ln.page }
        // 挂起行（名称换行/页眉/封面文字）就近归属：跨页不可比 y，直接排除
        // （封面页文字与首页主行的 y 差可能恰好落在容差内）；同页时距新主行
        // ≤ 容差归新记录，距上一条主行 ≤ 容差归上条，否则丢弃
        for (const p of pending) {
          const dNew = p.page === rec.page ? Math.abs(p.y - rec.mainY) : Infinity
          const prev = records[records.length - 1]
          const dPrev = prev && p.page === prev.page ? Math.abs(p.y - prev.mainY) : Infinity
          if (dNew <= dPrev && dNew <= ANT_ASSET_NAME_TOL) rec.lines.push(p)
          else if (dPrev < dNew && dPrev <= ANT_ASSET_NAME_TOL) prev!.lines.push(p)
        }
        pending = []
        records.push(rec)
      } else {
        pending.push(ln)
      }
    }
  }

  // 末条记录的下方换行行仍在 pending 中（其后是"注:"页脚），按距离归属（须同页）
  const lastRec = records[records.length - 1]
  if (lastRec) {
    for (const p of pending) {
      if (
        p.page === lastRec.page &&
        Math.abs(p.y - lastRec.mainY) <= ANT_ASSET_NAME_TOL
      ) {
        lastRec.lines.push(p)
      }
    }
  }

  // 每个记录块：行按阅读顺序（页序+从上到下）拼接；名称列空时用游离中文兜底
  const fundNameIndex = headerNames.indexOf('基金名称')
  const codeIndex = headerNames.indexOf('基金代码')
  const subtotalIndex = headerNames.indexOf('资产小计')
  const navDateIndex = headerNames.indexOf('单位净值日期')
  const rawRows: string[][] = []
  for (const rec of records) {
    rec.lines.sort((a, b) => b.y - a.y) // 恢复页内阅读顺序（名称行距主行 ≤12pt，不会跨页拆分）
    const cols: string[][] = anchors.map(() => [])
    const droppedNameFrags: string[] = []
    for (const ln of rec.lines) {
      const { cells, dropped } = toCells(ln)
      for (let c = 0; c < anchors.length; c++) cols[c].push(...cells[c])
      for (const it of dropped) {
        if (/[\u4e00-\u9fff]/.test(it.str)) droppedNameFrags.push(it.str)
      }
    }
    const row = cols.map((frags) => frags.join('').replace(/\s+/g, ' ').trim())
    if (row[fundNameIndex] === '' && droppedNameFrags.length > 0) {
      row[fundNameIndex] = droppedNameFrags.join('').replace(/\s+/g, ' ').trim()
    }
    rawRows.push(row)
  }

  // ---- 输出标准化：只保留月末快照需要的 5 列，日期统一为当月最后一天 ----
  // QDII 基金的净值常滞后一天（如 0929），作为月末快照统一归到当月末（0930）。
  // "日期"取封面"截止至 yyyy-mm-dd"（资产证明的基准日）的当月最后一天；
  // 封面缺失时回退到首条净值日期的月末。
  const pad = (n: number) => String(n).padStart(2, '0')
  const toMonthEnd = (yyyy: number, mm: number): string => {
    const lastDay = new Date(yyyy, mm, 0).getDate() // Date 的 month 为 0 基：new Date(y, m, 0) 即 m 月最后一天
    return `${yyyy}/${pad(mm)}/${pad(lastDay)}`
  }
  const navDateToMonthEnd = (raw: string): string => {
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(raw)
    if (!m) return raw
    return toMonthEnd(Number(m[1]), Number(m[2]))
  }

  let snapshotDate = ''
  for (const pg of pages) {
    for (const ln of pg.lines) {
      const m = /截止至\s*(\d{4})-(\d{1,2})-(\d{1,2})/.exec(ln.items.map((i) => i.str).join(''))
      if (m) {
        snapshotDate = toMonthEnd(Number(m[1]), Number(m[2]))
        break
      }
    }
    if (snapshotDate) break
  }
  if (!snapshotDate && rawRows.length > 0 && navDateIndex >= 0) {
    snapshotDate = navDateToMonthEnd(rawRows[0][navDateIndex])
  }

  const outRows = rawRows.map((row) => [
    row[fundNameIndex] ?? '',
    row[codeIndex] ?? '',
    row[subtotalIndex] ?? '',
    snapshotDate,
  ])

  return {
    headers: ['账户名称', '基金代码', '快照金额', '快照日期'],
    rows: maxRows > 0 ? outRows.slice(0, maxRows) : outRows,
    skippedLineCount: 0,
    source: 'pdf',
    pdfPageCount: pageCount,
    parserMode: 'ant-asset',
  }
}

/** 表头关键词（命中越多越像表头行） */
const HEADER_KEYWORDS = [
  '账户', '账户名', '账户名称', '产品', '产品名称', '名称', '客户',
  '日期', '时间', '截止日期', '对账日期', '估值日期', 'date',
  '金额', '余额', '市值', '市场价值', '总市值', '资产', '总资产', '快照',
  '净值', '单位净值', '累计净值', 'nav',
  '份额', '持有份额', '持仓份额', '持有数量',
  '克', '克数', '均价', '买入均价', '市场均价',
  '代码', '基金代码', '产品代码', '证券代码', 'code',
  '币种', '货币', '类型', '备注', '状态', 'account', 'fund', 'balance', 'amount',
]

/** 判断一行是否像表头：字段数≥2 且关键词命中率足够 */
function looksLikeHeader(fields: string[]): boolean {
  const nonEmpty = fields.filter((f) => f.trim() !== '')
  if (nonEmpty.length < 2) return false

  let hits = 0
  for (const field of nonEmpty) {
    const normalized = field.trim().toLowerCase()
    if (HEADER_KEYWORDS.some((kw) => normalized === kw || normalized.includes(kw))) {
      hits++
    }
  }

  // 至少命中 2 个关键词，且命中比例 ≥ 40%
  return hits >= 2 && hits >= Math.ceil(nonEmpty.length * 0.4)
}

/** 判断一行是否像数据行（用于表头之后过滤页脚/合计说明行） */
function looksLikeDataRow(fields: string[], headerFieldCount: number): boolean {
  const nonEmpty = fields.filter((f) => f.trim() !== '')
  if (nonEmpty.length === 0) return false
  // 字段数至少达到表头的一半（对齐的表格行）
  return nonEmpty.length >= Math.max(2, Math.ceil(headerFieldCount * 0.5))
}

/**
 * 解析 CSV 文本：自动跳过说明行，定位表头，返回干净表格。
 *
 * @param content CSV 文件全文
 * @param maxRows 最多返回的数据行数（0 = 不限）
 */
export function parseStatementCSV(content: string, maxRows = 0): ParsedTable {
  const lines = splitCSVLines(content)

  // 分隔符沿用现有导入的检测逻辑（;, \t 中取最多）
  const detectDelimiter = (line: string): string => {
    const candidates = [';', '\t', ',']
    let best = ','
    let bestCount = 0
    for (const d of candidates) {
      const count = (line.match(new RegExp(`\\${d}`, 'g')) || []).length
      if (count > bestCount) {
        bestCount = count
        best = d
      }
    }
    return best
  }

  // 逐行扫描找表头（最多扫前 40 行，说明行一般不会太长）
  const scanLimit = Math.min(lines.length, 40)
  let headerIndex = -1
  let delimiter = ','

  for (let i = 0; i < scanLimit; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue

    const candidateDelimiter = detectDelimiter(line)
    const fields = parseCSVLine(line, candidateDelimiter)

    if (looksLikeHeader(fields)) {
      headerIndex = i
      delimiter = candidateDelimiter
      break
    }
  }

  // 情况A：找到表头 → 表头行之后的都是数据行
  if (headerIndex >= 0) {
    const headers = parseCSVLine(lines[headerIndex], delimiter).map((h) => h.trim())
    const headerFieldCount = headers.filter((h) => h !== '').length

    const rows: string[][] = []
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line || !line.trim()) continue
      const fields = parseCSVLine(line, delimiter)
      if (!looksLikeDataRow(fields, headerFieldCount)) continue
      rows.push(fields)
    }

    return {
      headers,
      rows: maxRows > 0 ? rows.slice(0, maxRows) : rows,
      skippedLineCount: headerIndex,
      source: 'csv',
    }
  }

  // 情况B：没找到明显表头 → 取"字段数最多的行"作为表头（兜底）
  let bestIndex = -1
  let bestFieldCount = 1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue
    const d = detectDelimiter(line)
    const count = parseCSVLine(line, d).filter((f) => f.trim() !== '').length
    if (count > bestFieldCount) {
      bestFieldCount = count
      bestIndex = i
      delimiter = d
    }
  }

  if (bestIndex < 0) {
    return { headers: null, rows: [], skippedLineCount: 0, source: 'csv' }
  }

  const headers = parseCSVLine(lines[bestIndex], delimiter).map((h) => h.trim())
  const rows: string[][] = []
  for (let i = bestIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue
    const fields = parseCSVLine(line, delimiter)
    if (fields.filter((f) => f.trim() !== '').length < 2) continue
    rows.push(fields)
  }

  return {
    headers,
    rows: maxRows > 0 ? rows.slice(0, maxRows) : rows,
    skippedLineCount: bestIndex,
    source: 'csv',
  }
}

/**
 * 解析 PDF 文件：按文本坐标重建表格。
 * 行：y 坐标相差 < 行高阈值 归为同一行；
 * 列：行内相邻文本块 x 间距 > 列间距阈值 则分列。
 *
 * @param file PDF 文件（File 对象）
 * @param maxRows 最多返回的数据行数（0 = 不限）
 */
export async function parseStatementPDF(
  file: File,
  maxRows = 0
): Promise<ParsedTable> {
  const pdfjsLib = await import('pdfjs-dist')
  // worker 用 public/ 下的同源静态文件（dev 的 localhost 与打包后的 app:// 协议都适用）。
  // 注意：public/pdf.worker.min.mjs 的版本必须与 pdfjs-dist 包版本一致（升级依赖时需同步复制）。
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    '/pdf.worker.min.mjs',
    window.location.origin
  ).href

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({
    data: buffer,
    // 中文 PDF 常用 CID 字体，需要 cmap 映射文件（public/pdfjs-cmaps/）
    cMapUrl: new URL('/pdfjs-cmaps/', window.location.origin).href,
    cMapPacked: true,
  }).promise

  // ===== 阶段1：收集所有页的行聚类数据 =====
  const allPages: PdfPageLines[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    const items: PdfItem[] = []
    for (const item of textContent.items as Array<{
      str: string
      transform: number[]
      width: number
    }>) {
      if (!item.str || !item.str.trim()) continue
      items.push({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width || 0,
      })
    }

    if (items.length === 0) {
      allPages.push({ page: pageNum, lines: [] })
      continue
    }

    // 按行聚类：从上到下（y 大的在前），y 相差 < 3.2pt 归同行
    items.sort((a, b) => (Math.abs(b.y - a.y) > 3.2 ? b.y - a.y : a.x - b.x))

    const lines: PdfLine[] = []
    let cur: PdfLine | null = null
    for (const item of items) {
      if (!cur || Math.abs(cur.y - item.y) > 3.2) {
        cur = { page: pageNum, y: item.y, items: [] }
        lines.push(cur)
      }
      cur.items.push(item)
    }
    for (const ln of lines) ln.items.sort((a, b) => a.x - b.x)
    allPages.push({ page: pageNum, lines })
  }

  // ===== 阶段2：检测蚂蚁基金对账单模式 =====
  const lineTextOf = (ln: PdfLine) => ln.items.map((i) => i.str).join('')
  const isAntFund = allPages.some((pg) =>
    pg.lines.some((ln) => {
      const t = lineTextOf(ln)
      return t.startsWith('订单号') && t.includes('确认日期')
    })
  )
  if (isAntFund) {
    return parseAntFundStatement(allPages, maxRows, pdf.numPages)
  }

  // 蚂蚁基金"资产证明"（持仓快照，表头含"基金名称…资产小计"）
  const isAntAsset = allPages.some((pg) =>
    pg.lines.some((ln) => {
      const t = lineTextOf(ln)
      return t.includes('基金名称') && t.includes('资产小计')
    })
  )
  if (isAntAsset) {
    return parseAntFundAssetStatement(allPages, maxRows, pdf.numPages)
  }

  // ===== 通用模式：全局列锚点分列 =====
  const allRows: string[][] = []

  for (const { lines: lineGroups } of allPages) {
    // 步骤1：行内预拼接——相邻文本块 gap ≤ 4pt 视为同一单元格内容（长名称/中文被拆块），
    //        拼接成一个逻辑块（起点=首块起点，宽度=累加），避免长文本被误判成多列。
    const mergedLineGroups: Array<Array<{ x: number; y: number; width: number; text: string }>> =
      []

    for (const group of lineGroups) {
      // lineGroups 重构后是 PdfLine 对象数组，文本块在 items 里
      group.items.sort((a, b) => a.x - b.x)
      const merged: Array<{ x: number; y: number; width: number; text: string }> = []

      for (const item of group.items) {
        const prev = merged[merged.length - 1]
        if (prev) {
          const gap = item.x - (prev.x + prev.width)
          if (gap <= 4) {
            const needsSpace =
              /[A-Za-z0-9.,)%]$/.test(prev.text) && /^[A-Za-z0-9(]/.test(item.str)
            prev.text += needsSpace ? ` ${item.str}` : item.str
            prev.width = item.x + item.width - prev.x
            continue
          }
        }
        merged.push({ x: item.x, y: item.y, width: item.width, text: item.str })
      }

      mergedLineGroups.push(merged)
    }

    // 步骤2：全局锚点聚类——用块"起点 x"（左对齐文本列起点稳定；
    //        右对齐数字列起点漂移在容差内）。
    const CLUSTER_GAP = 14 // 起点间距 ≤14pt 视为同一列

    const sortedStarts = mergedLineGroups
      .flat()
      .map((b) => b.x)
      .sort((a, b) => a - b)
    const anchorClusters: number[][] = []
    let currentCluster: number[] = []

    for (const sx of sortedStarts) {
      if (currentCluster.length === 0) {
        currentCluster.push(sx)
        continue
      }
      if (sx - currentCluster[currentCluster.length - 1] <= CLUSTER_GAP) {
        currentCluster.push(sx)
      } else {
        anchorClusters.push(currentCluster)
        currentCluster = [sx]
      }
    }
    if (currentCluster.length > 0) anchorClusters.push(currentCluster)

    // 每个锚点取簇平均值，按 x 升序
    const anchors = anchorClusters
      .map((cluster) => cluster.reduce((s, v) => s + v, 0) / cluster.length)
      .sort((a, b) => a - b)

    // 步骤3：每行的块归到最近锚点列；同行同列多块按序拼接
    const rows: string[][] = []
    for (const group of mergedLineGroups) {
      const cellsByAnchor = new Map<number, { x: number; text: string }[]>()

      for (const block of group) {
        // 找最近的锚点列
        let nearestIndex = 0
        let nearestDist = Infinity
        for (let a = 0; a < anchors.length; a++) {
          const dist = Math.abs(block.x - anchors[a])
          if (dist < nearestDist) {
            nearestDist = dist
            nearestIndex = a
          }
        }
        const bucket = cellsByAnchor.get(nearestIndex) ?? []
        bucket.push({ x: block.x, text: block.text })
        cellsByAnchor.set(nearestIndex, bucket)
      }

      // 按锚点顺序组装行，同列多块拼接
      const cells: string[] = []
      for (let a = 0; a < anchors.length; a++) {
        const bucket = cellsByAnchor.get(a)
        if (!bucket) {
          cells.push('')
          continue
        }
        bucket.sort((p, q) => p.x - q.x)
        let text = ''
        for (const part of bucket) {
          if (text === '') {
            text = part.text
          } else {
            // 英文/数字块之间补空格，中文直接拼接（PDF 常把中文拆成小块）
            const needsSpace =
              /[A-Za-z0-9.,)%]$/.test(text) && /^[A-Za-z0-9(]/.test(part.text)
            text += needsSpace ? ` ${part.text}` : part.text
          }
        }
        cells.push(text.trim())
      }

      // 去掉首尾全空的列，保留中间空列（保证列对齐）
      let first = 0
      let last = cells.length - 1
      while (first < last && cells[first] === '') first++
      while (last > first && cells[last] === '') last--
      const trimmed = cells.slice(first, last + 1)

      if (trimmed.filter((c) => c !== '').length >= 2) {
        rows.push(trimmed)
      }
    }

    allRows.push(...rows)
  }

  // 第一行若像表头则单独返回
  const firstLine = allRows[0]
  let headers: string[] | null = null
  let dataRows = allRows

  if (firstLine && looksLikeHeader(firstLine)) {
    headers = firstLine.map((h) => h.trim())
    dataRows = allRows.slice(1)
  }

  return {
    headers,
    rows: maxRows > 0 ? dataRows.slice(0, maxRows) : dataRows,
    skippedLineCount: 0,
    source: 'pdf',
    pdfPageCount: pdf.numPages,
  }
}

/** 统一入口：根据文件扩展名选择解析器 */
export async function parseStatementFile(file: File, maxRows = 0): Promise<ParsedTable> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') {
    return parseStatementPDF(file, maxRows)
  }
  // 其余按文本（CSV/TSV/TXT）处理
  const content = await file.text()
  return parseStatementCSV(content, maxRows)
}
