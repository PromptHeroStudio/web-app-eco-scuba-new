'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronRight, CircleAlert, FileText, FolderArchive, Loader2, UploadCloud } from 'lucide-react'
import { createDemoProject, documentKinds, projectStatus, validateProject, type Project } from '@/lib/proposal-model'

const steps = ['Ekstrakcija poziva', 'AI popunjava sekcije', 'Deterministička validacija', 'Renderovanje dokumenata']

export default function Home() {
  const [project, setProject] = useState<Project>(createDemoProject())
  const [callName, setCallName] = useState('02 — Javni oglas za dodjelu donacija 2026.pdf')
  const [generating, setGenerating] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
  const [generated, setGenerated] = useState(false)
  const [packageResult, setPackageResult] = useState<{ files: { name: string; label: string; mime: string; data: string; preview: string }[] } | null>(null)
  const [generationError, setGenerationError] = useState('')
  const validation = useMemo(() => validateProject(project), [project])
  const status = projectStatus(project)
  const passed = validation.filter(item => item.ok).length
  const update = (key: keyof Project['program'], value: string) => setProject(current => ({ ...current, program: { ...current.program, [key]: value } }))

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

  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">SC</div><div><strong>ECO SCUBA</strong><span>Projektni studio</span></div></div><div className="top-status"><span className="status-dot" /> Radni prostor KVS „S.C.U.B.A.“ <span className="avatar">AD</span></div></header>
    <div className="workspace">
      <section className="intro"><div className="eyebrow">NOVI PROJEKTNI PAKET <span>V1</span></div><h1>Od javnog poziva<br /><em>do spremne prijave.</em></h1><p>Jedan strukturirani model. Jedna istina za svaki dokument. Sistem provjerava budžet, usklađenost i nedostajuće podatke prije isporuke.</p></section>
      <div className="layout-grid">
        <section className="panel input-panel"><div className="panel-heading"><div><span className="step-number">01</span><h2>Ulazni podaci</h2></div><span className="quiet-label">2 ekrana</span></div>
          <label className="upload-box"><UploadCloud size={22} /><span><strong>{callName}</strong><small>PDF · 4.8 MB · tekst je uspješno ekstrahovan</small></span><Check className="upload-check" size={20} /></label>
          <div className="field-grid"><label>NAZIV PROJEKTA<input value={project.program.title} onChange={e => update('title', e.target.value)} /></label><label>OBLAST<input value={project.program.field} onChange={e => update('field', e.target.value)} /></label><label>TRAJANJE<input value={project.program.duration} onChange={e => update('duration', e.target.value)} /></label><label>TRAŽENI IZNOS (KM)<input type="number" value={project.program.requestedFromDonor} onChange={e => update('requestedFromDonor', e.target.value)} /></label></div>
          <label className="wide-field">OPIS POTREBE<textarea value={project.program.need} onChange={e => update('need', e.target.value)} rows={3} /></label>
          <div className="club-card"><div className="club-monogram">S</div><div><small>PODNOSILAC PRIJAVE</small><strong>{project.applicant.name.value}</strong><span>{project.applicant.address.value}</span></div><button type="button">Uredi profil <ChevronRight size={14} /></button></div>
        </section>
        <section className="panel validation-panel"><div className="panel-heading"><div><span className="step-number">02</span><h2>Kontrola kvaliteta</h2></div><div className={`readiness ${status}`}><span /> {status === 'ready' ? 'SPREMNO' : 'NACRT'}</div></div><div className="score"><strong>{passed}<small>/{validation.length}</small></strong><div><b>kontrola prije predaje</b><span>Validatori rade nad podacima, ne nad izgledom dokumenta.</span></div></div><div className="checks">{validation.map(item => <div className={`check-row ${item.ok ? 'ok' : 'fail'}`} key={item.validator}><div className="check-icon">{item.ok ? <Check size={14} /> : <CircleAlert size={14} />}</div><div><strong>{item.validator.replace('validate', '')}</strong><span>{item.message}</span></div><span className="check-state">{item.ok ? 'PROŠLO' : 'PAŽNJA'}</span></div>)}</div><div className="notice"><CircleAlert size={17} /><span><b>Jedno polje traži potvrdu.</b> Broj bankovnog računa nedostaje i označava paket kao nacrt.</span></div></section>
      </div>
      <section className="generation panel"><div className="generation-top"><div><div className="eyebrow">GENERISANJE PAKETA</div><h2>{generated ? 'Paket je pripremljen.' : 'Spremni za provjeru?'}</h2><p>{generated ? 'Pregledajte fajlove i preuzmite radnu verziju ili dopunite podatke.' : 'AI popunjava model, a kod provjerava i renderuje svaki dokument.'}</p></div><button className="generate-btn" onClick={generate} disabled={generating}>{generating ? <><Loader2 className="spin" size={18} /> Generišem…</> : <>Generiši paket <ChevronRight size={18} /></>}</button></div>{(generating || generated || generationError) && <div className="progress-track">{steps.map((step, index) => <div className={`progress-step ${index < activeStep ? 'done' : index === activeStep ? 'current' : ''}`} key={step}><div className="progress-icon">{index < activeStep ? <Check size={13} /> : index === activeStep ? <Loader2 className="spin" size={13} /> : index + 1}</div><span>{step}</span></div>)}</div>}{generationError && <div className="notice"><CircleAlert size={17} /><span><b>Generisanje nije završeno.</b> {generationError}</span></div>}{generated && packageResult && <div className="documents">{packageResult.files.map(file => <div className="document-card" key={file.name}><div className="doc-icon"><FileText size={20} /></div><div><strong>{file.label}</strong><span>{file.name.endsWith('.xlsx') ? 'XLSX · žive formule' : 'DOCX · tekstualni sloj'}</span></div><a href={`data:${file.mime};base64,${file.data}`} download={file.name}>Preuzmi</a></div>)}<button className="zip-btn" type="button"><FolderArchive size={18} /> Paket generisan server-side</button></div>}</section>
      <footer><span>© 2026 KVS „S.C.U.B.A.“ Sarajevo</span><span><b>V1 CORE</b> · Strukturirani izlaz, deterministička kontrola</span></footer>
    </div>
  </main>
}
