'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// ============================================================================
// ORGANIZATION ACTIONS
// ============================================================================

export interface UpdateOrganizationInput {
  name: string
  slug: string
  logo?: string
  address?: string
  city?: string
  country?: string
  phone?: string
  email?: string
  website?: string
  dpoName?: string
  dpoEmail?: string
  industry?: string
  employeeCount?: number
  description?: string
}

export async function updateOrganization(orgId: string, data: UpdateOrganizationInput) {
  try {
    // Check if slug is unique (excluding current org)
    if (data.slug) {
      const existing = await prisma.organization.findFirst({
        where: {
          slug: data.slug,
          NOT: { id: orgId },
        },
      })
      if (existing) {
        return {
          success: false,
          error: 'Slug is already in use',
        }
      }
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        name: data.name,
        slug: data.slug,
        logo: data.logo,
        address: data.address,
        city: data.city,
        country: data.country,
        phone: data.phone,
        email: data.email,
        website: data.website,
        dpoName: data.dpoName,
        dpoEmail: data.dpoEmail,
        industry: data.industry,
        employeeCount: data.employeeCount,
        description: data.description,
      },
      include: {
        departments: true,
      },
    })

    revalidatePath('/admin')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: org,
    }
  } catch (error) {
    console.error('Error updating organization:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update organization',
    }
  }
}

export async function getOrganization(orgId?: string) {
  try {
    // If no orgId provided, fetch the first (default) organization
    const org = await prisma.organization.findFirst({
      where: orgId ? { id: orgId } : undefined,
      include: {
        departments: {
          orderBy: { createdAt: 'desc' },
        },
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

// ============================================================================
// DEPARTMENT ACTIONS
// ============================================================================

export interface CreateDepartmentInput {
  name: string
  description?: string
  orgId: string
}

export interface UpdateDepartmentInput {
  name: string
  description?: string
}

export async function createDepartment(data: CreateDepartmentInput) {
  try {
    const dept = await prisma.department.create({
      data: {
        name: data.name,
        description: data.description,
        orgId: data.orgId,
      },
    })

    revalidatePath('/admin/departments')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: dept,
    }
  } catch (error) {
    console.error('Error creating department:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create department',
    }
  }
}

export async function updateDepartment(deptId: string, data: UpdateDepartmentInput) {
  try {
    const dept = await prisma.department.update({
      where: { id: deptId },
      data: {
        name: data.name,
        description: data.description,
      },
    })

    revalidatePath('/admin/departments')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: dept,
    }
  } catch (error) {
    console.error('Error updating department:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update department',
    }
  }
}

export async function deleteDepartment(deptId: string) {
  try {
    // Check if department has any processes
    const processes = await prisma.process.count({
      where: { deptId },
    })

    if (processes > 0) {
      return {
        success: false,
        error: `Cannot delete department with ${processes} process(es). Delete processes first.`,
      }
    }

    await prisma.department.delete({
      where: { id: deptId },
    })

    revalidatePath('/admin/departments')
    revalidatePath('/dashboard')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error deleting department:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete department',
    }
  }
}

export async function getDepartmentsByOrg(orgId: string) {
  try {
    const departments = await prisma.department.findMany({
      where: { orgId },
      include: {
        _count: {
          select: { processes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
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
