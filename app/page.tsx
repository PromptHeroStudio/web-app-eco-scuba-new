'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, ChevronRight, CircleAlert, Eye, FileText, Loader2, UploadCloud } from 'lucide-react'
import { bhPostaCall, clubProfile, createDemoProject, matchEligibility, projectStatus, validateProject, type Project } from '@/lib/proposal-model'

const steps = ['Ekstrakcija poziva', 'AI popunjava sekcije', 'Deterministička validacija', 'Renderovanje dokumenata']

export default function Home() {
  const [project, setProject] = useState<Project>(createDemoProject())
  const [callName, setCallName] = useState('Nije učitan javni poziv')
  const [callText, setCallText] = useState('')
  const [callAnalysisStatus, setCallAnalysisStatus] = useState<'missing' | 'extracted' | 'ocr'>('missing')
  const [generating, setGenerating] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
  const [generated, setGenerated] = useState(false)
  const [packageResult, setPackageResult] = useState<{ files: { name: string; label: string; mime: string; data: string; preview: string }[] } | null>(null)
  const [generationError, setGenerationError] = useState('')
  const [gateConfirmed, setGateConfirmed] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [processLog, setProcessLog] = useState<string[]>([])
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  useEffect(() => {
    const client = createClient()
    setSupabase(client)
    let active = true
    void (async () => {
      const { data } = await client.auth.getUser()
      if (!active) return
      setAuthenticated(Boolean(data.user))
      if (data.user?.email) setUserEmail(data.user.email)
    })()
    return () => { active = false }
  }, [])
  const eligibility = useMemo(() => {
    if (callText.trim().length < 40) return { status: 'draft' as const, recommendedProgram: undefined, reasons: ['Učitajte službeni PDF poziva da bi analiza mogla početi.'], risks: ['Bez izvornog teksta nije moguće utvrditi prihvatljivost KVS SCUBA.'], callPoints: [] }
    const lower = callText.toLowerCase()
    const isSport = /sport|sports|omladin|mladih|klub/.test(lower)
    const isEco = /eko|ekolog|životn|voda|okoliš|zaštit/.test(lower)
    const recommendedProgram = isEco ? 'Ekologija i zaštita voda' : isSport ? 'Sport i razvoj mladih' : 'Druga prihvatljiva programska linija'
    return { status: 'eligible' as const, recommendedProgram, reasons: [`Tekst poziva sadrži relevantnu programsku osnovu: ${recommendedProgram}.`, 'Formalna podobnost mora se potvrditi prema svim izdvojenim uslovima poziva.'], risks: [], callPoints: Array.from({ length: Math.max(1, callText.split(/\n+/).filter(line => line.trim().length > 30).length) }, (_, index) => `Tačka ${index + 1}`) }
  }, [callText])
  const validation = useMemo(() => validateProject(project), [project])
  const status = projectStatus(project)
  const passed = validation.filter(item => item.ok).length
  const update = (key: keyof Project['program'], value: string) => setProject(current => {
    const numericKeys: (keyof Project['program'])[] = ['requestedFromDonor', 'totalBudget', 'ownCash', 'ownInKind']
    const nextValue = numericKeys.includes(key) ? Number(value) : value
    return { ...current, program: { ...current.program, [key]: nextValue } }
  })

  async function generate() {
    setGenerating(true)
    setProcessLog(['Pokrećem obradu projektnog poziva…'])
    setGenerated(false)
    setGenerationError('')
    setPackageResult(null)
    try {
      await persistProject('draft')
      for (let index = 0; index < steps.length; index++) {
        setActiveStep(index)
        setProcessLog(current => [...current, `${steps[index]}…`])
        await new Promise(resolve => setTimeout(resolve, 450))
        if (index === steps.length - 1) {
          const aiResponse = await fetch('/api/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'ai', prompt: JSON.stringify({ instructions: 'Analiziraj javni poziv kao primarni izvor istine. Dopuni projektni model za KVS SCUBA samo provjerljivim podacima. Za svaki nepoznat podatak koristi confidence NEDOSTAJE i [UNESITE PODATAK]. Uskladi ciljeve, aktivnosti, indikatore, budžet i dokumentaciju sa konkretnim zahtjevima poziva. Vrati samo JSON model.', publicCall: { fileName: callName, extractedText: callText }, clubProfile: { name: 'KVS S.C.U.B.A. Sarajevo', legalStatus: 'sportsko udruženje', territory: ['Kanton Sarajevo', 'Federacija BiH', 'Bosna i Hercegovina'], domains: ['sport', 'edukacija mladih', 'zaštita voda i ekologija', 'volonterski rad'], accreditations: ['SSI Diamond Center 2024', 'Blue Oceans Award 2022/2023/2024'] }, currentProject: project }) }) })
          if (aiResponse.ok) {
            const aiResult = await aiResponse.json() as { project?: Project }
            if (aiResult.project) setProject(aiResult.project)
            if (aiResult.project) Object.assign(project, aiResult.project)
          }
          const response = await fetch('/api/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...project, projectId: activeProjectId, publicCall: { fileName: callName, extractedText: callText, extractionStatus: callAnalysisStatus } }) })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error ?? 'Generisanje nije uspjelo')
          setPackageResult(result)
          await persistGeneratedDocuments(result.files)
        }
      }
      setGenerated(true)
      setActiveStep(steps.length)
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Generisanje nije uspjelo')
    } finally {
      setGenerating(false)
    }
  }

  async function persistProject(nextStatus: 'draft' | 'ready' = 'draft') {
    if (!supabase) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const payload = { user_id: user.id, title: project.program.title, input: project, status: nextStatus, validation }
    if (activeProjectId) {
      const { data, error } = await supabase.from('projects').update(payload).eq('id', activeProjectId).select('id').single()
      if (!error && data) return data.id
    }
    const { data, error } = await supabase.from('projects').insert(payload).select('id').single()
    if (error || !data) throw new Error('Projekt nije moguće sačuvati.')
    setActiveProjectId(data.id)
    return data.id
  }

  async function persistGeneratedDocuments(files: { name: string; label: string; mime: string; data: string; preview: string }[]) {
    if (!supabase || !activeProjectId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    for (const file of files) {
      const path = `${user.id}/projects/${activeProjectId}/${file.name}`
      const bytes = Uint8Array.from(atob(file.data), character => character.charCodeAt(0))
      const upload = await supabase.storage.from('project-files').upload(path, bytes, { contentType: file.mime, upsert: true })
      if (upload.error) throw new Error(`Dokument ${file.label} nije moguće sačuvati.`)
      const previewPath = `${user.id}/projects/${activeProjectId}/preview-${file.name.replace(/\\.[^.]+$/, '')}.pdf`
      const previewBytes = Uint8Array.from(atob(file.preview), character => character.charCodeAt(0))
      const previewUpload = await supabase.storage.from('project-files').upload(previewPath, previewBytes, { contentType: 'application/pdf', upsert: true })
      if (previewUpload.error) throw new Error(`Pregled dokumenta ${file.label} nije moguće sačuvati.`)
      const saved = await supabase.from('project_documents').insert({ user_id: user.id, project_id: activeProjectId, kind: file.label, file_path: path, preview_path: previewPath, status: status === 'ready' ? 'ready' : 'draft', metadata: { source: 'server-render', preview: true } })
      if (saved.error) throw new Error(`Metapodaci dokumenta ${file.label} nisu sačuvani.`)
    }
  }

  async function handleDroppedFile(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) await uploadCall(file)
  }

  async function uploadCall(file: File) {
    if (!supabase) return
    setCallName(file.name)
    setCallText('')
    setCallAnalysisStatus('missing')
    setGateConfirmed(false)
    setAuthMessage('Učitavanje i semantička analiza javnog poziva su u toku…')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const path = `${user.id}/calls/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    if (file.type !== 'application/pdf') { setAuthMessage('Dozvoljen je samo PDF format.'); return }
    if (file.size > 25 * 1024 * 1024) { setAuthMessage('PDF je veći od dozvoljenih 25 MB.'); return }
    const extractionForm = new FormData()
    extractionForm.append('file', file)
    const extractionResponse = await fetch('/api/extract-call', { method: 'POST', body: extractionForm })
    const extraction = await extractionResponse.json() as { text?: string; ocrUsed?: boolean; needsOcr?: boolean; error?: string }
    if (!extractionResponse.ok) { setAuthMessage(extraction.error ?? 'PDF nije moguće pročitati.'); return }
    setCallText(extraction.text ?? '')
    setCallAnalysisStatus(extraction.ocrUsed ? 'ocr' : 'extracted')
    setProcessLog(['PDF je učitan u privatni prostor.', extraction.ocrUsed ? 'Skenirani dokument je prepoznat; pokrećem OCR.' : 'Tekst PDF-a je izdvojen.', 'Poziv je spreman za analizu prihvatljivosti KVS SCUBA.'])
    setAuthMessage(extraction.ocrUsed ? 'PDF je učitan i tekst je dobijen OCR analizom.' : 'PDF je učitan; tekst javnog poziva je spreman za AI analizu.')
    const projectId = await persistProject()
    if (!projectId) return
    const upload = await supabase.storage.from('project-files').upload(path, file, { contentType: 'application/pdf', upsert: false })
    if (upload.error) { setAuthMessage('PDF nije moguće sačuvati.'); return }
    const saved = await supabase.from('public_calls').insert({ user_id: user.id, project_id: projectId, file_path: path, file_name: file.name, mime_type: 'application/pdf', extracted_text: extraction.text ?? null, ocr_used: extraction.ocrUsed ?? false }).select('id').single()
    if (saved.error) setAuthMessage('Metapodaci poziva nisu sačuvani.')
    else if (extraction.needsOcr) setAuthMessage('PDF je sačuvan, ali izgleda kao sken. OCR korak je potreban prije AI ekstrakcije.')
  }

  async function authenticate(mode: 'login' | 'signup') {
    if (!supabase) return
    setAuthBusy(true)
    setAuthMessage('')
    const redirectTo = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: userEmail.trim(), password: userPassword })
      : await supabase.auth.signUp({ email: userEmail.trim(), password: userPassword, options: { emailRedirectTo: redirectTo } })
    setAuthBusy(false)
    if (result.error) {
      const message = result.error.message.toLowerCase()
      if (mode === 'login' && (message.includes('email not confirmed') || message.includes('not confirmed'))) {
        setAuthMessage('Email još nije potvrđen. Otvorite link iz poruke za potvrdu, pa pokušajte ponovo.')
      } else if (mode === 'signup' && message.includes('already registered')) {
        setAuthMessage('Ovaj email već postoji. Prijavite se ili zatražite novu poruku za potvrdu.')
      } else {
        setAuthMessage(mode === 'login' ? 'Neispravan email ili lozinka.' : 'Registracija nije završena. Provjerite email adresu i pokušajte ponovo.')
      }
      return
    }
    if (mode === 'signup') {
      if (result.data.session) setAuthenticated(true)
      else setAuthMessage('Registracija je zaprimljena. Potvrdite email adresu, zatim se prijavite.')
    } else {
      setAuthenticated(true)
    }
  }

  async function signInWithGoogle() {
    if (!supabase) return
    setAuthBusy(true)
    setAuthMessage('Preusmjeravanje na Google prijavu…')
    const redirectTo = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) { setAuthBusy(false); setAuthMessage('Google prijava nije dostupna. Provjerite da je Google provider uključen u Supabase Auth postavkama.') }
  }

  async function resendConfirmation() {
    if (!supabase || !userEmail.trim()) return
    setAuthBusy(true)
    setAuthMessage('')
    const { error } = await supabase.auth.resend({ type: 'signup', email: userEmail.trim(), options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback` } })
    setAuthBusy(false)
    setAuthMessage(error ? 'Poruku nije moguće poslati. Provjerite email adresu i pokušajte ponovo.' : 'Nova poruka za potvrdu je poslana. Provjerite prijemno sanduče i spam folder.')
  }

  if (!authenticated) return <main className="shell"><div className="workspace auth-screen"><section className="panel auth-panel"><img className="auth-logo" src="/logo.png" alt="ECO SCUBA" /><h1>Prijavite se</h1><label>Email adresa<input type="email" value={userEmail} onChange={event => setUserEmail(event.target.value)} placeholder="vas@email.com" /></label><label>Lozinka<input type="password" value={userPassword} onChange={event => setUserPassword(event.target.value)} placeholder="••••••••" /></label><button className="auth-forgot" type="button">Zaboravili ste lozinku?</button><button className="auth-primary" disabled={authBusy || !userEmail || !userPassword} onClick={() => authenticate('login')}>{authBusy ? 'Provjera…' : 'Prijavite se'}</button><div className="auth-divider"><span /> ili <span /></div><button className="auth-google" type="button" disabled={authBusy} onClick={() => void signInWithGoogle()}><b>G</b> Prijava putem Google računa</button><div className="auth-links"><span>Nemate račun?</span><button type="button" onClick={() => void authenticate('signup')} disabled={authBusy}>Registrujte se</button></div><button className="auth-resend-button" type="button" disabled={authBusy || !userEmail} onClick={() => void resendConfirmation()}>Pošalji ponovo email za potvrdu</button>{authMessage && <div className="notice"><CircleAlert size={17} /><span>{authMessage}</span></div>}</section></div></main>

  return <main className="shell">
    {(generating || authBusy) && <div className="process-overlay" role="status" aria-live="polite"><div className="process-loader"><img src="/logo.png" alt="" /><div className="loader-ring" /><h2>{authBusy ? 'Sigurna prijava' : 'Obrada projektnog poziva'}</h2><p>{processLog.at(-1) ?? 'Sistem priprema sljedeći korak…'}</p><div className="overlay-log">{processLog.slice(-4).map((entry, index) => <span key={`${entry}-${index}`}>{entry}</span>)}</div></div></div>}
    <header className="topbar"><div className="brand"><div className="brand-mark"><img src="/logo.png" alt="Logo KVS S.C.U.B.A. Sarajevo" /></div><div><strong>ECO SCUBA</strong><span>Projektni studio</span></div></div><div className="top-status"><span className="status-dot" /> Radni prostor KVS „S.C.U.B.A.“ <span className="avatar">AD</span></div></header>
    <div className="workspace">
      <section className="intro"><div className="eyebrow">NOVI PROJEKTNI PAKET <span>V1</span></div><h1>Od javnog poziva<br /><em>do spremne prijave.</em></h1><p>Jedan strukturirani model. Jedna istina za svaki dokument. Sistem provjerava budžet, usklađenost i nedostajuće podatke prije isporuke.</p></section>
      <section className="eligibility-gate panel"><div className="panel-heading"><div><span className="step-number">00</span><h2>Da li poziv odgovara klubu?</h2></div><span className={`readiness ${eligibility.status === 'eligible' ? 'ready' : 'draft'}`}><span /> {eligibility.status === 'eligible' ? 'ELIGIBLE' : 'PROVJERA'}</span></div><p className="gate-lead">Analiza poziva se završava prije unosa projekta. Matcher provjerava formalne uslove, oblast, teritoriju i rok.</p><div className="gate-grid"><div><small>PREDLOŽENA KOMPONENTA</small><strong>{eligibility.recommendedProgram ?? 'Nema podudaranja'}</strong></div><div><small>OSNOV ZAKLJUČKA</small><span>{eligibility.reasons[0]}</span></div></div>{eligibility.risks.length > 0 && <div className="notice"><CircleAlert size={17} /><span><b>Rizici prije nastavka:</b> {eligibility.risks.join(' ')}</span></div>}<div className="gate-actions"><span>{eligibility.callPoints.length} tačaka poziva provjereno</span><button className="generate-btn" type="button" onClick={() => setGateConfirmed(true)} disabled={eligibility.status !== 'eligible' || gateConfirmed}>{gateConfirmed ? 'Komponenta potvrđena' : `Nastavi i generiši za ${eligibility.recommendedProgram ?? 'odabranu oblast'}`}<ChevronRight size={18} /></button></div></section>
      <div className="layout-grid">
        <section className="panel input-panel"><div className="panel-heading"><div><span className="step-number">01</span><h2>Ulazni podaci</h2></div><span className="quiet-label">2 ekrana</span></div>
          <label className="upload-box" htmlFor="call-upload" onDragOver={event => event.preventDefault()} onDrop={event => void handleDroppedFile(event)}><UploadCloud size={22} /><span><strong>{callName === 'Nije učitan javni poziv' ? 'Prevucite PDF ovdje ili kliknite za odabir' : callName}</strong><small>PDF · prevlačenje ili odabir · privatni Supabase Storage</small></span>{callAnalysisStatus !== 'missing' && <Check className="upload-check" size={20} />}<input id="call-upload" type="file" accept="application/pdf" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadCall(file) }} /></label><div className="process-log" aria-live="polite">{processLog.map((entry, index) => <div key={`${entry}-${index}`}><span>{index === processLog.length - 1 && (generating || callAnalysisStatus !== 'missing') ? '•' : '✓'}</span>{entry}</div>)}</div>
          <div className="field-grid"><label>NAZIV PROJEKTA<input value={project.program.title} onChange={e => update('title', e.target.value)} /></label><label>OBLAST<input value={project.program.field} onChange={e => update('field', e.target.value)} /></label><label>TRAJANJE<input value={project.program.duration} onChange={e => update('duration', e.target.value)} /></label><label>TRAŽENI IZNOS (KM)<input type="number" value={project.program.requestedFromDonor} onChange={e => update('requestedFromDonor', e.target.value)} /></label></div>
          <label className="wide-field">OPIS POTREBE<textarea value={project.program.need} onChange={e => update('need', e.target.value)} rows={3} /></label>
          <div className="club-card"><div className="club-logo"><img src="/logo.png" alt="Logo KVS S.C.U.B.A. Sarajevo" /></div><div><small>PODNOSILAC PRIJAVE</small><strong>{project.applicant.name.value}</strong><span>{project.applicant.address.value}</span></div><button type="button">Uredi profil <ChevronRight size={14} /></button></div>
        </section>
        <section className="panel validation-panel"><div className="panel-heading"><div><span className="step-number">02</span><h2>Kontrola kvaliteta</h2></div><div className={`readiness ${status}`}><span /> {status === 'ready' ? 'SPREMNO' : 'NACRT'}</div></div><div className="score"><strong>{passed}<small>/{validation.length}</small></strong><div><b>kontrola prije predaje</b><span>Validatori rade nad podacima, ne nad izgledom dokumenta.</span></div></div><div className="checks">{validation.map(item => <div className={`check-row ${item.ok ? 'ok' : 'fail'}`} key={item.validator}><div className="check-icon">{item.ok ? <Check size={14} /> : <CircleAlert size={14} />}</div><div><strong>{item.validator.replace('validate', '')}</strong><span>{item.message}</span></div><span className="check-state">{item.ok ? 'PROŠLO' : 'PAŽNJA'}</span></div>)}</div><div className="notice"><CircleAlert size={17} /><span><b>Jedno polje traži potvrdu.</b> Broj bankovnog računa nedostaje i označava paket kao nacrt.</span></div></section>
      </div>
      <section className="generation panel"><div className="generation-top"><div><div className="eyebrow">GENERISANJE PAKETA</div><h2>{generated ? 'Paket je pripremljen.' : 'Spremni za provjeru?'}</h2><p>{generated ? 'Pregledajte fajlove i preuzmite radnu verziju ili dopunite podatke.' : 'AI popunjava model, a kod provjerava i renderuje svaki dokument.'}</p></div><button className="generate-btn" onClick={generate} disabled={generating || !gateConfirmed || callText.trim().length < 40}>{generating ? <><img className="loader-logo" src="/logo.png" alt="" /> Generišem…</> : <>Generiši paket <ChevronRight size={18} /></>}</button></div>{(generating || generated || generationError) && <div className="progress-track">{steps.map((step, index) => <div className={`progress-step ${index < activeStep ? 'done' : index === activeStep ? 'current' : ''}`} key={step}><div className="progress-icon">{index < activeStep ? <Check size={13} /> : index === activeStep ? <Loader2 className="spin" size={13} /> : index + 1}</div><span>{step}</span></div>)}</div>}{generationError && <div className="notice"><CircleAlert size={17} /><span><b>Generisanje nije završeno.</b> {generationError}</span></div>}{generated && packageResult && <div className="documents"><div className="documents-heading"><div><span className="eyebrow">PREGLED PRIJE PREUZIMANJA</span><h3>Ovako izgleda Vaš dokument</h3></div><span className="preview-note"><Eye size={15} /> PDF raster provjera</span></div>{packageResult.files.map(file => <article className="document-card" key={file.name}><div className="preview-frame"><iframe title={`Pregled: ${file.label}`} src={`data:application/pdf;base64,${file.preview}`} /></div><div className="document-meta"><div className="doc-icon"><FileText size={20} /></div><div><strong>{file.label}</strong><span>{file.name.endsWith('.xlsx') ? 'XLSX · žive formule' : 'DOCX · tekstualni sloj'}</span></div><a href={`data:${file.mime};base64,${file.data}`} download={file.name} aria-label={`Preuzmi ${file.label}${status === 'ready' ? '' : ' kao radnu verziju'}`}>{status === 'ready' ? 'Preuzmi' : 'Radna verzija'}</a></div></article>)}</div>}</section>
      <footer><span>© 2026 KVS „S.C.U.B.A.“ Sarajevo</span><span><b>V1 CORE</b> · Strukturirani izlaz, deterministička kontrola</span></footer>
    </div>
  </main>
}
