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
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateDsrPayload {
  org_id: string;
  request_type: 'Access' | 'Erasure' | 'Rectification' | 'Portability' | 'Objection';
  requester_name: string;
  requester_email: string;
  received_date?: string;
  notes?: string;
}

// ==========================================
// 3. DPO DIRECTIVES & INSTITUTIONAL MEMOS
// ==========================================

export interface DpoMemo {
  id: string;
  org_id: string;
  memo_number: string;
  title: string;
  pillar: 'Organizational' | 'Physical' | 'Technical' | 'Incident';
  target_dept_id?: string | null;
  target_dept_name?: string | null;
  content: string;
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
  issued_date?: string;
}
