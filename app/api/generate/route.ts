import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePackage } from '@/lib/document-generators'
import { parseProject, projectSchema, SYSTEM_PROMPT } from '@/lib/proposal-model'

export const runtime = 'nodejs'
export const maxDuration = 90

const GOOGLE_KEY_NAMES = Array.from({ length: 8 }, (_, index) => `GOOGLE_API_KEY_${index + 1}`)
let nextGoogleKey = 0

function getGoogleKeys() {
  return GOOGLE_KEY_NAMES.map((name) => process.env[name]).filter((key): key is string => Boolean(key?.trim()))
}

function extractJson(text: string) {
  const normalized = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  try {
    return JSON.parse(normalized)
  } catch {
    const start = normalized.indexOf('{')
    const end = normalized.lastIndexOf('}')
    if (start < 0 || end <= start) throw new Error('Google AI odgovor nije validan JSON')
    return JSON.parse(normalized.slice(start, end + 1))
  }
}

async function callGoogle(userPrompt: string) {
  const keys = getGoogleKeys()
  if (keys.length === 0) throw new Error('Nijedan GOOGLE_API_KEY_1–GOOGLE_API_KEY_8 nije konfigurisan na serveru')

  const startIndex = nextGoogleKey++ % keys.length
  let lastError = 'Google AI poziv nije uspio'

  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const apiKey = keys[(startIndex + attempt) % keys.length]
    const model = process.env.GOOGLE_MODEL ?? 'gemini-2.5-flash'
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('')
      if (typeof text !== 'string' || !text.trim()) throw new Error('Google AI odgovor nema tekstualni sadržaj')
      const parsed = parseProject(extractJson(text))
      if (!parsed.success) throw new Error(`AI model nije vratio validan projektni model: ${parsed.error.issues[0]?.message ?? 'nepoznata greška'}`)
      return parsed.data
    }

    lastError = `Google AI greška (${response.status})`
    if (![429, 500, 502, 503, 504].includes(response.status)) break
  }

  throw new Error(`${lastError}; iscrpljena je rotacija ${keys.length} dostupnih ključeva`)
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Zahtjev mora sadržati validan JSON.' }, { status: 400 })
  }

  if (typeof body === 'object' && body !== null && 'mode' in body && body.mode === 'ai') {
    const aiBody = body as { mode: 'ai'; prompt?: unknown }
    try {
      const project = await callGoogle(String(aiBody.prompt ?? 'Popuni projektni model prema dostavljenom kontekstu.'))
      return NextResponse.json({ project, schema: projectSchema.description ?? 'ProjectProposal' })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'AI generisanje nije uspjelo' }, { status: 502 })
    }
  }

  const parsed = parseProject(body)
  if (!parsed.success) return NextResponse.json({ error: 'Model projekta nije validan', issues: parsed.error.issues }, { status: 422 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Prijava je obavezna za generisanje i čuvanje paketa.' }, { status: 401 })

  const { data: projectRow, error: projectError } = await supabase.from('projects').insert({
    user_id: user.id,
    title: parsed.data.program.title,
    input: parsed.data,
    status: 'draft',
    validation: [],
  }).select('id').single()
  if (projectError || !projectRow) return NextResponse.json({ error: 'Projekat nije moguće sačuvati.' }, { status: 500 })

  const result = await generatePackage(parsed.data)
  const persistedFiles = []
  for (const file of result.files) {
    const bytes = Buffer.from(file.data, 'base64')
    const path = `${user.id}/${projectRow.id}/${file.name}`
    const upload = await supabase.storage.from('project-files').upload(path, bytes, { contentType: file.mime, upsert: true })
    if (upload.error) return NextResponse.json({ error: 'Dokument nije moguće sačuvati u Storage.' }, { status: 500 })
    const row = await supabase.from('project_documents').insert({ user_id: user.id, project_id: projectRow.id, kind: file.label, file_path: path, status: 'draft', metadata: { mime: file.mime, previewAvailable: Boolean(file.preview) } }).select('id').single()
    if (row.error) return NextResponse.json({ error: 'Metapodaci dokumenta nisu sačuvani.' }, { status: 500 })
    persistedFiles.push({ ...file, projectId: projectRow.id, documentId: row.data?.id })
  }
  return NextResponse.json({ ...result, projectId: projectRow.id, files: persistedFiles })
}
