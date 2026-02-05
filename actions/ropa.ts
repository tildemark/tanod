'use server'

import { prisma } from '@/lib/db'
import { processSchema, type ProcessFormData } from '@/lib/schemas'
import { assessProcessRisk } from '@/lib/riskCalculator'
import { revalidatePath } from 'next/cache'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatTrackingCode } from '@/lib/ropa'

export async function createProcess(data: ProcessFormData) {
  try {
    // Validate with Zod
    const validatedData = processSchema.parse(data)

    // Calculate risk automatically
    const riskAssessment = await assessProcessRisk(
      validatedData.title,
      validatedData.description || null,
      validatedData.dataCategories,
      validatedData.dataSubjects,
      validatedData.retentionPeriod,
      validatedData.recipients
    )

    // Create in database with calculated risk
    const process = await prisma.process.create({
      data: {
        ...validatedData,
        riskLevel: riskAssessment.riskLevel,
      },
      include: {
        department: {
          include: {
            org: true,
          },
        },
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/ropa')

    return {
      success: true,
      data: process,
      riskAssessment,
    }
  } catch (error) {
    console.error('Error creating process:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create process',
    }
  }
}

export async function getProcessesByOrg(orgId: string) {
  try {
    const processes = await prisma.process.findMany({
      where: {
        department: {
          orgId,
        },
      },
      include: {
        department: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return {
      success: true,
      data: processes,
    }
  } catch (error) {
    console.error('Error fetching processes:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch processes',
      data: [],
    }
  }
}

export async function getProcessById(id: string) {
  try {
    const process = await prisma.process.findUnique({
      where: { id },
      include: {
        department: {
          include: {
            org: true,
          },
        },
      },
    })

    if (!process) {
      return {
        success: false,
        error: 'Process not found',
      }
    }

    return {
      success: true,
      data: process,
    }
  } catch (error) {
    console.error('Error fetching process:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch process',
    }
  }
}

export async function updateProcess(id: string, data: Partial<ProcessFormData>) {
  try {
    let updateData = data

    // If data fields changed, recalculate risk
    if (
      data.title ||
      data.dataCategories ||
      data.dataSubjects ||
      data.retentionPeriod ||
      data.recipients
    ) {
      // Get current process to fill in missing fields
      const currentProcess = await prisma.process.findUnique({
        where: { id },
      })

      if (currentProcess) {
        const riskAssessment = await assessProcessRisk(
          data.title || currentProcess.title,
          data.description !== undefined ? data.description : currentProcess.description,
          data.dataCategories || currentProcess.dataCategories,
          data.dataSubjects || currentProcess.dataSubjects,
          data.retentionPeriod || currentProcess.retentionPeriod,
          data.recipients || currentProcess.recipients
        )

        updateData = {
          ...data,
          riskLevel: riskAssessment.riskLevel,
        }
      }
    }

    const process = await prisma.process.update({
      where: { id },
      data: updateData,
      include: {
        department: {
          include: {
            org: true,
          },
        },
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/ropa')

    return {
      success: true,
      data: process,
    }
  } catch (error) {
    console.error('Error updating process:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update process',
    }
  }
}

export async function deleteProcess(id: string) {
  try {
    await prisma.process.delete({
      where: { id },
    })

    revalidatePath('/dashboard')
    revalidatePath('/ropa')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error deleting process:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete process',
    }
  }
}

export async function getDepartmentsByOrg(orgId: string) {
  try {
    const departments = await prisma.department.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
    })

    return {
      success: true,
      data: departments,
    }
  } catch (error) {
    console.error('Error fetching departments:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch departments',
      data: [],
    }
  }
}

export async function getOrganization(orgId: string) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        departments: true,
      },
    })

    if (!org) {
      return {
        success: false,
        error: 'Organization not found',
      }
    }

    return {
      success: true,
      data: org,
    }
  } catch (error) {
    console.error('Error fetching organization:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch organization',
    }
  }
}

export async function generateRopaReport(orgId: string) {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    })

    if (!organization) {
      return {
        success: false,
        error: 'Organization not found',
      }
    }

    const processes = await prisma.process.findMany({
      where: {
        department: {
          orgId,
        },
        status: 'APPROVED',
      },
      include: {
        department: {
          include: {
            org: true,
          },
        },
      },
    })

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pageSize: [number, number] = [595.28, 841.89]
    const margin = 48
    const lineHeight = 14

    let page = pdfDoc.addPage(pageSize)
    let y = page.getHeight() - margin

    const formatDate = (date: Date) =>
      new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(date)

    const ensureSpace = (neededLines: number) => {
      if (y - neededLines * lineHeight < margin) {
        page = pdfDoc.addPage(pageSize)
        y = page.getHeight() - margin
      }
    }

    const drawText = (text: string, options?: { size?: number; bold?: boolean; color?: { r: number; g: number; b: number } }) => {
      const size = options?.size ?? 11
      const font = options?.bold ? fontBold : fontRegular
      const color = options?.color ?? { r: 0, g: 0, b: 0 }

      ensureSpace(1)
      page.drawText(text, {
        x: margin,
        y,
        size,
        font,
        color: rgb(color.r, color.g, color.b),
      })
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
          if (currentLine) {
            lines.push(currentLine)
          }
          currentLine = word
        }
      })

      if (currentLine) {
        lines.push(currentLine)
      }

      return lines
    }

    const drawParagraph = (text: string, options?: { size?: number; bold?: boolean }) => {
      const size = options?.size ?? 11
      const font = options?.bold ? fontBold : fontRegular
      const maxWidth = page.getWidth() - margin * 2
      const lines = wrapText(text, maxWidth, font, size)

      lines.forEach((line) => {
        ensureSpace(1)
        page.drawText(line, {
          x: margin,
          y,
          size,
          font,
          color: rgb(0, 0, 0),
        })
        y -= lineHeight
      })
    }

    const drawSectionTitle = (title: string) => {
      y -= lineHeight / 2
      drawText(title, { size: 13, bold: true })
      y -= 2
    }

    drawText('Record of Processing Activities (ROPA)', { size: 18, bold: true })
    drawText('NPC Compliance Report', { size: 12, bold: true, color: { r: 0.1, g: 0.3, b: 0.6 } })
    drawText(`Generated: ${formatDate(new Date())}`)
    y -= lineHeight / 2

    drawSectionTitle('Organization Details')
    drawParagraph(`Organization: ${organization.name}`)
    if (organization.address || organization.city || organization.country) {
      drawParagraph(`Address: ${[organization.address, organization.city, organization.country].filter(Boolean).join(', ')}`)
    }
    if (organization.email || organization.phone) {
      drawParagraph(`Contact: ${[organization.email, organization.phone].filter(Boolean).join(' | ')}`)
    }
    if (organization.dpoName || organization.dpoEmail) {
      drawParagraph(`Data Protection Officer: ${[organization.dpoName, organization.dpoEmail].filter(Boolean).join(' | ')}`)
    }

    drawSectionTitle('Compliance Summary')
    drawParagraph(
      `This report consolidates ${processes.length} approved processing activities. Each entry includes the NPC-required fields: data subjects, data categories, lawful basis, recipients, and retention period.`
    )
    drawParagraph('Prepared in accordance with the Philippine Data Privacy Act of 2012 and NPC ROPA guidance.')

    drawSectionTitle('Approved Processing Activities')

    if (processes.length === 0) {
      drawParagraph('No approved processing activities found for this organization.')
    } else {
      processes.forEach((process, index) => {
        drawParagraph(`${index + 1}. ${process.title}`, { bold: true })
        drawParagraph(`Department: ${process.department.name}`)
        drawParagraph(`Description: ${process.description || 'N/A'}`)
        drawParagraph(`Lawful Basis: ${process.lawfulBasis}`)
        drawParagraph(`Data Subjects: ${process.dataSubjects.join(', ') || 'N/A'}`)
        drawParagraph(`Data Categories: ${process.dataCategories.join(', ') || 'N/A'}`)
        drawParagraph(`Recipients: ${process.recipients.join(', ') || 'N/A'}`)
        drawParagraph(`Retention Period: ${process.retentionPeriod}`)
        drawParagraph(`Risk Level: ${process.riskLevel || 'Not assessed'}`)
        drawParagraph(`Status: ${process.status}`)
        y -= lineHeight / 2
      })
    }

    drawSectionTitle('Certification')
    drawParagraph('I certify that the information contained in this report is accurate and up to date as of the generation date.')

    const pdfBytes = await pdfDoc.save()
    const base64 = Buffer.from(pdfBytes).toString('base64')
    const fileName = `ropa-report-${organization.slug}-${new Date().toISOString().split('T')[0]}.pdf`

    return {
      success: true,
      fileName,
      mimeType: 'application/pdf',
      base64,
      count: processes.length,
    }
  } catch (error) {
    console.error('Error generating report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report',
    }
  }
}

export async function generateRopaApprovalForm(processId: string) {
  try {
    const process = await prisma.process.findUnique({
      where: { id: processId },
      include: {
        department: {
          include: {
            org: true,
          },
        },
      },
    })

    if (!process) {
      return {
        success: false,
        error: 'Process not found',
      }
    }

    const trackingCode = formatTrackingCode(process.id, process.createdAt)

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pageSize: [number, number] = [595.28, 841.89]
    const margin = 48
    const lineHeight = 14

    const page = pdfDoc.addPage(pageSize)
    let y = page.getHeight() - margin
    const labelWidth = 120

    const drawText = (text: string, options?: { size?: number; bold?: boolean; x?: number }) => {
      const size = options?.size ?? 11
      const font = options?.bold ? fontBold : fontRegular
      const x = options?.x ?? margin
      page.drawText(text, {
        x,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      })
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
          if (currentLine) {
            lines.push(currentLine)
          }
          currentLine = word
        }
      })

      if (currentLine) {
        lines.push(currentLine)
      }

      return lines
    }

    const drawParagraph = (text: string) => {
      const maxWidth = page.getWidth() - margin * 2
      const lines = wrapText(text, maxWidth)
      lines.forEach((line) => {
        drawText(line)
        y -= lineHeight
      })
    }

    const drawLabelValue = (label: string, value: string) => {
      const valueX = margin + labelWidth
      const maxWidth = page.getWidth() - margin - valueX
      const lines = wrapText(value, maxWidth)

      drawText(label, { bold: true })

      lines.forEach((line, index) => {
        if (index === 0) {
          drawText(line, { x: valueX })
        } else {
          y -= lineHeight
          drawText(line, { x: valueX })
        }
      })

      y -= lineHeight
    }

    drawText('ROPA Review & Approval Form', { size: 18, bold: true })
    y -= lineHeight
    drawText(`Tracking Code: ${trackingCode}`, { size: 12, bold: true })
    y -= lineHeight
    drawText(`Generated: ${new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date())}`)
    y -= lineHeight

    drawText('Purpose & Action', { size: 13, bold: true })
    y -= lineHeight
    drawParagraph(
      'This document records a data processing activity under the Philippine Data Privacy Act. Reviewers confirm the lawful basis, scope, recipients, and retention period. Approval authorizes the activity to proceed and be recorded as an official ROPA entry.'
    )
    y -= lineHeight / 2

    drawText('Process Details', { size: 13, bold: true })
    y -= lineHeight
    drawLabelValue('Title:', process.title)
    drawLabelValue('Department:', process.department.name)
    drawLabelValue('Organization:', process.department.org.name)
    drawLabelValue('Description:', process.description || 'N/A')
    drawLabelValue('Lawful Basis:', process.lawfulBasis)
    drawLabelValue('Data Subjects:', process.dataSubjects.join(', ') || 'N/A')
    drawLabelValue('Data Categories:', process.dataCategories.join(', ') || 'N/A')
    drawLabelValue('Recipients:', process.recipients.join(', ') || 'N/A')
    drawLabelValue('Retention Period:', process.retentionPeriod)
    drawLabelValue('Risk Level:', process.riskLevel || 'Not assessed')
    drawLabelValue('Current Status:', process.status)

    y -= lineHeight / 2
    drawText('Management Review', { size: 13, bold: true })
    y -= lineHeight
    drawLabelValue('Reviewed by:', '_______________________________')
    drawLabelValue('Title/Role:', '_______________________________')
    drawLabelValue('Signature:', '_______________________________')
    drawLabelValue('Date:', '_______________________________')

    y -= lineHeight / 2
    drawText('Final Approval', { size: 13, bold: true })
    y -= lineHeight
    drawLabelValue('Approved by:', '_______________________________')
    drawLabelValue('Title/Role:', '_______________________________')
    drawLabelValue('Signature:', '_______________________________')
    drawLabelValue('Date:', '_______________________________')

    y -= lineHeight / 2
    drawText('Notes:', { bold: true })
    y -= lineHeight
    drawText('______________________________________________________________')
    y -= lineHeight
    drawText('______________________________________________________________')

    const pdfBytes = await pdfDoc.save()
    const base64 = Buffer.from(pdfBytes).toString('base64')
    const fileName = `ropa-review-approval-${trackingCode}.pdf`

    return {
      success: true,
      fileName,
      mimeType: 'application/pdf',
      base64,
      trackingCode,
    }
  } catch (error) {
    console.error('Error generating approval form:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate approval form',
    }
  }
}
