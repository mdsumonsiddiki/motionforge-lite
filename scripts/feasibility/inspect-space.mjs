// Phase 1 feasibility helper: prints the public API (endpoints + parameters)
// of the Hugging Face LivePortrait Space. No cost, no token required.
// Usage: node scripts/feasibility/inspect-space.mjs [owner/space]
import { writeFileSync, mkdirSync } from 'node:fs'
import { Client } from '@gradio/client'

const SPACE = process.argv[2] || 'KwaiVGI/LivePortrait'

const client = await Client.connect(SPACE, {
  // Optional: a free HF token raises the ZeroGPU quota. Never printed.
  token: process.env.HF_TOKEN || undefined
})
const api = await client.view_api()

mkdirSync('.tmp', { recursive: true })
writeFileSync(`.tmp/space-api-${SPACE.replace('/', '_')}.json`, JSON.stringify(api, null, 2))

for (const [name, ep] of Object.entries(api.named_endpoints)) {
  const params = ep.parameters
    .map((p) => `${p.parameter_name ?? p.label} (${p.python_type?.type ?? p.type?.type ?? '?'}${
      p.parameter_has_default ? ` = ${JSON.stringify(p.parameter_default)}` : ''
    })`)
    .join(', ')
  console.log(`${name}: ${params}`)
}
process.exit(0)
