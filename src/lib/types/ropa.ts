import { z } from 'zod';

export interface Process {
  id: string;
  dept_id: string;
  department_name?: string;
  title: string;
  description?: string | null;
  data_subjects: string[];
  data_categories: string[];
  lawful_basis: string[];
  recipients: string[];
  retention_period: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED';
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const processSchema = z.object({
  dept_id: z.string().min(1, 'Department is required'),
  title: z.string().min(3, 'Process title must be at least 3 characters'),
  description: z.string().optional(),
  data_subjects: z.array(z.string()).min(1, 'At least one Data Subject category is required'),
  data_categories: z.array(z.string()).min(1, 'At least one Personal Data Category is required'),
  lawful_basis: z.array(z.string()).min(1, 'At least one Lawful Basis under Sec. 12/13 is required'),
  recipients: z.array(z.string()).min(1, 'At least one Recipient or Transfer category is required'),
  retention_period: z.string().min(1, 'Retention period and disposal schedule is required'),
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED']).default('DRAFT'),
});

export type ProcessFormData = z.infer<typeof processSchema>;

// Predefined Statutory Options under RA 10173 & NPC Issuances
export const DATA_SUBJECTS = [
  'Employees & Staff',
  'Job Applicants & Candidates',
  'Customers & Consumers',
  'Patients & Medical Clients',
  'Students & Minors',
  'Consultants & Independent Contractors',
  'Vendor & Supplier Personnel',
  'Premises Visitors & Guests',
  'Emergency Contacts & Dependents',
  'Shareholders & Board Members'
];

export const DATA_CATEGORIES = [
  'General Contact Data (Name, Phone, Email)',
  'Government-Issued IDs (TIN, SSS, Passport, UMID)',
  'Financial & Payment Records (Bank, Salary, Tax)',
  'Biometric Data (Fingerprints, Facial Recognition)',
  'Health & Medical Records (Diagnosis, Vitals)',
  'Employment & HR History',
  'Geographic & Real-Time Location Data',
  'CCTV & Video Surveillance Footage',
  'Digital Identifiers (IP, Device, Cookies)',
  'Academic & Educational Records'
];

export const LAWFUL_BASIS = [
  'Consent of Data Subject (Sec. 12.a / 13.a)',
  'Contract Performance / Fulfillment (Sec. 12.b)',
  'Legal Obligation under PH Law (Sec. 12.c / 13.b)',
  'Protection of Vital Interests / Emergency (Sec. 12.d / 13.c)',
  'Public Order / Public Authority Task (Sec. 12.e / 13.d)',
  'Legitimate Interests of the PIC (Sec. 12.f)',
  'Medical Treatment & Healthcare Operations (Sec. 13.e)',
  'Legal Proceedings / Rights Defense (Sec. 13.f)'
];

export const RECIPIENTS = [
  'Internal Operating Department Only',
  'Bureau of Internal Revenue (BIR)',
  'Social Security System (SSS) / GSIS',
  'PhilHealth & Pag-IBIG Fund',
  'Designated Commercial Banks & Payroll Processors',
  'Third-Party Personal Information Processor (PIP / Vendor)',
  'Accredited Cloud & IT Infrastructure Provider',
  'Independent External Auditors',
  'Philippine Law Enforcement / Court Order',
  'Health Maintenance Organizations (HMO / Insurers)'
];
