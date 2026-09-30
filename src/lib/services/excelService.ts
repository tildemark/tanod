import * as XLSX from 'xlsx';
import type { Process, ProcessFormData } from '$lib/types/ropa';
import type { Department } from '$lib/types/organization';
import { DATA_SUBJECTS, DATA_CATEGORIES, LAWFUL_BASIS, RECIPIENTS } from '$lib/types/ropa';

export interface RopaExcelRow {
  'Department Name': string;
  'Process Title': string;
  'Description': string;
  'Data Subjects (comma separated)': string;
  'Personal Data Categories (comma separated)': string;
  'Lawful Basis (comma separated)': string;
  'Recipients / Processors (comma separated)': string;
  'Retention Period': string;
  'Status (DRAFT, REVIEW, APPROVED)': string;
}

/**
 * Generates and triggers download of a standardized Excel template for ROPA ingestion.
 * Includes a prefilled example row (Payroll) and a reference sheet of valid statutory categories.
 */
export function downloadRopaExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template data (1 sample row, ready to fill)
  const templateRows: RopaExcelRow[] = [
    {
      'Department Name': 'Human Resources',
      'Process Title': 'Monthly Payroll & Remittances',
      'Description': 'Processing of base salaries, overtime pay, and remittances to BIR, SSS, PhilHealth, Pag-IBIG.',
      'Data Subjects (comma separated)': 'Employees & Staff, Consultants & Independent Contractors',
      'Personal Data Categories (comma separated)': 'General Contact Data (Name, Phone, Email), Government-Issued IDs (TIN, SSS, Passport, UMID), Financial & Payment Records (Bank, Salary, Tax), Employment & HR History',
      'Lawful Basis (comma separated)': 'Contract Performance / Fulfillment (Sec. 12.b), Legal Obligation under PH Law (Sec. 12.c / 13.b)',
      'Recipients / Processors (comma separated)': 'Bureau of Internal Revenue (BIR), Social Security System (SSS) / GSIS, PhilHealth & Pag-IBIG Fund, Designated Commercial Banks & Payroll Processors',
      'Retention Period': '10 years following tax assessment per NIRC regulations',
      'Status (DRAFT, REVIEW, APPROVED)': 'APPROVED'
    }
  ];

  const wsTemplate = XLSX.utils.json_to_sheet(templateRows);

  // Set column widths for readability
  wsTemplate['!cols'] = [
    { wch: 22 }, // Department
    { wch: 32 }, // Title
    { wch: 45 }, // Description
    { wch: 40 }, // Data Subjects
    { wch: 45 }, // Categories
    { wch: 45 }, // Basis
    { wch: 45 }, // Recipients
    { wch: 35 }, // Retention
    { wch: 20 }  // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsTemplate, 'ROPA Ingestion Template');

  // Sheet 2: Reference Guide (Statutory NPC categories)
  const maxRows = Math.max(DATA_SUBJECTS.length, DATA_CATEGORIES.length, LAWFUL_BASIS.length, RECIPIENTS.length);
  const refRows = [];
  for (let i = 0; i < maxRows; i++) {
    refRows.push({
      'Standard Data Subjects': DATA_SUBJECTS[i] || '',
      'Personal Data Categories': DATA_CATEGORIES[i] || '',
      'Lawful Bases (RA 10173)': LAWFUL_BASIS[i] || '',
      'Statutory Recipients / Processors': RECIPIENTS[i] || ''
    });
  }
  const wsRef = XLSX.utils.json_to_sheet(refRows);
  wsRef['!cols'] = [{ wch: 36 }, { wch: 44 }, { wch: 50 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, wsRef, 'NPC Statutory Reference');

  // Trigger browser download
  XLSX.writeFile(wb, 'TANOD_ROPA_Import_Template.xlsx');
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV file into validated ProcessFormData records.
 */
export async function parseRopaExcelFile(
  file: File,
  departments: Department[]
): Promise<{ validProcesses: ProcessFormData[]; errors: string[]; deptMap: Record<string, string> }> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });

  // Use the first worksheet
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(ws);

  const validProcesses: ProcessFormData[] = [];
  const errors: string[] = [];

  // Create lookup for departments (case-insensitive name -> id)
  const deptLookup: Record<string, string> = {};
  for (const dept of departments) {
    deptLookup[dept.name.trim().toLowerCase()] = dept.id;
  }

  // Fallback department if none matched or left empty
  const defaultDeptId = departments[0]?.id ?? '';

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // Accounting for 1-based index and header row

    // Resolve Department
    const rawDept = String(row['Department Name'] || row['Department'] || '').trim();
    let resolvedDeptId = defaultDeptId;
    if (rawDept && deptLookup[rawDept.toLowerCase()]) {
      resolvedDeptId = deptLookup[rawDept.toLowerCase()];
    }

    const title = String(row['Process Title'] || row['Title'] || row['Process'] || '').trim();
    if (!title || title.length < 3) {
      errors.push(`Row ${rowNum}: Skipped — Process Title is missing or too short (min 3 chars).`);
      return;
    }

    const description = String(row['Description'] || row['Process Description'] || '').trim();

    // Comma-separated or line-separated list parsers
    const splitList = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(String);
      return String(val)
        .split(/[,;\n\r]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    };

    let data_subjects = splitList(row['Data Subjects (comma separated)'] || row['Data Subjects'] || row['Subjects']);
    if (data_subjects.length === 0) {
      data_subjects = ['Employees & Staff']; // Graceful default
    }

    let data_categories = splitList(row['Personal Data Categories (comma separated)'] || row['Data Categories'] || row['Categories']);
    if (data_categories.length === 0) {
      data_categories = ['General Contact Data (Name, Phone, Email)'];
    }

    let lawful_basis = splitList(row['Lawful Basis (comma separated)'] || row['Lawful Basis'] || row['Basis']);
    if (lawful_basis.length === 0) {
      lawful_basis = ['Legitimate Interests of the PIC (Sec. 12.f)'];
    }

    let recipients = splitList(row['Recipients / Processors (comma separated)'] || row['Recipients'] || row['Processors']);
    if (recipients.length === 0) {
      recipients = ['Internal Operating Department Only'];
    }

    const retention_period = String(
      row['Retention Period'] || row['Retention'] || '5 years following conclusion of transaction'
    ).trim();

    const rawStatus = String(row['Status (DRAFT, REVIEW, APPROVED)'] || row['Status'] || 'DRAFT').toUpperCase().trim();
    const status: 'DRAFT' | 'REVIEW' | 'APPROVED' =
      rawStatus === 'APPROVED' ? 'APPROVED' : rawStatus === 'REVIEW' ? 'REVIEW' : 'DRAFT';

    validProcesses.push({
      dept_id: resolvedDeptId,
      title,
      description: description || undefined,
      data_subjects,
      data_categories,
      lawful_basis,
      recipients,
      retention_period,
      status
    });
  });

  return {
    validProcesses,
    errors,
    deptMap: deptLookup
  };
}
