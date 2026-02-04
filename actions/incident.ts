'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface CreateIncidentData {
  title: string
  occurrenceDate: string
  severity: string
  impactedIndividuals?: string
  systemsAffected?: string
  summary?: string
}

export async function createIncident(data: CreateIncidentData) {
  try {
    const incident = await prisma.incident.create({
      data: {
        title: data.title,
        occurrenceDate: new Date(data.occurrenceDate),
        severity: data.severity,
        impactedIndividuals: data.impactedIndividuals
          ? parseInt(data.impactedIndividuals)
          : null,
        systemsAffected: data.systemsAffected || null,
        summary: data.summary || null,
        orgId: 'default-org', // Using default org from seed
      },
    })

    revalidatePath('/breach')

    return {
      success: true,
      data: incident,
    }
  } catch (error) {
    console.error('Error creating incident:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create incident',
    }
  }
}

export async function getIncidentsByOrg(orgId: string) {
  try {
    const incidents = await prisma.incident.findMany({
      where: {
        orgId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      success: true,
      data: incidents,
    }
  } catch (error) {
    console.error('Error fetching incidents:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch incidents',
      data: [],
    }
  }
}

export async function getIncidentById(id: string) {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        org: true,
      },
    })

    if (!incident) {
      return {
        success: false,
        error: 'Incident not found',
      }
    }

    return {
      success: true,
      data: incident,
    }
  } catch (error) {
    console.error('Error fetching incident:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch incident',
    }
  }
}

export async function updateIncident(
  id: string,
  data: {
    status?: string
    assignedTo?: string
    npcNotified?: boolean
    npcNotificationDate?: Date
    resolutionNotes?: string
    resolvedAt?: Date
  }
) {
  try {
    const incident = await prisma.incident.update({
      where: { id },
      data,
    })

    revalidatePath('/breach')

    return {
      success: true,
      data: incident,
    }
  } catch (error) {
    console.error('Error updating incident:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update incident',
    }
  }
}

export async function deleteIncident(id: string) {
  try {
    await prisma.incident.delete({
      where: { id },
    })

    revalidatePath('/breach')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error deleting incident:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete incident',
    }
  }
}
