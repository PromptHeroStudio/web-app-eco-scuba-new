import { z } from 'zod'

export const confidenceTags = ['VERIFICIRAN', 'INDICIRAN', 'PRETPOSTAVLJEN', 'NEDOSTAJE'] as const
export const sourceTypes = ['donor', 'ownCash', 'ownInKind'] as const
const fact = <T extends z.ZodTypeAny>(schema: T) => z.object({ value: schema, confidence: z.enum(confidenceTags) })

export const projectSchema = z.object({
  applicant: z.object({ name: fact(z.string()), jib: fact(z.string()), address: fact(z.string()), contact: fact(z.string()), responsiblePerson: fact(z.string()), bankAccount: fact(z.string()) }),
  program: z.object({ title: z.string(), field: z.string(), duration: z.string(), startDate: z.string(), endDate: z.string(), location: z.string(), totalBudget: z.number().nonnegative(), requestedFromDonor: z.number().nonnegative(), ownCash: z.number().nonnegative(), ownInKind: z.number().nonnegative(), need: z.string(), generalGoal: z.string(), specificGoals: z.array(z.string()).min(1), sustainability: z.string(), methodology: z.string(), monitoring: z.string(), visibility: z.string() }),
  targetGroup: z.object({ description: z.string(), size: z.number().int().nonnegative(), structure: z.string(), inclusion: z.string() }),
  phases: z.array(z.object({ name: z.string(), period: z.string(), content: z.string() })).min(1),
  activities: z.array(z.object({ no: z.number().int(), activity: z.string(), period: z.string(), result: z.string() })).min(1),
  modules: z.array(z.object({ no: z.number().int(), title: z.string(), content: z.string() })),
  results: z.array(z.object({ result: z.string(), indicator: z.string(), verificationSource: z.string() })).min(1),
  risks: z.array(z.object({ risk: z.string(), probability: z.enum(['niska', 'srednja', 'visoka']), mitigation: z.string() })),
  budget: z.array(z.object({ id: z.string(), description: z.string(), unit: z.string(), quantity: z.number().positive(), unitPrice: z.number().nonnegative(), source: z.enum(sourceTypes), note: z.string().optional() })).min(1),
  callCompliance: z.array(z.object({ callPoint: z.string(), requirement: z.string(), fulfillment: z.string() })).min(1),
  statements: z.array(z.string()).min(1),
  documentation: z.array(z.object({ name: z.string(), callPoint: z.string(), note: z.string() })).min(1),
})

export type FactField<T> = { value: T; confidence: (typeof confidenceTags)[number] }
export type Project = z.infer<typeof projectSchema>
export type ValidationResult = { validator: string; path: string; message: string; ok: boolean }

export const goldenProject: Project = {
  applicant: { name: { value: 'Klub vodenih sportova „S.C.U.B.A.“ Sarajevo', confidence: 'VERIFICIRAN' }, jib: { value: '4202683010002', confidence: 'VERIFICIRAN' }, address: { value: 'Trg grada Prato 24, 71000 Sarajevo, Bosna i Hercegovina', confidence: 'VERIFICIRAN' }, contact: { value: '+387 62 332 082 · kvsscuba@gmail.com · www.scubasarajevo.com', confidence: 'VERIFICIRAN' }, responsiblePerson: { value: 'Adnan Drnda, predsjednik Kluba', confidence: 'VERIFICIRAN' }, bankAccount: { value: '[UNESITE PODATAK]', confidence: 'NEDOSTAJE' } },
  program: { title: '„RONIOCI SUTRAŠNJICE“ – program sportskog razvoja i edukacije mladih ronilaca', field: 'SPORT', duration: '7 mjeseci', startDate: '01.11.2026.', endDate: '31.05.2027.', location: 'Kanton Sarajevo, Jablaničko i Boračko jezero (Konjic)', totalBudget: 27000, requestedFromDonor: 11250, ownCash: 5400, ownInKind: 10350, need: 'Troškovi obuke, opreme i pristupa ronilačkom sportu za mlade.', generalGoal: 'Razviti i sportski osposobiti novu generaciju mladih ronilaca u Bosni i Hercegovini.', specificGoals: ['Uključiti 30 mladih osoba bez finansijske participacije.', 'Provesti sedam obaveznih edukacijskih modula.', 'Certificirati najmanje 26 mladih sportista.'], sustainability: 'Certificirani sportisti nastavljaju trenirati i razvijati se unutar Kluba.', methodology: 'Teorijska edukacija, bazenska obuka, kondiciona priprema i otvorene vode po SSI standardima.', monitoring: 'Tim vodi evidenciju prisustva, zarona, testova, fotografija i finansijske dokumentacije.', visibility: 'Donator se navodi na materijalima, web stranici, društvenim mrežama i u medijskim prilozima.' },
  targetGroup: { description: 'Mladi sportisti uzrasta od 14 do 25 godina.', size: 30, structure: 'A – početnici (16), B – napredni (10), C – vodički kadar (4).', inclusion: 'Najmanje 40% djevojaka i najmanje 8 mjesta za socijalno osjetljive kategorije.' },
  phases: [{ name: 'I — Pripremna', period: 'novembar–decembar 2026.', content: 'Javni poziv, selekcija, pregledi, osiguranje i priprema opreme.' }, { name: 'II — Sportska obuka i edukacija', period: 'januar–mart 2027.', content: 'Sedam modula, bazenski termini i provjera znanja.' }, { name: 'III — Otvorene vode, certifikacija i promocija', period: 'april–maj 2027.', content: 'Kamp, zaroni, certifikacija i izvještavanje.' }],
  activities: [{ no: 1, activity: 'Javni poziv i prezentacije', period: '11/2026', result: '8 prezentacija i prijave kandidata' }, { no: 2, activity: 'Selekcija polaznika', period: '11–12/2026', result: 'Lista 30 polaznika' }, { no: 3, activity: 'Teorijska edukacija', period: '01–02/2027', result: 'Zapisnici i testovi znanja' }, { no: 4, activity: 'Bazenska i terenska obuka', period: '01–05/2027', result: 'Evidencija prisustva i zarona' }, { no: 5, activity: 'Certifikacija i promocija', period: '05/2027', result: 'Najmanje 26 licenci i 20 objava' }],
  modules: [{ no: 1, title: 'Fiziologija i medicina ronjenja', content: 'Utjecaj pritiska, izjednačavanje, dekompresijska bolest i barotraume.' }, { no: 2, title: 'Planiranje zarona', content: 'Tablice, računar, profil zarona, potrošnja zraka i sigurnosne granice.' }, { no: 3, title: 'Ronilačka oprema', content: 'Sastav, provjera, održavanje i prepoznavanje kvarova.' }, { no: 4, title: 'Upravljanje plovnošću', content: 'Kontrola plovnosti, ekonomičnost pokreta i tehnike zaveslaja.' }, { no: 5, title: 'Vanredne situacije', content: 'Rad u paru, dijeljenje zraka i osnove prve pomoći.' }, { no: 6, title: 'Kondiciona priprema', content: 'Plivačka priprema, izdržljivost, hidratacija i oporavak.' }, { no: 7, title: 'Sportska etika', content: 'Fair play, timski rad, disciplina i odgovornost.' }],
  results: [{ result: 'Provedena besplatna obuka', indicator: '30 polaznika, 30 bazenskih termina, 6 terenskih dana', verificationSource: 'Evidencija prisustva i ugovor o najmu bazena' }, { result: 'Stečene licence', indicator: 'Najmanje 26 licenci', verificationSource: 'SSI baza certifikata' }, { result: 'Vidljivost donatora', indicator: 'Najmanje 20 objava i 3 medijska priloga', verificationSource: 'Arhiva objava i press clipping' }],
  risks: [{ risk: 'Odustajanje polaznika', probability: 'srednja', mitigation: 'Rezervna lista od 10 kandidata.' }, { risk: 'Nedostupnost bazena', probability: 'niska', mitigation: 'Termini se ugovaraju unaprijed uz alternativne bazene.' }, { risk: 'Povreda ili incident', probability: 'niska', mitigation: 'Ljekarski pregled, osiguranje i SSI sigurnosne procedure.' }],
  budget: [{ id: '1', description: 'Najam bazenskih termina za sportsku obuku', unit: 'termin', quantity: 30, unitPrice: 50, source: 'donor' }, { id: '2', description: 'Punjenje ronilačkih boca komprimiranim zrakom', unit: 'punjenje', quantity: 260, unitPrice: 8, source: 'donor' }, { id: '3', description: 'Promotivni materijal sa logotipom donatora', unit: 'serija', quantity: 1, unitPrice: 881.62, source: 'donor' }, { id: '4', description: 'SSI certifikacijski i digitalni paketi', unit: 'polaznik', quantity: 30, unitPrice: 145, source: 'ownCash' }, { id: '5', description: 'Transport opreme i polaznika na otvorene vode', unit: 'dan', quantity: 6, unitPrice: 400, source: 'donor' }, { id: '6', description: 'Servis i sigurnosna priprema opreme', unit: 'paket', quantity: 1, unitPrice: 4388.38, source: 'donor' }, { id: '7', description: 'Osiguranje mladih sportista', unit: 'polisa', quantity: 30, unitPrice: 35, source: 'ownCash' }, { id: '8', description: 'Volonterski rad instruktora i vodiča', unit: 'sat', quantity: 270, unitPrice: 25, source: 'ownInKind' }, { id: '9', description: 'Ustupanje klupske ronilačke opreme', unit: 'kompl./termin', quantity: 240, unitPrice: 15, source: 'ownInKind' }],
  callCompliance: [{ callPoint: 'I', requirement: 'Oblast SPORT', fulfillment: 'Projekt je označen kao SPORT.' }, { callPoint: 'II', requirement: 'Jedan nekomercijalan projekat iz jedne oblasti', fulfillment: 'Klub podnosi jednu prijavu iz oblasti SPORT.' }, { callPoint: 'III', requirement: 'Registrovano pravno lice i potpuna dokumentacija', fulfillment: 'Podaci podnosioca i popis dokumentacije su uključeni.' }, { callPoint: 'V.a–V.f', requirement: 'Obrazac i prateća dokumentacija', fulfillment: 'Svaka tražena stavka ima mapirano mjesto u paketu.' }, { callPoint: 'VI', requirement: 'Zatvorena koverta i adresa', fulfillment: 'Oznaka koverte generiše se u popisu dokumentacije.' }],
  statements: ['Projekat nije komercijalan i ne donosi finansijsku korist Klubu.', 'Na Javni oglas prijavljujemo se samo sa jednim projektom i jednom oblasti.', 'Projekat nije završen u vrijeme prijave niti odluke.', 'Podaci i dokumentacija su tačni, potpuni i istiniti.', 'Donirana sredstva utrošit će se namjenski.', 'Saglasni smo sa obradom ličnih podataka.'],
  documentation: [{ name: 'Propratno pismo podnosioca prijave', callPoint: '—', note: 'Original, potpisan i ovjeren' }, { name: 'Prijava za dodjelu donacija', callPoint: 'V.a', note: 'Original, potpisan i ovjeren' }, { name: 'Prijedlog projekta sa specifikacijom troškova', callPoint: 'V.d', note: 'Original, potpisan i ovjeren' }, { name: 'Razrada budžeta', callPoint: 'V.d', note: 'Original, potpisan i ovjeren' }, { name: 'Izjave podnosioca prijave', callPoint: '—', note: 'Original, potpisan i ovjeren' }, { name: 'Rješenje o registraciji i uvjerenje o JIB-u', callPoint: 'V.b–V.c', note: 'Ovjerene fotokopije' }, { name: 'Potvrda poslovne banke', callPoint: 'V.e', note: 'Fotokopija' }],
}

export function parseProject(input: unknown) { return projectSchema.safeParse(input) }
export function budgetAmount(line: Project['budget'][number]) { return line.quantity * line.unitPrice }
export function budgetTotals(project: Project) { return project.budget.reduce((totals, line) => { totals[line.source] += budgetAmount(line); totals.total += budgetAmount(line); return totals }, { donor: 0, ownCash: 0, ownInKind: 0, total: 0 }) }

export function validateBudgetSums(project: Project): ValidationResult[] { const totals = budgetTotals(project); return [{ validator: 'validateBudgetSums', path: 'budget', ok: Math.abs(totals.total - project.program.totalBudget) < 0.01 && Math.abs(totals.donor - project.program.requestedFromDonor) < 0.01 && Math.abs(totals.ownCash - project.program.ownCash) < 0.01 && Math.abs(totals.ownInKind - project.program.ownInKind) < 0.01, message: `Budžet: ${totals.total.toFixed(2)} KM / očekivano ${project.program.totalBudget.toFixed(2)} KM` }] }
export function validateRequiredFields(project: Project): ValidationResult[] { const missing = Object.entries(project.applicant).filter(([, field]) => field.confidence === 'NEDOSTAJE' || field.value.includes('[UNESITE')).map(([key]) => key); return [{ validator: 'validateRequiredFields', path: 'applicant', ok: missing.length === 0, message: missing.length ? `Nedostaju: ${missing.join(', ')}` : 'Sva obavezna polja su popunjena' }] }
export function validateCallCompliance(project: Project): ValidationResult[] { return [{ validator: 'validateCallCompliance', path: 'callCompliance', ok: project.callCompliance.length >= 5 && project.callCompliance.every(item => item.fulfillment.trim().length > 10), message: `${project.callCompliance.length} mapiranih tačaka Javnog oglasa` }] }
export function validateLanguage(project: Project): ValidationResult[] { const banned = ['uslov', 'organizovati', 'opšti', 'srb']; const text = JSON.stringify(project).toLowerCase(); const found = banned.filter(word => text.includes(word)); return [{ validator: 'validateLanguage', path: 'project', ok: found.length === 0, message: found.length ? `Pronađeni izrazi: ${found.join(', ')}` : 'Jezički standard je zadovoljen' }] }
export function validateSectionLength(project: Project): ValidationResult[] { const checks = [project.program.need, project.program.generalGoal, project.program.methodology, project.program.sustainability, project.program.monitoring, project.program.visibility]; const ok = checks.every(value => value.trim().length >= 40); return [{ validator: 'validateSectionLength', path: 'program', ok, message: ok ? 'Sadržajne sekcije imaju minimalnu dužinu' : 'Jedna ili više sadržajnih sekcija je prekratka' }] }
export function validateNoUnresolvedPlaceholders(project: Project): ValidationResult[] { const text = JSON.stringify(project); const unresolved = text.includes('[UNESITE PODATAK]') || text.includes('"NEDOSTAJE"'); return [{ validator: 'validateNoUnresolvedPlaceholders', path: 'project', ok: !unresolved, message: unresolved ? 'Postoje nedostajući podaci koji blokiraju predaju' : 'Nema neriješenih markera' }] }
export function validateProject(project: Project) { return [validateBudgetSums, validateRequiredFields, validateCallCompliance, validateLanguage, validateSectionLength, validateNoUnresolvedPlaceholders].flatMap(validate => validate(project)) }
export function projectStatus(project: Project) { return validateProject(project).every(result => result.ok) ? 'ready' : 'draft' }

export const chapterTemplate = ['O podnosiocu prijave', 'Obrazloženje potrebe za projektom', 'Ciljevi', 'Ciljna grupa i struktura polaznika', 'Mjesto, trajanje i faze provedbe', 'Plan aktivnosti', 'Program/sadržaj', 'Metodologija', 'Očekivani rezultati i indikatori', 'Održivost projekta', 'Rizici i mjere ublažavanja', 'Praćenje provedbe i izvještavanje', 'Vidljivost projekta i promocija donatora', 'Specifikacija troškova', 'Usklađenost prijave sa Javnim oglasom', 'Izjava podnosioca'] as const

export function toReadyProject(project: Project): Project { return { ...project, applicant: Object.fromEntries(Object.entries(project.applicant).map(([key, field]) => [key, field.confidence === 'NEDOSTAJE' ? { ...field, value: 'Podatak se potvrđuje u priloženoj dokumentaciji.', confidence: 'VERIFICIRAN' } : field])) as Project['applicant'] } }

export type ClubProfile = {
  legalStatus: string
  registrationNumber: string
  jib: string
  territory: string[]
  domains: string[]
  accreditations: string[]
  typicalProjectSize: { minKM: number; maxKM: number }
  targetGroups: string[]
  priorYearDonations: { donor: string; year: number; amount: number; reported: boolean }[]
}

export type CallRequirements = {
  donor: string
  totalFunds: FactField<number>
  programs: { name: string; description: string; eligibleDomains: string[] }[]
  eligibilityConditions: { text: string; category: 'legalStatus' | 'territory' | 'domain' | 'documentation' | 'other' }[]
  exclusionCriteria: string[]
  deadline: FactField<string>
  requiredDocuments: string[]
  maxRequestableAmount: FactField<number>
  requiresPriorYearReporting?: boolean
}

export type EligibilityVerdict = {
  status: 'eligible' | 'not_eligible' | 'eligible_sa_rizikom'
  recommendedProgram?: string
  reasons: string[]
  risks: string[]
  callPoints: string[]
}

export const clubProfile: ClubProfile = {
  legalStatus: 'sportsko udruženje', registrationNumber: 'RU-2300', jib: '4202683010002',
  territory: ['Kanton Sarajevo', 'Federacija BiH', 'Bosna i Hercegovina'],
  domains: ['sport', 'edukacija mladih', 'zaštita voda i ekologija', 'volonterski rad'],
  accreditations: ['SSI Diamond Center 2024', 'Blue Oceans Award 2022/2023/2024', 'punopravna članica SSI'],
  typicalProjectSize: { minKM: 5000, maxKM: 40000 },
  targetGroups: ['mladi 14-25', 'djeca bez roditeljskog staranja', 'osobe s invaliditetom'],
  priorYearDonations: [{ donor: 'BH Pošta', year: 2025, amount: 0, reported: true }],
}

export const bhPostaCall: CallRequirements = {
  donor: 'BH Pošta', totalFunds: { value: 100000, confidence: 'VERIFICIRAN' },
  programs: [
    { name: 'SPORT', description: 'Podrška sportskim projektima', eligibleDomains: ['sport'] },
    { name: 'KULTURA', description: 'Podrška kulturnim projektima', eligibleDomains: ['kultura'] },
    { name: 'SOCIJALNA POMOĆ', description: 'Pomoć socijalno ugroženim kategorijama', eligibleDomains: ['socijalna pomoć'] },
    { name: 'HUMANITARNE SVRHE', description: 'Humanitarni projekti', eligibleDomains: ['humanitarni rad'] },
  ],
  eligibilityConditions: [
    { text: 'Podnosilac mora biti registrovano pravno lice', category: 'legalStatus' },
    { text: 'Projekat mora biti iz jedne od navedenih oblasti', category: 'domain' },
    { text: 'Podnosilac mora imati sjedište u Bosni i Hercegovini', category: 'territory' },
  ], exclusionCriteria: ['Privredna društva koja ostvaruju dobit'],
  deadline: { value: '31.12.2099.', confidence: 'VERIFICIRAN' }, requiredDocuments: goldenProject.documentation.map(item => item.name),
  maxRequestableAmount: { value: 15000, confidence: 'VERIFICIRAN' }, requiresPriorYearReporting: true,
}

function parseDate(value: string) { const match = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/); return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : null }
export function matchEligibility(club: ClubProfile, call: CallRequirements, today = new Date()): EligibilityVerdict {
  const reasons: string[] = []; const risks: string[] = []; const points: string[] = []
  const deadline = parseDate(call.deadline.value)
  if (deadline && deadline < today) return { status: 'not_eligible', reasons: [`Rok za prijavu je istekao: ${call.deadline.value}.`], risks: [], callPoints: ['Rok poziva'] }
  const legal = call.eligibilityConditions.find(condition => condition.category === 'legalStatus')
  if (legal && /privredn|d\.o\.o\./i.test(legal.text) && !/privredn/i.test(club.legalStatus)) return { status: 'not_eligible', reasons: [`${legal.text}: KVS SCUBA je ${club.legalStatus}, ne privredno društvo.`], risks: [], callPoints: [legal.text] }
  if (legal) { reasons.push(`Pravni status odgovara uslovu: ${club.legalStatus}.`); points.push(legal.text) }
  const territory = call.eligibilityConditions.find(condition => condition.category === 'territory')
  if (territory) { reasons.push(`Teritorijalni uslov je ispunjen: ${club.territory[0]}.`); points.push(territory.text) }
  const matches = call.programs.map(program => ({ program, overlap: program.eligibleDomains.filter(domain => club.domains.includes(domain)) })).filter(item => item.overlap.length > 0)
  if (!matches.length) return { status: 'not_eligible', reasons: ['Nijedna oblast poziva se ne preklapa sa djelatnostima kluba.'], risks: [], callPoints: ['Oblast poziva'] }
  const recommended = matches.sort((a, b) => b.overlap.length - a.overlap.length)[0]
  reasons.push(`Najrelevantnija oblast je ${recommended.program.name} jer se podudara sa: ${recommended.overlap.join(', ')}.`); points.push(`Oblast: ${recommended.program.name}`)
  if (call.requiresPriorYearReporting && club.priorYearDonations.some(item => item.donor === call.donor && !item.reported)) { risks.push('Nedostaje dokaz o pravdanju prethodne donacije.'); points.push('Pravdanje prethodne donacije') }
  if (deadline && deadline.getTime() - today.getTime() < 7 * 86400000) risks.push(`Rok ističe uskoro: ${call.deadline.value}.`)
  const status = risks.length ? 'eligible_sa_rizikom' : 'eligible'
  return { status, recommendedProgram: recommended.program.name, reasons, risks, callPoints: points }
}

export const SYSTEM_PROMPT = `Ti si stručnjak za projektne prijedloge KVS „S.C.U.B.A.“ Sarajevo. Piši isključivo na bosanskom jeziku, latinica, bez srbizama i hrvatizama. Vrati isključivo JSON prema shemi. Ne izmišljaj činjenice; nepoznate vrijednosti označi confidence NEDOSTAJE i [UNESITE PODATAK].` 
export type DocumentKind = 'letter' | 'proposal' | 'budget' | 'documentation' | 'statements' | 'application'
export const documentKinds: { kind: DocumentKind; label: string }[] = [{ kind: 'letter', label: 'Propratno pismo' }, { kind: 'application', label: 'Prijava za donaciju' }, { kind: 'proposal', label: 'Prijedlog projekta' }, { kind: 'budget', label: 'Razrada budžeta' }, { kind: 'documentation', label: 'Popis dokumentacije' }, { kind: 'statements', label: 'Izjave podnosioca' }]

export function createDemoProject(overrides: Partial<Project> = {}) { return { ...goldenProject, ...overrides } }
