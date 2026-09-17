import { NextResponse } from 'next/server'
import { generatePackage } from '@/lib/document-generators'
import { parseProject, projectSchema, SYSTEM_PROMPT } from '@/lib/proposal-model'

export const runtime = 'nodejs'
export const maxDuration = 90

async function callAnthropic(userPrompt: string) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY nije konfigurisan na serveru')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) throw new Error(`Anthropic API greška (${response.status})`)
  const data = await response.json()
  const text = data?.content?.[0]?.text
  if (typeof text !== 'string') throw new Error('Anthropic odgovor nema tekstualni sadržaj')
  const parsed = parseProject(JSON.parse(text))
  if (!parsed.success) throw new Error(`AI model nije vratio validan projektni model: ${parsed.error.issues[0]?.message ?? 'nepoznata greška'}`)
  return parsed.data
}

export async function POST(request: Request) {
  const body = await request.json()
  if (body?.mode === 'ai') {
    try {
      const project = await callAnthropic(String(body.prompt ?? 'Popuni projektni model prema dostavljenom kontekstu.'))
      return NextResponse.json({ project, schema: projectSchema.description ?? 'ProjectProposal' })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'AI generisanje nije uspjelo' }, { status: 502 })
    }
  }

  const parsed = parseProject(body)
  if (!parsed.success) return NextResponse.json({ error: 'Model projekta nije validan', issues: parsed.error.issues }, { status: 422 })
  return NextResponse.json(await generatePackage(parsed.data))
}
