import { describe, expect, it } from 'vitest'
import { bhPostaCall, chapterTemplate, clubProfile, createDemoProject, matchEligibility, validateBudgetSums, validateCallCompliance, validateLanguage, validateNoUnresolvedPlaceholders, validateRequiredFields, validateSectionLength, type CallRequirements } from './proposal-model'

describe('ECO SCUBA validators', () => {
  it('accepts the golden budget totals', () => expect(validateBudgetSums(createDemoProject())[0].ok).toBe(true))
  it('rejects a changed donor amount', () => expect(validateBudgetSums(createDemoProject({ program: { ...createDemoProject().program, requestedFromDonor: 1 } }))[0].ok).toBe(false))
  it('rejects missing required applicant data', () => expect(validateRequiredFields(createDemoProject())[0].ok).toBe(false))
  it('accepts mapped call requirements', () => expect(validateCallCompliance(createDemoProject())[0].ok).toBe(true))
  it('rejects unresolved placeholders', () => expect(validateNoUnresolvedPlaceholders(createDemoProject())[0].ok).toBe(false))
  it('accepts complete section lengths', () => expect(validateSectionLength(createDemoProject())[0].ok).toBe(true))
  it('rejects banned language', () => expect(validateLanguage(createDemoProject({ program: { ...createDemoProject().program, need: 'Ovaj uslov zahtijeva organizovati aktivnosti.' } }))[0].ok).toBe(false))
  it('accepts BH Pošta for the SPORT component', () => {
    const verdict = matchEligibility(clubProfile, bhPostaCall, new Date('2026-09-17'))
    expect(verdict.status).toBe('eligible')
    expect(verdict.recommendedProgram).toBe('SPORT')
    expect(verdict.callPoints).toEqual(expect.arrayContaining(['Oblast: SPORT']))
  })
  it('rejects a call restricted to companies', () => {
    const call: CallRequirements = { ...bhPostaCall, eligibilityConditions: [{ text: 'Samo privredna društva', category: 'legalStatus' }] }
    const verdict = matchEligibility(clubProfile, call, new Date('2026-09-17'))
    expect(verdict.status).toBe('not_eligible')
    expect(verdict.reasons[0]).toContain('ne privredno društvo')
  })
  it('rejects expired calls before domain matching', () => {
    const call: CallRequirements = { ...bhPostaCall, deadline: { value: '01.01.2020.', confidence: 'VERIFICIRAN' } }
    expect(matchEligibility(clubProfile, call, new Date('2026-09-17')).status).toBe('not_eligible')
  })
  it('accepts the sixteen-chapter LOD 2 template', () => expect(chapterTemplate).toHaveLength(16))
})
