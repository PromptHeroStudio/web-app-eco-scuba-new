'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, ChevronRight, CircleAlert, Eye, FileText, Loader2, UploadCloud } from 'lucide-react'
import { bhPostaCall, clubProfile, createDemoProject, matchEligibility, projectStatus, validateProject, type Project } from '@/lib/proposal-model'

const steps = ['Ekstrakcija poziva', 'AI popunjava sekcije', 'Deterministička validacija', 'Renderovanje dokumenata']

export default function Home() {
  const [project, setProject] = useState<Project>(createDemoProject())
  const [callName, setCallName] = useState('02 — Javni oglas za dodjelu donacija 2026.pdf')
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
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)
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
  }, [supabase])
  const eligibility = useMemo(() => matchEligibility(clubProfile, bhPostaCall), [])
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
    setGenerated(false)
    setGenerationError('')
    setPackageResult(null)
    try {
      for (let index = 0; index < steps.length; index++) {
        setActiveStep(index)
        await new Promise(resolve => setTimeout(resolve, 450))
        if (index === steps.length - 1) {
          const response = await fetch('/api/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(project) })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error ?? 'Generisanje nije uspjelo')
          setPackageResult(result)
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

  async function uploadCall(file: File) {
    if (!supabase) return
    setCallName(file.name)
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
    const upload = await supabase.storage.from('project-files').upload(path, file, { contentType: 'application/pdf', upsert: false })
    if (upload.error) { setAuthMessage('PDF nije moguće sačuvati.'); return }
    const saved = await supabase.from('public_calls').insert({ user_id: user.id, file_path: path, file_name: file.name, mime_type: 'application/pdf', extracted_text: extraction.text ?? null, ocr_used: extraction.ocrUsed ?? false }).select('id').single()
    if (saved.error) setAuthMessage('Metapodaci poziva nisu sačuvani.')
    else if (extraction.needsOcr) setAuthMessage('PDF je sačuvan, ali izgleda kao sken. OCR korak je potreban prije AI ekstrakcije.')
  }

  async function authenticate(mode: 'login' | 'signup') {
    if (!supabase) return
    setAuthBusy(true); setAuthMessage('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: userEmail, password: userPassword })
      : await supabase.auth.signUp({ email: userEmail, password: userPassword, options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback` } })
    setAuthBusy(false)
    if (result.error) setAuthMessage(mode === 'login' ? 'Neispravan email ili lozinka.' : 'Registracija nije završena. Provjerite email za potvrdu.')
    else if (mode === 'signup') setAuthMessage('Potvrdite email adresu, zatim se prijavite.')
    else setAuthenticated(true)
  }

  if (!authenticated) return <main className="shell"><div className="workspace auth-screen"><section className="panel auth-panel"><div className="eyebrow">ECO SCUBA · ZAŠTIĆENI RADNI PROSTOR</div><h1>Prijavite se za<br /><em>novi projektni paket.</em></h1><p>Vaši pozivi, projekti i dokumenti ostaju privatni i dostupni samo Vašem nalogu.</p><label>EMAIL<input type="email" value={userEmail} onChange={event => setUserEmail(event.target.value)} placeholder="vas@email.ba" /></label><label>LOZINKA<input type="password" value={userPassword} onChange={event => setUserPassword(event.target.value)} placeholder="Najmanje 6 znakova" /></label><div className="auth-actions"><button className="generate-btn" disabled={authBusy || !userEmail || !userPassword} onClick={() => authenticate('login')}>{authBusy ? 'Provjera…' : 'Prijavi se'}<ChevronRight size={18} /></button><button className="text-button" disabled={authBusy} onClick={() => authenticate('signup')}>Napravi nalog</button></div>{authMessage && <div className="notice"><CircleAlert size={17} /><span>{authMessage}</span></div>}</section></div></main>

  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">SC</div><div><strong>ECO SCUBA</strong><span>Projektni studio</span></div></div><div className="top-status"><span className="status-dot" /> Radni prostor KVS „S.C.U.B.A.“ <span className="avatar">AD</span></div></header>
    <div className="workspace">
      <section className="intro"><div className="eyebrow">NOVI PROJEKTNI PAKET <span>V1</span></div><h1>Od javnog poziva<br /><em>do spremne prijave.</em></h1><p>Jedan strukturirani model. Jedna istina za svaki dokument. Sistem provjerava budžet, usklađenost i nedostajuće podatke prije isporuke.</p></section>
      <section className="eligibility-gate panel"><div className="panel-heading"><div><span className="step-number">00</span><h2>Da li poziv odgovara klubu?</h2></div><span className={`readiness ${eligibility.status === 'eligible' ? 'ready' : 'draft'}`}><span /> {eligibility.status === 'eligible' ? 'ELIGIBLE' : 'PROVJERA'}</span></div><p className="gate-lead">Analiza poziva se završava prije unosa projekta. Matcher provjerava formalne uslove, oblast, teritoriju i rok.</p><div className="gate-grid"><div><small>PREDLOŽENA KOMPONENTA</small><strong>{eligibility.recommendedProgram ?? 'Nema podudaranja'}</strong></div><div><small>OSNOV ZAKLJUČKA</small><span>{eligibility.reasons[0]}</span></div></div>{eligibility.risks.length > 0 && <div className="notice"><CircleAlert size={17} /><span><b>Rizici prije nastavka:</b> {eligibility.risks.join(' ')}</span></div>}<div className="gate-actions"><span>{eligibility.callPoints.length} tačaka poziva provjereno</span><button className="generate-btn" type="button" onClick={() => setGateConfirmed(true)} disabled={eligibility.status === 'not_eligible' || gateConfirmed}>{gateConfirmed ? 'Komponenta potvrđena' : `Nastavi i generiši za ${eligibility.recommendedProgram ?? 'odabranu oblast'}`}<ChevronRight size={18} /></button></div></section>
      <div className="layout-grid">
        <section className="panel input-panel"><div className="panel-heading"><div><span className="step-number">01</span><h2>Ulazni podaci</h2></div><span className="quiet-label">2 ekrana</span></div>
          <label className="upload-box" htmlFor="call-upload"><UploadCloud size={22} /><span><strong>{callName}</strong><small>PDF · upload u privatni Supabase Storage</small></span><Check className="upload-check" size={20} /><input id="call-upload" type="file" accept="application/pdf" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadCall(file) }} /></label>
          <div className="field-grid"><label>NAZIV PROJEKTA<input value={project.program.title} onChange={e => update('title', e.target.value)} /></label><label>OBLAST<input value={project.program.field} onChange={e => update('field', e.target.value)} /></label><label>TRAJANJE<input value={project.program.duration} onChange={e => update('duration', e.target.value)} /></label><label>TRAŽENI IZNOS (KM)<input type="number" value={project.program.requestedFromDonor} onChange={e => update('requestedFromDonor', e.target.value)} /></label></div>
          <label className="wide-field">OPIS POTREBE<textarea value={project.program.need} onChange={e => update('need', e.target.value)} rows={3} /></label>
          <div className="club-card"><div className="club-monogram">S</div><div><small>PODNOSILAC PRIJAVE</small><strong>{project.applicant.name.value}</strong><span>{project.applicant.address.value}</span></div><button type="button">Uredi profil <ChevronRight size={14} /></button></div>
        </section>
        <section className="panel validation-panel"><div className="panel-heading"><div><span className="step-number">02</span><h2>Kontrola kvaliteta</h2></div><div className={`readiness ${status}`}><span /> {status === 'ready' ? 'SPREMNO' : 'NACRT'}</div></div><div className="score"><strong>{passed}<small>/{validation.length}</small></strong><div><b>kontrola prije predaje</b><span>Validatori rade nad podacima, ne nad izgledom dokumenta.</span></div></div><div className="checks">{validation.map(item => <div className={`check-row ${item.ok ? 'ok' : 'fail'}`} key={item.validator}><div className="check-icon">{item.ok ? <Check size={14} /> : <CircleAlert size={14} />}</div><div><strong>{item.validator.replace('validate', '')}</strong><span>{item.message}</span></div><span className="check-state">{item.ok ? 'PROŠLO' : 'PAŽNJA'}</span></div>)}</div><div className="notice"><CircleAlert size={17} /><span><b>Jedno polje traži potvrdu.</b> Broj bankovnog računa nedostaje i označava paket kao nacrt.</span></div></section>
      </div>
      <section className="generation panel"><div className="generation-top"><div><div className="eyebrow">GENERISANJE PAKETA</div><h2>{generated ? 'Paket je pripremljen.' : 'Spremni za provjeru?'}</h2><p>{generated ? 'Pregledajte fajlove i preuzmite radnu verziju ili dopunite podatke.' : 'AI popunjava model, a kod provjerava i renderuje svaki dokument.'}</p></div><button className="generate-btn" onClick={generate} disabled={generating || !gateConfirmed}>{generating ? <><Loader2 className="spin" size={18} /> Generišem…</> : <>Generiši paket <ChevronRight size={18} /></>}</button></div>{(generating || generated || generationError) && <div className="progress-track">{steps.map((step, index) => <div className={`progress-step ${index < activeStep ? 'done' : index === activeStep ? 'current' : ''}`} key={step}><div className="progress-icon">{index < activeStep ? <Check size={13} /> : index === activeStep ? <Loader2 className="spin" size={13} /> : index + 1}</div><span>{step}</span></div>)}</div>}{generationError && <div className="notice"><CircleAlert size={17} /><span><b>Generisanje nije završeno.</b> {generationError}</span></div>}{generated && packageResult && <div className="documents"><div className="documents-heading"><div><span className="eyebrow">PREGLED PRIJE PREUZIMANJA</span><h3>Ovako izgleda Vaš dokument</h3></div><span className="preview-note"><Eye size={15} /> PDF raster provjera</span></div>{packageResult.files.map(file => <article className="document-card" key={file.name}><div className="preview-frame"><iframe title={`Pregled: ${file.label}`} src={`data:application/pdf;base64,${file.preview}`} /></div><div className="document-meta"><div className="doc-icon"><FileText size={20} /></div><div><strong>{file.label}</strong><span>{file.name.endsWith('.xlsx') ? 'XLSX · žive formule' : 'DOCX · tekstualni sloj'}</span></div><a href={`data:${file.mime};base64,${file.data}`} download={file.name} aria-label={`Preuzmi ${file.label}${status === 'ready' ? '' : ' kao radnu verziju'}`}>{status === 'ready' ? 'Preuzmi' : 'Radna verzija'}</a></div></article>)}</div>}</section>
      <footer><span>© 2026 KVS „S.C.U.B.A.“ Sarajevo</span><span><b>V1 CORE</b> · Strukturirani izlaz, deterministička kontrola</span></footer>
    </div>
  </main>
}
