import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, Footer, PageNumber, TextRun } from 'docx'
import ExcelJS from 'exceljs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Project, budgetAmount, chapterTemplate, documentKinds, DocumentKind, validateProject, projectStatus } from './proposal-model'

const money = (value: number) => `${value.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} KM`
const heading = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 220, after: 100 } })
const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold })] })] })

function projectBody(project: Project) {
  const activityRows = project.activities.map(activity => new TableRow({ children: [String(activity.no), activity.activity, activity.period, activity.result].map(value => cell(value)) }))
  const resultRows = project.results.map(item => new TableRow({ children: [item.result, item.indicator, item.verificationSource].map(value => cell(value)) }))
  const budgetRows = project.budget.map(line => new TableRow({ children: [line.description, line.unit, String(line.quantity), money(line.unitPrice), money(budgetAmount(line)), line.source].map(value => cell(value)) }))
  const complianceRows = project.callCompliance.map(item => new TableRow({ children: [item.callPoint, item.requirement, item.fulfillment].map(value => cell(value)) }))
  const riskRows = project.risks.map(item => new TableRow({ children: [item.risk, item.probability, item.mitigation].map(value => cell(value)) }))
  const table = (headers: string[], rows: TableRow[]) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: headers.map(value => cell(value, true)) }), ...rows] })
  const paragraph = (text: string) => new Paragraph({ text, spacing: { after: 100 } })
  return [
    heading(project.program.title), paragraph(`Oblast: ${project.program.field} · Trajanje: ${project.program.duration} · Lokacija: ${project.program.location}`),
    heading('1. O podnosiocu prijave'), paragraph(`${project.applicant.name.value}\nJIB: ${project.applicant.jib.value}\n${project.applicant.address.value}\n${project.applicant.contact.value}\nOdgovorna osoba: ${project.applicant.responsiblePerson.value}`),
    heading('2. Obrazloženje potrebe za projektom'), paragraph(project.program.need),
    heading('3. Ciljevi'), paragraph(`Opći cilj: ${project.program.generalGoal}`), ...project.program.specificGoals.map((goal, index) => paragraph(`Specifični cilj ${index + 1}: ${goal}`)),
    heading('4. Ciljna grupa i uključivanje'), paragraph(`${project.targetGroup.description} Broj direktnih korisnika: ${project.targetGroup.size}. Struktura: ${project.targetGroup.structure} Inkluzija: ${project.targetGroup.inclusion}`),
    heading('5. Mjesto, trajanje i faze provedbe'), paragraph(project.program.location), ...project.phases.map(phase => paragraph(`${phase.name} (${phase.period}): ${phase.content}`)),
    heading('6. Plan aktivnosti'), table(['Br.', 'Aktivnost', 'Period', 'Očekivani rezultat'], activityRows),
    heading('7. Program i sadržaj'), ...project.modules.map(module => paragraph(`Modul ${module.no} — ${module.title}: ${module.content}`)),
    heading('8. Metodologija'), paragraph(project.program.methodology),
    heading('9. Očekivani rezultati i indikatori'), table(['Rezultat', 'Indikator', 'Izvor provjere'], resultRows),
    heading('10. Održivost projekta'), paragraph(project.program.sustainability),
    heading('11. Rizici i mjere ublažavanja'), table(['Rizik', 'Vjerovatnoća', 'Mjera ublažavanja'], riskRows),
    heading('12. Praćenje provedbe i izvještavanje'), paragraph(project.program.monitoring),
    heading('13. Vidljivost i promocija donatora'), paragraph(project.program.visibility),
    heading('14. Specifikacija troškova'), table(['Opis', 'Jedinica', 'Količina', 'Jedinična cijena', 'Ukupno', 'Izvor'], budgetRows),
    heading('15. Usklađenost sa Javnim oglasom'), table(['Tačka', 'Zahtjev', 'Način ispunjenja'], complianceRows),
    heading('16. Izjave i prateća dokumentacija'), ...project.statements.map((statement, index) => paragraph(`${index + 1}. ${statement}`)), ...project.documentation.map(item => paragraph(`${item.name} (${item.callPoint}) — ${item.note}`)),
  ]
}

export async function generateDocx(project: Project, kind: DocumentKind): Promise<Buffer> {
  const title = documentKinds.find(item => item.kind === kind)?.label ?? 'Projektni dokument'
  const children = kind === 'proposal' ? projectBody(project) : [
    heading(title),
    new Paragraph({ text: `KVS „S.C.U.B.A.“ Sarajevo · ${project.program.title}`, spacing: { after: 180 } }),
    ...(kind === 'letter' ? [
      new Paragraph({ text: 'Poštovani,' }),
      new Paragraph({ text: `Klub vodenih sportova „S.C.U.B.A.“ Sarajevo podnosi projektnu prijavu „${project.program.title}“ u oblasti ${project.program.field}. Projekt se provodi na lokaciji ${project.program.location}, u trajanju ${project.program.duration}, sa ukupnim budžetom od ${money(project.program.totalBudget)}.` }),
      new Paragraph({ text: `Od donatora se traži ${money(project.program.requestedFromDonor)}. Projektna intervencija adresira potrebu: ${project.program.need}` }),
      new Paragraph({ text: 'S poštovanjem,\nKVS „S.C.U.B.A.“ Sarajevo' }),
    ] : kind === 'application' ? [
      heading('Podaci o aplikantu'), new Paragraph({ text: `${project.applicant.name.value}\nJIB: ${project.applicant.jib.value}\n${project.applicant.address.value}\n${project.applicant.contact.value}` }),
      heading('Osnovni podaci o projektu'), new Paragraph({ text: `Naziv: ${project.program.title}\nOblast: ${project.program.field}\nTrajanje: ${project.program.duration}\nLokacija: ${project.program.location}\nTraženi iznos: ${money(project.program.requestedFromDonor)}` }),
      heading('Sažetak'), new Paragraph({ text: `${project.program.need}\n\n${project.program.generalGoal}` }),
    ] : kind === 'statements' ? [heading('Izjave podnosioca'), ...project.statements.map((statement, index) => new Paragraph({ text: `${index + 1}. ${statement}` }))] : [heading('Lista dokumentacije'), ...project.documentation.map(item => new Paragraph({ text: `${item.name}\nTačka poziva: ${item.callPoint}\nNapomena: ${item.note}`, spacing: { after: 140 } }))]
  )]
  const doc = new Document({ sections: [{ properties: {}, footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun('KVS „S.C.U.B.A.“ Sarajevo · '), new TextRun({ children: [PageNumber.CURRENT] })] })] }) }, children }] })
  return Buffer.from(await Packer.toBuffer(doc))
}

export async function generateBudgetXlsx(project: Project): Promise<Buffer> { const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Budžet'); sheet.columns = [{ header: 'Stavka', key: 'description', width: 48 }, { header: 'Jedinica', key: 'unit', width: 16 }, { header: 'Količina', key: 'quantity', width: 12 }, { header: 'Jedinična cijena', key: 'unitPrice', width: 18 }, { header: 'Izvor', key: 'source', width: 16 }, { header: 'Ukupno', key: 'total', width: 18 }]; sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E5966' } }; project.budget.forEach((line, index) => { const row = sheet.addRow({ description: line.description, unit: line.unit, quantity: line.quantity, unitPrice: line.unitPrice, source: line.source }); row.getCell('total').value = { formula: `C${index + 2}*D${index + 2}` }; }); const totalRow = sheet.addRow({ description: 'UKUPNO' }); totalRow.getCell('total').value = { formula: `SUM(F2:F${project.budget.length + 1})` }; totalRow.font = { bold: true }; sheet.addRow({ description: 'Kontrolna ćelija (mora biti 0,00)', total: { formula: `F${project.budget.length + 2}-${project.program.totalBudget}` } }); return Buffer.from(await workbook.xlsx.writeBuffer()) }

export async function generatePdf(project: Project, kind: DocumentKind): Promise<Buffer> { const pdf = await PDFDocument.create(); const page = pdf.addPage([595, 842]); const font = await pdf.embedFont(StandardFonts.Helvetica); page.drawText(documentKinds.find(item => item.kind === kind)?.label ?? 'Dokument', { x: 48, y: 790, size: 20, font, color: rgb(0.05, 0.35, 0.4) }); page.drawText(project.program.title, { x: 48, y: 755, size: 11, font, maxWidth: 500 }); page.drawText(`Traženi iznos: ${money(project.program.requestedFromDonor)}`, { x: 48, y: 720, size: 11, font }); page.drawText('Ovaj PDF je generisan iz validiranog strukturiranog modela podataka.', { x: 48, y: 660, size: 10, font }); return Buffer.from(await pdf.save()) }

export async function generatePackage(project: Project) {
  const validation = validateProject(project)
  const status = projectStatus(project)
  const files = await Promise.all(documentKinds.map(async ({ kind, label }) => {
    const isBudget = kind === 'budget'
    const extension = isBudget ? 'xlsx' : 'docx'
    const mime = isBudget
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    const data = isBudget ? await generateBudgetXlsx(project) : await generateDocx(project, kind)
    const preview = await generatePdf(project, kind)
    return {
      name: `${kind}.${extension}`,
      label,
      mime,
      data: data.toString('base64'),
      preview: preview.toString('base64'),
    }
  }))
  return { status, validation, files }
}
