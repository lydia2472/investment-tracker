import Module from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJiti } from 'jiti'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const originalResolveFilename = Module._resolveFilename

Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    const resolvedRequest = path.join(projectRoot, 'src', request.slice(2))
    return originalResolveFilename.call(this, resolvedRequest, parent, isMain, options)
  }

  return originalResolveFilename.call(this, request, parent, isMain, options)
}

const jiti = createJiti(import.meta.url)

await jiti.import(path.join(projectRoot, 'scripts', 'fixed-deposit-maturity-regression.ts'))
