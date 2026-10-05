/**
 * 对账单解析回归测试（纯函数层）
 *
 * 固化蚂蚁基金"基金交易明细"PDF 的解析结果：
 * fixture 为从真实对账单（21 页 / 316 条记录）提取的文本坐标数据
 * （scripts/fixtures/ant-fund-statement-lines.json，由 pdfjs 提取）。
 *
 * 覆盖：
 *   1. 蚂蚁基金模式识别与表头列名
 *   2. 316 条记录全部识别、订单号完整（32 位）
 *   3. 基金名称列无空值（多行记录的名称换行正确拼接）
 *   4. 抽查首尾记录的列内容
 *   5. 表头锚点碎片合并（pdfjs 拆块时锚点不错乱）
 *   6. 游离文本自愈兜底（名称缩进漂移超容差时不丢失）
 *
 * 运行：npm run test:statement-parser
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  parseAntFundAssetStatement,
  parseAntFundStatement,
  parseStatementCSV,
  type PdfPageLines,
} from '@/lib/utils/statement-parser'

// ============================================================
// 测试结果统计
// ============================================================
let passed = 0
let failed = 0
const failures: string[] = []

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    failures.push(detail ? `${name} — ${detail}` : name)
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// ============================================================
// 1. 真实对账单 fixture
// ============================================================
console.log('\n[1] 蚂蚁基金对账单 fixture 解析')

const fixturePath = path.resolve(import.meta.dirname, 'fixtures', 'ant-fund-statement-lines.json')
const pages = JSON.parse(readFileSync(fixturePath, 'utf-8')) as PdfPageLines[]
const parsed = parseAntFundStatement(pages, 0, pages.length)

check('识别为蚂蚁基金模式', parsed.parserMode === 'ant-fund')
check(
  '输出为标准 5 列（账户名称/基金代码/确认金额/日期/交易类型）',
  parsed.headers?.join(',') === '账户名称,基金代码,确认金额,日期,交易类型',
  JSON.stringify(parsed.headers)
)

const rows = parsed.rows
check('记录数完整（316 条）', rows.length === 316, `实际 ${rows.length}`)

check(
  '账户名称列无空值',
  rows.every((r) => r[0] !== '' && r[0] !== undefined),
  `空名称行数: ${rows.filter((r) => !r[0]).length}`
)
check('交易类型全部为 transfer_in', rows.every((r) => r[4] === 'transfer_in'))
check(
  '确认金额全部为有效数字',
  rows.every((r) => !isNaN(parseFloat(r[2])))
)

// 日期列：原始确认日期（T+1，如 2026/09/29）统一归到所在月份的最后一天
check(
  '日期统一为所在月最后一天',
  rows.every((r) => {
    const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(r[3])
    if (!m) return false
    return Number(m[3]) === new Date(Number(m[1]), Number(m[2]), 0).getDate()
  })
)
check(
  '涉及月份为 7/8/9 月末',
  [...new Set(rows.map((r) => r[3]))].sort().join(',') === '2026/07/31,2026/08/31,2026/09/30',
  [...new Set(rows.map((r) => r[3]))].sort().join(',')
)

// 长名称（跨 5 个视觉行换行）正确拼接
check(
  '长名称正确拼接（前海开源…混合C）',
  rows[0][0] === '前海开源沪港深核心资源灵活配置混合C',
  rows[0][0]
)
check(
  '含英文括号名称（QDII）',
  rows[1][0] === '广发全球精选股票(QDII)A',
  rows[1][0]
)
check(
  '末行名称正确（华夏中证500ETF联接A）',
  rows[rows.length - 1][0] === '华夏中证500ETF联接A',
  rows[rows.length - 1][0]
)
// 抽查首行完整内容
check(
  '首行完整内容',
  rows[0].join('|') === '前海开源沪港深核心资源灵活配置混合C|003305|500.00|2026/09/30|transfer_in',
  rows[0].join('|')
)

// ============================================================
// 2. 表头锚点碎片合并
// ============================================================
console.log('\n[2] 表头锚点碎片合并')

{
  // 把表头"基金名称"拆成两个文本块（间距 6pt < 12pt 合并阈值）
  const headerLine = pages
    .find((p) => p.page === 2)!
    .lines.find((ln) => {
      const t = ln.items.map((i) => i.str).join('')
      return t.startsWith('订单号') && t.includes('确认日期')
    })!
  const splitItems: typeof headerLine.items = []
  for (const it of headerLine.items) {
    if (it.str === '基金名称') {
      const half = it.str.length / 2
      splitItems.push({ ...it, str: it.str.slice(0, half) })
      splitItems.push({ ...it, x: it.x + 6, str: it.str.slice(half) })
    } else {
      splitItems.push(it)
    }
  }
  const mutated: PdfPageLines[] = pages.map((p) =>
    p.page === 2
      ? { ...p, lines: p.lines.map((ln) => (ln === headerLine ? { ...ln, items: splitItems } : ln)) }
      : p
  )
  const r = parseAntFundStatement(mutated, 0, mutated.length)
  check('拆分表头解析行数不变', r.rows.length === 316, `实际 ${r.rows.length}`)
  check(
    '拆分表头后名称归列仍正确',
    r.rows[0][0] === '前海开源沪港深核心资源灵活配置混合C',
    r.rows[0][0]
  )
}

// ============================================================
// 3. 名称换行行的记录归属（历史 bug 机制：换行行被跳过导致名称为空）
// ============================================================
console.log('\n[3] 名称换行行归属')

{
  // 基金名称跨多个视觉行换行（如 y=700/691/673/664 四行只含名称片段，
  // 订单号位无数字）。这些行必须归属到正确的记录，否则名称为空。
  // 断言 fixture 中存在这种"纯名称换行行"，且全部 316 行名称非空（上面已验）。
  const page2 = pages.find((p) => p.page === 2)!
  const nameOnlyLines = page2.lines.filter(
    (ln) =>
      ln.y < 702 &&
      ln.y > 660 &&
      ln.items.length === 1 &&
      /[\u4e00-\u9fff]/.test(ln.items[0].str)
  )
  check('fixture 含纯名称换行行（4 行）', nameOnlyLines.length === 4, `实际 ${nameOnlyLines.length}`)
  check(
    '换行行名称已拼入对应记录（首条记录名称完整）',
    rows[0][0] === '前海开源沪港深核心资源灵活配置混合C'
  )
}

// ============================================================
// 3b. 游离文本自愈兜底（文本落在所有锚点容差之外时不再静默丢失）
// ============================================================
console.log('\n[3b] 游离文本自愈兜底')

{
  // 把第一条记录的所有名称片段（x 在名称列区间 175~274 的中文块，
  // 含换行缩进的 x=190）挪到最右锚点（确认日期@501）容差之外（x=545），
  // 归列失败 → 兜底逻辑应把游离中文文本拼回名称列
  const yRange = { min: 664, max: 702 }
  const mutated: PdfPageLines[] = pages.map((p) =>
    p.page === 2
      ? {
          ...p,
          lines: p.lines.map((ln) =>
            ln.y <= yRange.max && ln.y >= yRange.min
              ? {
                  ...ln,
                  items: ln.items.map((it) =>
                    it.x >= 175 && it.x < 274 && /[\u4e00-\u9fff]/.test(it.str)
                      ? { ...it, x: 545 }
                      : it
                  ),
                }
              : ln
          ),
        }
      : p
  )
  const r = parseAntFundStatement(mutated, 0, mutated.length)
  const drifted = r.rows.find((row) => row[0] === rows[0][0])
  check('游离文本记录仍被识别', !!drifted)
  check(
    '游离名称通过兜底恢复',
    drifted?.[0] === rows[0][0],
    `实际: ${drifted?.[0]}`
  )
}

// ============================================================
// 4. 蚂蚁基金"资产证明"（持仓快照）fixture
// ============================================================
console.log('\n[4] 蚂蚁基金资产证明 fixture 解析')

const assetFixturePath = path.resolve(
  import.meta.dirname,
  'fixtures',
  'ant-fund-asset-statement-lines.json'
)
const assetPages = JSON.parse(readFileSync(assetFixturePath, 'utf-8')) as PdfPageLines[]
const asset = parseAntFundAssetStatement(assetPages, 0, assetPages.length)

check('识别为资产证明模式', asset.parserMode === 'ant-asset')
check(
  '输出为标准 4 列（账户名称/基金代码/快照金额/快照日期）',
  asset.headers?.join(',') === '账户名称,基金代码,快照金额,快照日期',
  JSON.stringify(asset.headers)
)

const assetRows = asset.rows
check('持仓记录数完整（18 条）', assetRows.length === 18, `实际 ${assetRows.length}`)

check(
  '账户名称列无空值',
  assetRows.every((r) => r[0] !== '' && r[0] !== undefined),
  `空名称行数: ${assetRows.filter((r) => !r[0]).length}`
)

// 上方换行 + 下方换行的名称正确拼接（记录 1）
check(
  '上下换行名称拼接（华安纳斯达克…QDII A）',
  assetRows[0][0] === '华安纳斯达克100ETF联接(QDII)A',
  assetRows[0][0]
)
// 带连字符断行的名称（记录 4：汇添富恒生指数(QDII-LOF)C）
check(
  '连字符断行名称拼接',
  assetRows[3][0] === '汇添富恒生指数(QDII-LOF)C',
  assetRows[3][0]
)
// 单行名称不重复（记录 3）
check(
  '单行名称完整（易方达上证50ETF联接C）',
  assetRows[2][0] === '易方达上证50ETF联接C',
  assetRows[2][0]
)
// 末条记录（18：景顺长城…加权ETF联接(QDII)A）
check(
  '末条名称正确',
  assetRows[17][0] === '景顺长城纳斯达克科技市值加权ETF联接(QDII)A',
  assetRows[17][0]
)
// 抽查（记录 7：广发全球精选 270023 / 98636.41）
check('记录7基金代码', assetRows[6][1] === '270023', assetRows[6][1])
check('记录7快照金额', assetRows[6][2] === '98636.41', assetRows[6][2])
// 页脚说明/封面文字/页眉未混入数据行（封面文字曾因跨页 y 恰好接近被拼进首行）
check(
  '页脚与封面文字未混入',
  assetRows.every((r) => !/资产证明|兹证明|注册登记|有限公司|持有情况|截止至/.test(r.join('')))
)
// 快照日期：全部为封面基准日（2026-09-30）的月末格式
// （净值日期原始 20260929/20260930 均归当月最后一天，封面缺失时按首条净值日期月末回退）
check(
  '快照日期统一为月末（2026/09/30）',
  assetRows.every((r) => r[3] === '2026/09/30'),
  assetRows[0][3]
)
// 快照日期均为 yyyy/mm/dd 且 dd 为当月最后一天
check(
  '快照日期格式为当月最后一天',
  assetRows.every((r) => {
    const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(r[3])
    if (!m) return false
    const lastDay = new Date(Number(m[1]), Number(m[2]), 0).getDate()
    return Number(m[3]) === lastDay
  })
)
// 首行完整内容（账户名称 | 基金代码 | 快照金额 | 快照日期）
check(
  '首行完整内容',
  assetRows[0].join('|') === '华安纳斯达克100ETF联接(QDII)A|040046|218043.64|2026/09/30',
  assetRows[0].join('|')
)

// ============================================================
// 5. CSV 解析（已有行为的回归保护）
// ============================================================
console.log('\n[5] CSV 对账单解析')

{
  const csv = [
    '蚂蚁（杭州）基金销售有限公司',
    '客户名: 张三    打印时间: 2026-10-01',
    '基金代码,基金名称,市值,币种',
    '003305,前海开源沪港深混合C,610.85,CNY',
    '270023,广发全球精选股票(QDII)A,4356.20,CNY',
    '注: 以上数据仅供参考',
  ].join('\n')
  const r = parseStatementCSV(csv)
  check('CSV 跳过 2 行说明', r.skippedLineCount === 2, `实际 ${r.skippedLineCount}`)
  check('CSV 表头识别', r.headers?.join(',') === '基金代码,基金名称,市值,币种')
  check('CSV 数据 2 行（页脚说明被过滤）', r.rows.length === 2, `实际 ${r.rows.length}`)
  check('CSV 首行名称', r.rows[0][1] === '前海开源沪港深混合C', r.rows[0][1])
}

// ============================================================
// 汇总
// ============================================================
console.log('\n============================================================')
console.log(`对账单解析回归测试: ${passed} 通过, ${failed} 失败`)
if (failed > 0) {
  console.log('失败项:')
  for (const f of failures) console.log(`  ✗ ${f}`)
  process.exit(1)
}
