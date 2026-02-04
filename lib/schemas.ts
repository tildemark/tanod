import { z } from 'zod'

// Process Creation Schema
export const processSchema = z.object({
  deptId: z.string().min(1, 'Department is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  dataSubjects: z.array(z.string()).min(1, 'At least one data subject is required'),
  dataCategories: z.array(z.string()).min(1, 'At least one data category is required'),
  lawfulBasis: z.string().min(1, 'Lawful basis is required'),
  recipients: z.array(z.string()).min(1, 'At least one recipient is required'),
  retentionPeriod: z.string().min(1, 'Retention period is required'),
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED']).default('DRAFT'),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable().optional(),
})

export type ProcessFormData = z.infer<typeof processSchema>

// Department Schema
export const departmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  orgId: z.string(),
})

export type DepartmentFormData = z.infer<typeof departmentSchema>

// Organization Schema (Admin)
export const organizationAdminSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  logo: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  dpoName: z.string().optional(),
  dpoEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  industry: z.string().optional(),
  employeeCount: z.string().transform(v => v ? parseInt(v) : undefined).optional(),
  description: z.string().optional(),
  npcNotificationEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  breachNotificationHours: z.string().transform(v => v ? parseInt(v) : undefined).optional(),
})

export type OrganizationAdminFormData = z.infer<typeof organizationAdminSchema>

// Department Schema (Admin)
export const departmentAdminSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  description: z.string().optional(),
  orgId: z.string(),
})

export type DepartmentAdminFormData = z.infer<typeof departmentAdminSchema>

// Backward compatibility - keep old schemas
export const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  dpoName: z.string().optional(),
  industry: z.string().optional(),
})

export type OrganizationFormData = z.infer<typeof organizationSchema>

// Predefined options for dropdowns
export const DATA_SUBJECTS = [
  'Employees',
  'Customers',
  'Consultants',
  'Contractors',
  'Visitors',
  'Leads',
  'Prospects',
  'Dependents',
  'Minors',
  'Patients',
  'Students',
]

export const DATA_CATEGORIES = [
  'Personal Information',
  'Financial Information',
  'Employment Details',
  'Contact Information',
  'Biometric Data',
  'Location Data',
  'Health Information',
  'Purchase History',
  'Browsing Behavior',
  'Government IDs',
  'Academic Records',
  'Video Footage',
]

export const LAWFUL_BASIS = [
  'Consent',
  'Legal Obligation',
  'Legitimate Interest',
  'Contract',
  'Vital Interest',
  'Public Task',
]

export const RECIPIENTS = [
  'Internal Staff',
  'Bank',
  'BIR',
  'SSS',
  'PhilHealth',
  'Pag-IBIG',
  'Email Service Provider',
  'Analytics Platform',
  'Security Agency',
  'Law Enforcement',
  'Third-Party Processor',
  'Cloud Provider',
  'Marketing Agency',
]
