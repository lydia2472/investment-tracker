import Module from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const projectRoot = '/Users/lydia2jack/Documents/investment-tracker'
const origResolve = Module._resolveFilename
Module._resolveFilename = function (request, parent, isMain, options) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    return origResolve.call(this, path.join(projectRoot, 'src', request.slice(2)), parent, isMain, options)
  }
  return origResolve.call(this, request, parent, isMain, options)
}
const jiti = createJiti(import.meta.url)
const { FixedDepositService } = await jiti.import(path.join(projectRoot, 'src/lib/services/fixed-deposit-service.ts'))

// 用户真实配置
const account = {
  id: 'hsbc-usd',
  name: '汇丰美金定期',
  type: 'fixed_deposit',
  fixedDepositConfig: {
    interestRate: 3.11,
    startDate: '2026-04-29T00:00:00.000Z',
    maturityDate: '2029-04-29T00:00:00.000Z',
    interestPaymentFrequency: 'monthly',
    principal: 81536.91,
    autoRollOver: false,
  },
}

console.log('═══ 场景1：无已有交易（全新同步）═══')
const payments1 = FixedDepositService.generateMonthlyInterestPayments(account, new Date('2026-10-04'), [])
console.log('生成交易数:', payments1.length)
payments1.filter(p => p.type === 'income').forEach(p =>
  console.log(`  利息 ${p.amount} | ${new Date(p.createdAt).toLocaleDateString('zh-CN')} | period: ${new Date(p.interestPeriod.startDate).toLocaleDateString()} → ${new Date(p.interestPeriod.endDate).toLocaleDateString()}`)
)

console.log('\n═══ 场景2：已有 5/16、6/16 两笔利息（假设带 period）═══')
const existing = [
  { id:'e1', accountId:'hsbc-usd', type:'income', amount:211.32, isInterestPayment:true, relatedFixedDepositId:'hsbc-usd',
    interestPeriod:{startDate:'2026-04-16',endDate:'2026-05-16'}, createdAt:new Date('2026-05-16') },
  { id:'e2', accountId:'hsbc-usd', type:'income', amount:211.32, isInterestPayment:true, relatedFixedDepositId:'hsbc-usd',
    interestPeriod:{startDate:'2026-05-16',endDate:'2026-06-16'}, createdAt:new Date('2026-06-16') },
]
const payments2 = FixedDepositService.generateMonthlyInterestPayments(account, new Date('2026-10-04'), existing)
console.log('生成交易数:', payments2.length)
payments2.filter(p => p.type === 'income').forEach(p =>
  console.log(`  利息 ${p.amount} | ${new Date(p.createdAt).toLocaleDateString('zh-CN')} | period起: ${new Date(p.interestPeriod.startDate).toLocaleDateString()}`)
)
