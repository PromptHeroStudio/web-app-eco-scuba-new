import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { createDemoProject } from './proposal-model'
import { generateBudgetXlsx, generateDocx, generatePdf } from './document-generators'

describe('Node document generators', () => {
  it('creates a real DOCX with footer content', async () => {
    const buffer = await generateDocx(createDemoProject(), 'proposal')
    expect(buffer.subarray(0, 2).toString()).toBe('PK')
    expect(buffer.length).toBeGreaterThan(1000)
  })

  it('creates an XLSX with live budget formulas', async () => {
    const buffer = await generateBudgetXlsx(createDemoProject())
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Budžet')
    expect(sheet).toBeDefined()
    expect(sheet?.getCell('F2').value).toEqual({ formula: 'C2*D2' })
    expect(sheet?.getCell('F11').value).toEqual({ formula: 'SUM(F2:F10)' })
    expect(sheet?.getCell('F12').value).toEqual({ formula: 'F11-27000' })
  })

  it('creates a readable PDF preview', async () => {
    const buffer = await generatePdf(createDemoProject(), 'letter')
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-')
    expect(buffer.length).toBeGreaterThan(500)
  })
})
