import { describe, expect, it } from 'vitest'
import { createDemoProject, validateBudgetSums, validateCallCompliance, validateNoUnresolvedPlaceholders, validateRequiredFields, validateSectionLength } from './proposal-model'

describe('ECO SCUBA validators', () => {
  it('accepts the golden budget totals', () => expect(validateBudgetSums(createDemoProject())[0].ok).toBe(true))
  it('rejects a changed donor amount', () => expect(validateBudgetSums(createDemoProject({ program: { ...createDemoProject().program, requestedFromDonor: 1 } }))[0].ok).toBe(false))
  it('rejects missing required applicant data', () => expect(validateRequiredFields(createDemoProject())[0].ok).toBe(false))
  it('accepts mapped call requirements', () => expect(validateCallCompliance(createDemoProject())[0].ok).toBe(true))
  it('rejects unresolved placeholders', () => expect(validateNoUnresolvedPlaceholders(createDemoProject())[0].ok).toBe(false))
  it('accepts complete section lengths', () => expect(validateSectionLength(createDemoProject())[0].ok).toBe(true))
})
