export interface PiaAssessment {
  id: string;
  process_id: string;
  process_title?: string | null;
  department_name?: string | null;
  threshold_answers: Record<string, boolean | string>;
  data_flow_details: Record<string, string>;
  privacy_principles_checklist: Record<string, boolean>;
  impact_score: number;      // 1 to 4
  probability_score: number; // 1 to 4
  risk_rating: number;       // 1 to 16
  risk_level: 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH';
  mitigation_solutions?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SavePiaPayload {
  process_id: string;
  threshold_answers: Record<string, boolean | string>;
  data_flow_details: Record<string, string>;
  privacy_principles_checklist: Record<string, boolean>;
  impact_score: number;
  probability_score: number;
  mitigation_solutions?: string;
}

// Diagnostic Threshold Questionnaire under NPC Circulars
export const THRESHOLD_QUESTIONS = [
  {
    id: 'large_scale',
    question: 'Does the processing involve large-scale processing of personal data (e.g. over 1,000 data subjects or core business activities)?',
    reference: 'NPC Circular 16-03 Section 4'
  },
  {
    id: 'sensitive_data',
    question: 'Does the processing involve Sensitive Personal Information (SPI) such as biometric, health, financial, or government-issued IDs?',
    reference: 'RA 10173 Section 3(l) & Section 13'
  },
  {
    id: 'systematic_monitoring',
    question: 'Does the processing involve systematic monitoring, profiling, automated decision-making, or behavioral scoring of data subjects?',
    reference: 'NPC Circular 2022-04 Section 11'
  },
  {
    id: 'vulnerable_subjects',
    question: 'Does the processing evaluate vulnerable data subjects, including minors, patients, employees with unequal bargaining power, or asylum seekers?',
    reference: 'NPC Advisory 2017-03'
  },
  {
    id: 'cross_border',
    question: 'Does personal data transfer to third-party offshore cloud providers or international jurisdictions outside the Philippines?',
    reference: 'RA 10173 Section 21'
  }
];

// Data Flow Life Cycle Touchpoints under NPC Guidelines
export const DATA_FLOW_STAGES = [
  { id: 'collection', label: '1. Collection & Intake', description: 'Methods, intake channels, consent forms, and physical or digital entry points.' },
  { id: 'storage', label: '2. Storage & Encryption', description: 'Databases, local servers, cloud providers, and encryption at rest/in transit.' },
  { id: 'usage', label: '3. Internal Usage & Access Controls', description: 'Authorized job roles, purpose boundaries, and authentication safeguards.' },
  { id: 'disclosure', label: '4. Disclosure & PIP Transfers', description: 'Third-party contractors, regulators, Data Sharing Agreements (DSAs).' },
  { id: 'disposal', label: '5. Retention & Certified Disposal', description: 'Scheduled archival, physical shredding, and certified digital sanitization.' },
];

// NPC Core Privacy Principles Checklist (Transparency, Legitimate Purpose, Proportionality)
export const PRIVACY_PRINCIPLES = [
  { id: 'transparency_notice', principle: 'Transparency', requirement: 'Clear, concise Privacy Notice provided to data subjects prior to collection.' },
  { id: 'purpose_limitation', principle: 'Legitimate Purpose', requirement: 'Data is strictly processed only for specified, legitimate corporate purposes.' },
  { id: 'data_minimization', principle: 'Proportionality', requirement: 'Collection is limited strictly to what is necessary for the declared purpose.' },
  { id: 'accuracy_quality', principle: 'Data Quality', requirement: 'Processes exist to keep personal records up to date and correct inaccuracies.' },
  { id: 'security_measures', principle: 'Security Safeguards', requirement: 'Appropriate organizational, physical, and technical controls are active.' },
  { id: 'dsr_empowerment', principle: 'Data Subject Rights', requirement: 'Mechanisms in place for data subjects to exercise Access, Erasure, or Object rights.' },
];

// Official NPC 4x4 Scoring Definitions
export const IMPACT_LEVELS = [
  { score: 1, label: '1 - Negligible', description: 'Inconvenience or minor irritation; no financial or physical harm.' },
  { score: 2, label: '2 - Limited', description: 'Short-term distress, minor financial loss, or reputational inconvenience easily remedied.' },
  { score: 3, label: '3 - Significant', description: 'Substantial harm, identity theft, financial liability, or adverse employment/health impact.' },
  { score: 4, label: '4 - Maximum', description: 'Catastrophic, life-threatening harm, permanent financial ruin, or severe human rights violation.' }
];

export const PROBABILITY_LEVELS = [
  { score: 1, label: '1 - Unlikely', description: 'Virtually no risk scenarios or multiple redundant protective barriers exist.' },
  { score: 2, label: '2 - Possible', description: 'Vulnerability exists but requires significant effort or specific conditions to materialize.' },
  { score: 3, label: '3 - Likely', description: 'Known system vulnerability, human error history, or clear attack vector.' },
  { score: 4, label: '4 - Almost Certain', description: 'Inadequate or missing safeguards; breach or privacy violation is practically inevitable.' }
];
