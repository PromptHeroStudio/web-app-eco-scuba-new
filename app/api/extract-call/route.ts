import { NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30
const MAX_PDF_BYTES = 25 * 1024 * 1024
const GOOGLE_KEY_NAMES = Array.from({ length: 8 }, (_, index) => `GOOGLE_API_KEY_${index + 1}`)
let nextGoogleKey = 0

async function extractWithGoogleOcr(bytes: Uint8Array) {
  const keys = GOOGLE_KEY_NAMES.map(name => process.env[name]).filter((key): key is string => Boolean(key?.trim()))
  if (keys.length === 0) return null
  const start = nextGoogleKey++ % keys.length
  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const key = keys[(start + attempt) % keys.length]
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GOOGLE_MODEL ?? 'gemini-2.5-flash'}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Prepiši sav čitljiv tekst iz ovog PDF dokumenta. Vrati samo tekst, bez komentara i bez izmišljanja sadržaja.' }, { inline_data: { mime_type: 'application/pdf', data: Buffer.from(bytes).toString('base64') } }] }] }),
    })
    if (response.ok) {
      const data = await response.json()
      const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('').trim()
      if (text) return text
    }
    if (![429, 500, 502, 503, 504].includes(response.status)) break
  }
  return null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'PDF datoteka nije dostavljena.' }, { status: 400 })
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Dozvoljen je samo PDF format.' }, { status: 415 })
  if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: 'PDF je veći od dozvoljenih 25 MB.' }, { status: 413 })

  const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) })
  try {
    const result = await parser.getText()
    const extractedText = result.text.trim()
    const needsOcr = extractedText.length < 40
    const ocrText = needsOcr ? await extractWithGoogleOcr(new Uint8Array(await file.arrayBuffer())) : null
    const text = ocrText ?? extractedText
    return NextResponse.json({ text, ocrUsed: Boolean(ocrText), needsOcr: !ocrText && needsOcr, pages: result.total })
  } catch {
    return NextResponse.json({ error: 'PDF nije moguće pročitati. Skenirani dokument zahtijeva OCR obradu.' }, { status: 422 })
  } finally {
    await parser.destroy()
  }
}
