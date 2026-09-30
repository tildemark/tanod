import { DATA_CATEGORIES, DATA_SUBJECTS, LAWFUL_BASIS, RECIPIENTS } from '@/lib/schemas'

export interface PiaQuestion {
  id: string
  label: string
  placeholder?: string
  help?: string
  multiline?: boolean
  options?: string[]
  multi?: boolean
}

export interface PiaSection {
  id: string
  title: string
  description?: string
  questions: PiaQuestion[]
}

export const PROCESSING_PURPOSES = [
  'Employee management',
  'Payroll and benefits',
  'Customer onboarding',
  'Marketing and promotions',
  'Service delivery',
  'Contract management',
  'Legal compliance',
  'Security and fraud prevention',
  'Research and analytics',
]

export const RISK_LIBRARY = [
  'Unauthorized access to personal data',
  'Data breach / leakage',
  'Excessive data collection',
  'Inaccurate or outdated data',
  'Unclear consent or legal basis',
  'Improper data sharing with third parties',
  'Cross-border transfer without safeguards',
  'Insufficient retention controls',
  'Lack of transparency to data subjects',
  'Weak access control and authentication',
  'Insufficient incident response readiness',
  'Inadequate vendor oversight',
]

export const RISK_LIKELIHOOD = ['Low', 'Medium', 'High']
export const RISK_IMPACT = ['Low', 'Medium', 'High']

export const PIA_SECTIONS: PiaSection[] = [
  {
    id: 'context',
    title: 'Processing Context',
    description: 'Describe the processing activity and its legal basis under the Philippine Data Privacy Act.',
    questions: [
      {
        id: 'personal_data',
        label: 'Personal data collected',
        placeholder: 'Select the types of personal data collected',
        options: DATA_CATEGORIES,
        multi: true,
      },
      {
        id: 'sensitive_data',
        label: 'Sensitive personal information collected',
        placeholder: 'Specify sensitive or special categories of data',
        multiline: true,
      },
      {
        id: 'purpose',
        label: 'Purpose of processing',
        placeholder: 'Select the primary purposes of processing',
        options: PROCESSING_PURPOSES,
        multi: true,
      },
      {
        id: 'lawful_basis',
        label: 'Lawful basis',
        placeholder: 'Select the lawful basis for processing',
        options: LAWFUL_BASIS,
        multi: true,
      },
      {
        id: 'data_subjects',
        label: 'Data subjects',
        placeholder: 'Select the data subjects involved',
        options: DATA_SUBJECTS,
        multi: true,
      },
      {
        id: 'recipients',
        label: 'Recipients and data sharing',
        placeholder: 'Select recipients or processors',
        options: RECIPIENTS,
        multi: true,
      },
      {
        id: 'retention',
        label: 'Retention period',
        placeholder: 'How long will the data be retained and why?',
        multiline: true,
      },
      {
        id: 'retention_reason',
        label: 'Retention justification',
        placeholder: 'Explain why the chosen retention period is necessary',
        multiline: true,
      },
      {
        id: 'cross_border',
        label: 'Cross-border transfers',
        placeholder: 'Is data transferred outside the Philippines?',
        options: ['Yes', 'No'],
      },
    ],
  },
  {
    id: 'lifecycle',
    title: 'Data Lifecycle and Sharing',
    description: 'Describe how data is collected, stored, accessed, shared, and disposed.',
    questions: [
      {
        id: 'collection_method',
        label: 'How is the data collected?',
        placeholder: 'Online forms, onboarding, biometrics, manual input, etc.',
        multiline: true,
      },
      {
        id: 'storage_security',
        label: 'How is the data stored and secured?',
        placeholder: 'Hosting, encryption, access controls, physical security',
        multiline: true,
      },
      {
        id: 'internal_access',
        label: 'Who has access internally?',
        placeholder: 'Departments and roles with access',
        multiline: true,
      },
      {
        id: 'disposal_method',
        label: 'How is the data disposed of?',
        placeholder: 'Secure deletion, shredding, archival policies',
        multiline: true,
      },
    ],
  },
  {
    id: 'risk',
    title: 'Risk & Impact Assessment',
    description: 'Identify privacy risks, impact on data subjects, and mitigation measures.',
    questions: [
      {
        id: 'high_risk',
        label: 'High-risk processing indicators',
        placeholder: 'Explain if large-scale, sensitive, systematic monitoring, or high impact processing is involved',
        multiline: true,
      },
      {
        id: 'impact_summary',
        label: 'Impact summary',
        placeholder: 'Potential harm or impact to data subjects if a breach occurs',
        multiline: true,
      },
      {
        id: 'risk_notes',
        label: 'Additional risk notes',
        placeholder: 'Add any other risks not listed above',
        multiline: true,
      },
      {
        id: 'mitigations',
        label: 'Mitigation measures',
        placeholder: 'Technical and organizational safeguards planned or in place',
        multiline: true,
      },
    ],
  },
  {
    id: 'governance',
    title: 'Governance & Accountability',
    description: 'Document accountability actions required by the DPA and NPC guidance.',
    questions: [
      {
        id: 'security_controls',
        label: 'Security controls',
        placeholder: 'Access control, encryption, monitoring, retention controls',
        multiline: true,
      },
      {
        id: 'vendor_controls',
        label: 'Processor/vendor controls',
        placeholder: 'DPA clauses, audits, and vendor risk management',
        multiline: true,
      },
      {
        id: 'training',
        label: 'Training & awareness',
        placeholder: 'Training obligations for staff handling data',
        multiline: true,
      },
      {
        id: 'dpo_opinion',
        label: 'DPO opinion',
        placeholder: 'DPO recommendation and conditions for proceeding',
        multiline: true,
      },
      {
        id: 'summary_findings',
        label: 'Summary of findings',
        placeholder: 'Summarize the key risks and observations',
        multiline: true,
      },
      {
        id: 'recommendation',
        label: 'Recommendation',
        placeholder: 'Proceed, defer, or require additional controls',
        multiline: true,
      },
      {
        id: 'dpo_signature',
        label: 'DPO signature (name)',
        placeholder: 'Name of DPO signing off',
      },
    ],
  },
]
