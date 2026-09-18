import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const failure = new URL('/', request.url)
      failure.searchParams.set('auth_error', 'Google prijava nije uspjela. Pokušajte ponovo.')
      return NextResponse.redirect(failure)
    }
  }
  const next = url.searchParams.get('next')
  return NextResponse.redirect(new URL(next?.startsWith('/') ? next : '/', request.url))
}
