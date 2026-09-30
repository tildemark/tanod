'use server'

import { prisma } from '@/lib/db'
import { piaSchema, type PiaFormData } from '@/lib/schemas'
import { revalidatePath } from 'next/cache'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const getPiaClient = () => (prisma as any).piaAssessment as
  | {
      create: typeof prisma.process.create
      update: typeof prisma.process.update
      findMany: typeof prisma.process.findMany
      findUnique: typeof prisma.process.findUnique
    }
  | undefined

export async function createPiaAssessment(data: PiaFormData) {
  try {
    const piaClient = getPiaClient()
    if (!piaClient) {
      return {
        success: false,
        error: 'PIA model not available. Run prisma generate and migrate the database.',
      }
    }

    const validated = piaSchema.parse(data)

    const pia = await piaClient.create({
      data: {
        orgId: validated.orgId,
        title: validated.title,
        description: validated.description || null,
        owner: validated.owner || null,
        status: validated.status,
        answers: validated.answers,
      },
      include: {
        org: true,
      },
    })

    revalidatePath('/governance/pia')

    return { success: true, data: pia }
  } catch (error) {
    console.error('Error creating PIA:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create PIA',
    }
  }
}

export async function updatePiaAssessment(id: string, data: Partial<PiaFormData>) {
  try {
    const piaClient = getPiaClient()
    if (!piaClient) {
      return {
        success: false,
        error: 'PIA model not available. Run prisma generate and migrate the database.',
      }
    }

    const pia = await piaClient.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description ?? null,
        owner: data.owner ?? null,
        status: data.status,
        answers: data.answers,
      },
      include: {
        org: true,
      },
    })

    revalidatePath('/governance/pia')
    revalidatePath(`/governance/pia/${id}`)

    return { success: true, data: pia }
  } catch (error) {
    console.error('Error updating PIA:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update PIA',
    }
  }
}

export async function getPiaAssessmentsByOrg(orgId: string) {
  try {
    const piaClient = getPiaClient()
    if (!piaClient) {
      return {
        success: false,
        error: 'PIA model not available. Run prisma generate and migrate the database.',
        data: [],
      }
    }

    const items = await piaClient.findMany({
      where: { orgId },
      orderBy: { updatedAt: 'desc' },
    })

    return { success: true, data: items }
  } catch (error) {
    console.error('Error fetching PIAs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch PIAs',
      data: [],
    }
  }
}

export async function getPiaAssessmentById(id: string) {
  try {
    const piaClient = getPiaClient()
    if (!piaClient) {
      return {
        success: false,
        error: 'PIA model not available. Run prisma generate and migrate the database.',
      }
    }

    const pia = await piaClient.findUnique({
      where: { id },
      include: {
        org: true,
      },
    })

    if (!pia) {
      return { success: false, error: 'PIA not found' }
    }

    return { success: true, data: pia }
  } catch (error) {
    console.error('Error fetching PIA:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch PIA',
    }
  }
}

export async function generatePiaReport(id: string) {
  try {
    const pia = await prisma.piaAssessment.findUnique({
      where: { id },
      include: { org: true },
    })

    if (!pia) {
      return { success: false, error: 'PIA not found' }
    }

    const answers = (pia.answers || {}) as Record<string, any>
    const riskRegister = (() => {
      try {
        return JSON.parse(answers.risk_register || '[]') as Array<Record<string, string>>
      } catch {
        return []
      }
    })()

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const pageSize: [number, number] = [595.28, 841.89]
    const margin = 48
    const lineHeight = 14

    let page = pdfDoc.addPage(pageSize)
    let y = page.getHeight() - margin

    const ensureSpace = (neededLines: number) => {
      if (y - neededLines * lineHeight < margin) {
        page = pdfDoc.addPage(pageSize)
        y = page.getHeight() - margin
      }
    }

    const drawText = (text: string, options?: { size?: number; bold?: boolean; x?: number }) => {
      const size = options?.size ?? 11
      const font = options?.bold ? fontBold : fontRegular
      const x = options?.x ?? margin
      ensureSpace(1)
      page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) })
      y -= lineHeight
    }

    const wrapText = (text: string, maxWidth: number, font = fontRegular, size = 11) => {
      const words = text.split(' ')
      const lines: string[] = []
      let currentLine = ''
      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const width = font.widthOfTextAtSize(testLine, size)
        if (width <= maxWidth) {
          currentLine = testLine
        } else {
          if (currentLine) lines.push(currentLine)
          currentLine = word
        }
      })
      if (currentLine) lines.push(currentLine)
      return lines
    }

    const drawLabelValue = (label: string, value: string) => {
      const labelWidth = 130
      const valueX = margin + labelWidth
      const maxWidth = page.getWidth() - margin - valueX
      const lines = wrapText(value, maxWidth)
      drawText(label, { bold: true })
      lines.forEach((line, index) => {
        if (index === 0) {
          drawText(line, { x: valueX })
        } else {
          drawText(line, { x: valueX })
        }
      })
    }

    const formatAnswer = (value: any) => {
      if (Array.isArray(value)) return value.join(', ')
      if (!value) return 'N/A'
      return String(value)
    }

    drawText('Privacy Impact Assessment (PIA) Report', { size: 18, bold: true })
    drawText(`Generated: ${new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date())}`)
    y -= lineHeight / 2

    drawText('Section 1: System / Process Overview', { size: 13, bold: true })
    drawLabelValue('Name of DPS:', pia.title)
    drawLabelValue('Date of Assessment:', new Date(pia.createdAt).toLocaleDateString('en-PH'))
    drawLabelValue('Assessed By (DPO):', pia.org.dpoName || 'N/A')
    drawLabelValue('System Owner:', pia.owner || 'N/A')
    drawLabelValue('Brief Description:', pia.description || 'N/A')
    y -= lineHeight / 2

    drawText('Section 2: Data Processing Details', { size: 13, bold: true })
    drawLabelValue('Personal data collected:', formatAnswer(answers.personal_data))
    drawLabelValue('Sensitive data collected:', formatAnswer(answers.sensitive_data))
    drawLabelValue('Purpose of processing:', formatAnswer(answers.purpose))
    drawLabelValue('Lawful basis:', formatAnswer(answers.lawful_basis))
    y -= lineHeight / 2

    drawText('Section 3: Data Lifecycle and Sharing', { size: 13, bold: true })
    drawLabelValue('Data collection method:', formatAnswer(answers.collection_method))
    drawLabelValue('Storage and security:', formatAnswer(answers.storage_security))
    drawLabelValue('Internal access:', formatAnswer(answers.internal_access))
    drawLabelValue('External sharing:', formatAnswer(answers.recipients))
    drawLabelValue('International transfers:', formatAnswer(answers.cross_border))
    drawLabelValue('Retention period:', formatAnswer(answers.retention))
    drawLabelValue('Retention justification:', formatAnswer(answers.retention_reason))
    drawLabelValue('Disposal method:', formatAnswer(answers.disposal_method))
    y -= lineHeight / 2

    drawText('Section 4: Privacy Risk Assessment', { size: 13, bold: true })
    if (riskRegister.length === 0) {
      drawText('No risks recorded.')
    } else {
      riskRegister.forEach((risk, index) => {
        drawText(`${index + 1}. ${risk.title}`, { bold: true })
        drawLabelValue('Context:', risk.context || 'N/A')
        drawLabelValue('Likelihood:', risk.likelihood || 'N/A')
        drawLabelValue('Impact:', risk.impact || 'N/A')
        drawLabelValue('Overall risk:', risk.overall || 'N/A')
        y -= lineHeight / 2
      })
    }

    drawText('Section 5: Risk Mitigation and Control Measures', { size: 13, bold: true })
    if (riskRegister.length === 0) {
      drawText('No mitigation measures recorded.')
    } else {
      riskRegister.forEach((risk, index) => {
        drawText(`${index + 1}. ${risk.title}`, { bold: true })
        drawLabelValue('Existing controls:', risk.existingControls || 'N/A')
        drawLabelValue('Recommended measures:', risk.recommendedControls || 'N/A')
        drawLabelValue('Responsibility:', risk.responsibility || 'N/A')
        drawLabelValue('Target date:', risk.targetDate || 'N/A')
        y -= lineHeight / 2
      })
    }

    drawText('Section 6: Conclusion and Sign-off', { size: 13, bold: true })
    drawLabelValue('Summary of findings:', formatAnswer(answers.summary_findings))
    drawLabelValue('Recommendation:', formatAnswer(answers.recommendation))
    drawLabelValue('DPO Signature:', formatAnswer(answers.dpo_signature))

    const pdfBytes = await pdfDoc.save()
    const base64 = Buffer.from(pdfBytes).toString('base64')
    const fileName = `pia-report-${pia.id.slice(0, 8)}.pdf`

    return { success: true, fileName, mimeType: 'application/pdf', base64 }
  } catch (error) {
    console.error('Error generating PIA report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PIA report',
    }
  }
}
