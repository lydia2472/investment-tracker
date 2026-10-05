import { exportSnapshotsToCSV, exportSnapshotsToJSON, generateSnapshotExportFilename } from '@/lib/utils/snapshot-export'

import type { Snapshot } from '@/lib/stores/snapshot-store'
import type { Account } from '@/types'

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

const baseDate = new Date('2026-06-10T08:00:00.000Z')

const accounts: Account[] = [
  {
    id: 'snapshot-cny',
    name: 'Snapshot CNY',
    type: 'bank',
    balance: 5200,
    initialBalance: 1000,
    currency: 'CNY',
    color: '#118833',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
  {
    id: 'snapshot-usd',
    name: 'Snapshot USD',
    type: 'fund',
    balance: 1800,
    initialBalance: 1200,
    currency: 'USD',
    color: '#2255DD',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
] as Account[]

const snapshots: Snapshot[] = [
  {
    id: 'snap-1',
    accountId: 'snapshot-cny',
    balance: 5200,
    investmentAmount: 300,
    note: '六月月末快照',
    snapshotDate: new Date('2026-06-30T23:59:59.999Z'),
    createdAt: new Date('2026-06-30T23:59:59.999Z'),
    updatedAt: new Date('2026-06-30T23:59:59.999Z'),
  },
  {
    id: 'snap-2',
    accountId: 'snapshot-usd',
    balance: 1800,
    note: 'USD snapshot',
    snapshotDate: new Date('2026-07-31T23:59:59.999Z'),
    createdAt: new Date('2026-07-31T23:59:59.999Z'),
    updatedAt: new Date('2026-07-31T23:59:59.999Z'),
  },
]

const exportedJson = JSON.parse(exportSnapshotsToJSON(snapshots, accounts)) as Array<Record<string, unknown>>
assert(exportedJson.length === 2, `snapshot json length expected 2, got ${exportedJson.length}`)
assert(exportedJson[0]?.accountName === 'Snapshot CNY', 'snapshot json should include account name')
assert(exportedJson[0]?.accountCurrency === 'CNY', 'snapshot json should include currency')
assert(
  exportedJson[0]?.snapshotDate === '2026-06-30T23:59:59.999Z',
  `snapshot json should serialize snapshotDate, got ${exportedJson[0]?.snapshotDate}`
)

const exportedCsv = exportSnapshotsToCSV(snapshots, accounts)
assert(exportedCsv.includes('账户名称,账户ID,货币,快照日期,快照金额'), 'snapshot csv should include core headers')
assert(exportedCsv.includes('Snapshot CNY'), 'snapshot csv should include account name')
assert(exportedCsv.includes('5200'), 'snapshot csv should include balance amount')
assert(exportedCsv.includes('六月月末快照'), 'snapshot csv should include note')
assert(exportedCsv.includes('USD'), 'snapshot csv should include currency')

const generatedFilename = generateSnapshotExportFilename('csv')
assert(/^snapshots-\d{4}-\d{2}-\d{2}\.csv$/.test(generatedFilename), `unexpected snapshot export filename: ${generatedFilename}`)

console.log(
  JSON.stringify(
    {
      filename: generatedFilename,
      jsonPreview: exportedJson[0],
      csvPreview: exportedCsv.split('\n').slice(0, 3),
    },
    null,
    2
  )
)

console.log('snapshot export regression passed')
