// ==========================================
// 1. INCIDENTS & 72-HOUR STATUTORY COUNTDOWN
// ==========================================

export interface Incident {
  id: string;
  org_id: string;
  title: string;
  incident_date: string;
  discovered_date: string;
  breach_timer_deadline: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impacted_individuals?: number | null;
  systems_affected?: string | null;
  description?: string | null;
  measures_taken?: string | null;
  is_notifiable_breach: boolean;
  npc_notified: boolean;
  npc_notification_date?: string | null;
  status: 'REPORTED' | 'ASSESSING' | 'NOTIFYING' | 'RESOLVED';
  asir_reported: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateIncidentPayload {
  org_id: string;
  title: string;
  incident_date: string;
  discovered_date?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impacted_individuals?: number;
  systems_affected?: string;
  description?: string;
  measures_taken?: string;
  is_notifiable_breach: boolean;
}

export interface UpdateIncidentPayload {
  title: string;
  incident_date: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impacted_individuals?: number;
  systems_affected?: string;
  description?: string;
  measures_taken?: string;
  is_notifiable_breach: boolean;
  npc_notified: boolean;
  npc_notification_date?: string;
  status: 'REPORTED' | 'ASSESSING' | 'NOTIFYING' | 'RESOLVED';
  asir_reported: boolean;
}

// ==========================================
// 2. DATA SUBJECT RIGHTS (DSR) & KANBAN
// ==========================================

export interface DsrRequest {
  id: string;
  org_id: string;
  request_type: 'Access' | 'Erasure' | 'Rectification' | 'Portability' | 'Objection';
  requester_name: string;
  requester_email: string;
  status: 'RECEIVED' | 'UNDER_REVIEW' | 'ACTIONED' | 'REJECTED';
  received_date: string;
  sla_deadline: string;
  notes?: string | null;
  requested_scope?: string | null;
  action_taken?: 'REDACTED' | 'ERASED' | 'EXTRACTED_PROVIDED' | 'DENIED' | 'NOTE_ADDED' | string | null;
  data_location?: string | null;
  resolution_summary?: string | null;
  resolved_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DsrActionLog {
  id: string;
  dsr_id: string;
  action_taken: string;
  action_details: string;
  data_location?: string | null;
  performed_by: string;
  created_at: string;
}

export interface CreateDsrPayload {
  org_id: string;
  request_type: 'Access' | 'Erasure' | 'Rectification' | 'Portability' | 'Objection';
  requester_name: string;
  requester_email: string;
  received_date?: string;
  notes?: string;
  requested_scope?: string;
  data_location?: string;
}

export interface ResolveDsrPayload {
  id: string;
  status: 'ACTIONED' | 'REJECTED';
  action_taken: 'REDACTED' | 'ERASED' | 'EXTRACTED_PROVIDED' | 'DENIED' | 'NOTE_ADDED' | string;
  action_details: string;
  data_location?: string;
  resolution_summary: string;
  performed_by?: string;
}

// ==========================================
// 3. DPO DIRECTIVES & INSTITUTIONAL MEMOS
// ==========================================

export type PolicyStatus = 'DRAFT' | 'PROPOSED' | 'APPROVED' | 'ARCHIVED';
export type PolicyCategory = 'PRIVACY_MANUAL' | 'POLICY' | 'DIRECTIVE_MEMO' | 'PRIVACY_NOTICE' | 'SOP';

export interface DpoMemo {
  id: string;
  org_id: string;
  memo_number: string;
  title: string;
  pillar: 'Organizational' | 'Physical' | 'Technical' | 'Incident';
  target_dept_id?: string | null;
  target_dept_name?: string | null;
  content: string;
  status: PolicyStatus;
  policy_category: PolicyCategory;
  version: string;
  effective_date?: string | null;
  review_date?: string | null;
  approved_by?: string | null;
  issued_date: string;
  created_at?: string | null;
}

export interface CreateMemoPayload {
  org_id: string;
  memo_number: string;
  title: string;
  pillar: 'Organizational' | 'Physical' | 'Technical' | 'Incident';
  target_dept_id?: string;
  content: string;
  status?: PolicyStatus;
  policy_category?: PolicyCategory;
  version?: string;
  effective_date?: string;
  review_date?: string;
  approved_by?: string;
  issued_date?: string;
}

export interface UpdateMemoPayload {
  id: string;
  title: string;
  pillar: 'Organizational' | 'Physical' | 'Technical' | 'Incident';
  target_dept_id?: string;
  content: string;
  status: PolicyStatus;
  policy_category: PolicyCategory;
  version: string;
  effective_date?: string;
  review_date?: string;
  approved_by?: string;
}
