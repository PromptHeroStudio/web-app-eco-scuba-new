import { NextResponse } from 'next/server'
import { generatePackage } from '@/lib/document-generators'
import { parseProject } from '@/lib/proposal-model'

export const runtime = 'nodejs'
export const maxDuration = 90

export async function POST(request: Request) {
  const parsed = parseProject(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Model projekta nije validan', issues: parsed.error.issues }, { status: 422 })
  return NextResponse.json(await generatePackage(parsed.data))
}
