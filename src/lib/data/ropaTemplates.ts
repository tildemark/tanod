import type { ProcessFormData } from '$lib/types/ropa';

export interface PreFilledTemplate {
  id: string;
  name: string;
  category: 'HR & People' | 'Finance & Accounting' | 'Operations & Facilities' | 'Sales & Marketing' | 'IT & Security' | 'Customer Service';
  suggestedDepartment: string;
  description: string;
  data: Omit<ProcessFormData, 'dept_id'>;
}

export const PRE_FILLED_TEMPLATES: PreFilledTemplate[] = [
  {
    id: 'hr-payroll',
    name: 'Payroll Processing & Statutory Remittance',
    category: 'HR & People',
    suggestedDepartment: 'Human Resources / Accounting',
    description: 'Computation of compensation, deductions, BIR withholding taxes, and mandatory SSS, PhilHealth, and Pag-IBIG remittances.',
    data: {
      title: 'Monthly & Bi-Monthly Payroll Processing and Statutory Remittances',
      description: 'End-to-end processing of employee salaries, wage adjustments, mandatory government remittances (BIR, SSS, PhilHealth, Pag-IBIG), and corporate bank disbursements.',
      data_subjects: [
        'Employees & Staff',
        'Consultants & Independent Contractors'
      ],
      data_categories: [
        'General Contact Data (Name, Phone, Email)',
        'Government-Issued IDs (TIN, SSS, Passport, UMID)',
        'Financial & Payment Records (Bank, Salary, Tax)',
        'Employment & HR History'
      ],
      lawful_basis: [
        'Contract Performance / Fulfillment (Sec. 12.b)',
        'Legal Obligation under PH Law (Sec. 12.c / 13.b)'
      ],
      recipients: [
        'Bureau of Internal Revenue (BIR)',
        'Social Security System (SSS) / GSIS',
        'PhilHealth & Pag-IBIG Fund',
        'Designated Commercial Banks & Payroll Processors'
      ],
      retention_period: '10 years following tax assessment per National Internal Revenue Code (NIRC) and BIR requirements',
      status: 'APPROVED'
    }
  },
  {
    id: 'hr-recruitment',
    name: 'Recruitment, Applicant Tracking & Background Check',
    category: 'HR & People',
    suggestedDepartment: 'Human Resources',
    description: 'Screening curriculum vitae, candidate interviews, character references, and pre-employment qualification validation.',
    data: {
      title: 'Talent Acquisition, Candidate Evaluation & Reference Verification',
      description: 'Sourcing, screening, interviewing, and assessing qualifications of job candidates, including character reference calls and NBI/police clearance checks.',
      data_subjects: [
        'Job Applicants & Candidates'
      ],
      data_categories: [
        'General Contact Data (Name, Phone, Email)',
        'Government-Issued IDs (TIN, SSS, Passport, UMID)',
        'Employment & HR History',
        'Academic & Educational Records'
      ],
      lawful_basis: [
        'Consent of Data Subject (Sec. 12.a / 13.a)',
        'Legitimate Interests of the PIC (Sec. 12.f)'
      ],
      recipients: [
        'Internal Operating Department Only',
        'Third-Party Personal Information Processor (PIP / Vendor)'
      ],
      retention_period: '1 year for unselected applicants; archived into active HR 201 file for hired employees',
      status: 'APPROVED'
    }
  },
  {
    id: 'hr-hmo',
    name: 'HMO Enrollment & Annual Physical Examination (APE)',
    category: 'HR & People',
    suggestedDepartment: 'Human Resources',
    description: 'Corporate health insurance enrollment, dependent coverage, and executive medical checkup coordination.',
    data: {
      title: 'Employee Healthcare Insurance (HMO) & Medical Diagnostic Administration',
      description: 'Facilitating healthcare benefits, dependent enrollment in HMO cards, and coordinating mandatory annual physical examination diagnostics.',
      data_subjects: [
        'Employees & Staff',
        'Emergency Contacts & Dependents'
      ],
      data_categories: [
        'General Contact Data (Name, Phone, Email)',
        'Government-Issued IDs (TIN, SSS, Passport, UMID)',
        'Health & Medical Records (Diagnosis, Vitals)'
      ],
      lawful_basis: [
        'Contract Performance / Fulfillment (Sec. 12.b)',
        'Medical Treatment & Healthcare Operations (Sec. 13.e)'
      ],
      recipients: [
        'Health Maintenance Organizations (HMO / Insurers)',
        'Third-Party Personal Information Processor (PIP / Vendor)'
      ],
      retention_period: '5 years post-employment per DOLE occupational safety and health guidelines',
      status: 'APPROVED'
    }
  },
  {
    id: 'ops-cctv',
    name: 'CCTV Security Surveillance & Physical Premises Access',
    category: 'Operations & Facilities',
    suggestedDepartment: 'Security & Facilities',
    description: 'Video surveillance in building perimeters, entry logbooks, biometric door access, and visitor badge issuance.',
    data: {
      title: 'Physical Security Surveillance (CCTV) & Visitor Access Logging',
      description: 'Continuous video recording of public and common business premises for crime prevention, asset protection, and visitor registration logs.',
      data_subjects: [
        'Employees & Staff',
        'Premises Visitors & Guests',
        'Vendor & Supplier Personnel'
      ],
      data_categories: [
        'General Contact Data (Name, Phone, Email)',
        'Government-Issued IDs (TIN, SSS, Passport, UMID)',
        'Biometric Data (Fingerprints, Facial Recognition)',
        'CCTV & Video Surveillance Footage'
      ],
      lawful_basis: [
        'Legitimate Interests of the PIC (Sec. 12.f)',
        'Protection of Vital Interests / Emergency (Sec. 12.d / 13.c)'
      ],
      recipients: [
        'Internal Operating Department Only',
        'Philippine Law Enforcement / Court Order'
      ],
      retention_period: '30 days automated FIFO loop overwriting unless flagged for ongoing investigation',
      status: 'APPROVED'
    }
  },
  {
    id: 'finance-vendor',
    name: 'Vendor & Supplier Procurement Due Diligence',
    category: 'Finance & Accounting',
    suggestedDepartment: 'Procurement / Finance',
    description: 'Accreditation of suppliers, tax identification verification, bank details for payment, and DPA vendor compliance.',
    data: {
      title: 'Vendor Accreditation, Billing & Accounts Payable Processing',
      description: 'Vendor evaluation, receipt of BIR Form 2303, collection of designated bank account details, and issuance of checks/EFT payments.',
      data_subjects: [
        'Vendor & Supplier Personnel',
        'Consultants & Independent Contractors'
      ],
      data_categories: [
        'General Contact Data (Name, Phone, Email)',
        'Government-Issued IDs (TIN, SSS, Passport, UMID)',
        'Financial & Payment Records (Bank, Salary, Tax)'
      ],
      lawful_basis: [
        'Contract Performance / Fulfillment (Sec. 12.b)',
        'Legal Obligation under PH Law (Sec. 12.c / 13.b)'
      ],
      recipients: [
        'Bureau of Internal Revenue (BIR)',
        'Designated Commercial Banks & Payroll Processors',
        'Independent External Auditors'
      ],
      retention_period: '10 years under BIR regulations and statutory financial audit retention laws',
      status: 'APPROVED'
    }
  },
  {
    id: 'cust-inquiry',
    name: 'Customer Service, Ticketing & Incident Resolution',
    category: 'Customer Service',
    suggestedDepartment: 'Customer Operations',
    description: 'Receipt of customer inquiries, complaint documentation, omnichannel chat logs, and post-resolution feedback.',
    data: {
      title: 'Customer Inquiries, Support Tickets & Complaint Resolution',
      description: 'Handling consumer tickets, account assistance, warranty or product inquiries, call recording disclosures, and customer satisfaction surveys.',
      data_subjects: [
        'Customers & Consumers'
      ],
      data_categories: [
        'General Contact Data (Name, Phone, Email)',
        'Digital Identifiers (IP, Device, Cookies)'
      ],
      lawful_basis: [
        'Consent of Data Subject (Sec. 12.a / 13.a)',
        'Legitimate Interests of the PIC (Sec. 12.f)'
      ],
      recipients: [
        'Internal Operating Department Only',
        'Accredited Cloud & IT Infrastructure Provider'
      ],
      retention_period: '3 years after ticket closure or resolution of dispute',
      status: 'APPROVED'
    }
  },
  {
    id: 'it-access',
    name: 'IT User Account Administration & System Access Logs',
    category: 'IT & Security',
    suggestedDepartment: 'Information Technology',
    description: 'Active Directory / Google Workspace account provisioning, multi-factor authentication, VPN logs, and firewall audit trails.',
    data: {
      title: 'IT User Account Provisioning, Single Sign-On & Network Access Auditing',
      description: 'Granting system access credentials, provisioning enterprise email, monitoring VPN connection logs, and maintaining audit logs for compliance.',
      data_subjects: [
        'Employees & Staff',
        'Consultants & Independent Contractors'
      ],
      data_categories: [
        'General Contact Data (Name, Phone, Email)',
        'Digital Identifiers (IP, Device, Cookies)',
        'Employment & HR History'
      ],
      lawful_basis: [
        'Contract Performance / Fulfillment (Sec. 12.b)',
        'Legitimate Interests of the PIC (Sec. 12.f)'
      ],
      recipients: [
        'Internal Operating Department Only',
        'Accredited Cloud & IT Infrastructure Provider'
      ],
      retention_period: '1 year rolling log retention for security incident investigation and compliance audits',
      status: 'APPROVED'
    }
  },
  {
    id: 'marketing-leads',
    name: 'Lead Generation & Marketing Newsletter Subscriptions',
    category: 'Sales & Marketing',
    suggestedDepartment: 'Sales & Marketing',
    description: 'Opt-in email newsletter subscriptions, webinar participant registrations, and marketing CRM leads.',
    data: {
      title: 'Marketing Communications, Webinar Registration & Lead Management',
      description: 'Collection of opt-in email addresses and corporate contact details for marketing campaigns, webinars, product updates, and newsletters.',
      data_subjects: [
        'Customers & Consumers',
        'Job Applicants & Candidates'
      ],
      data_categories: [
        'General Contact Data (Name, Phone, Email)',
        'Digital Identifiers (IP, Device, Cookies)'
      ],
      lawful_basis: [
        'Consent of Data Subject (Sec. 12.a / 13.a)'
      ],
      recipients: [
        'Internal Operating Department Only',
        'Third-Party Personal Information Processor (PIP / Vendor)',
        'Accredited Cloud & IT Infrastructure Provider'
      ],
      retention_period: 'Until consent is revoked (unsubscribed) or after 24 months of inactive engagement',
      status: 'APPROVED'
    }
  }
];
