'use server'

import { prisma } from '@/lib/db'
import { processSchema, type ProcessFormData } from '@/lib/schemas'
import { assessProcessRisk } from '@/lib/riskCalculator'
import { revalidatePath } from 'next/cache'

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

// Placeholder for future ROPA Report generation
export async function generateRopaReport(orgId: string) {
  try {
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

    // TODO: Generate NPC-compliant PDF
    // This will be implemented in Phase 2

    return {
      success: true,
      message: `Report generation started for ${processes.length} processes`,
      data: processes,
    }
  } catch (error) {
    console.error('Error generating report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report',
    }
  }
}
