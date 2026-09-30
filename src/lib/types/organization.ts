export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_path?: string | null;
  tin_number?: string | null;
  entity_type: 'PIC' | 'PIP' | 'BOTH';
  sector?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;

  // Head of Organization / Agency
  head_name?: string | null;
  head_title?: string | null;
  head_email?: string | null;
  head_phone?: string | null;

  // Primary DPO
  dpo_name?: string | null;
  dpo_email?: string | null;
  industry?: string | null;
  description?: string | null;
  employee_count?: number | null;

  // NPCRS Registration & Timelines
  npc_registration_number?: string | null;
  registration_date?: string | null;
  renewal_deadline?: string | null;
  has_npc_seal?: boolean | null;
  asir_due_date?: string | null;

  npc_notification_email?: string | null;
  breach_notification_hours?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PrivacyOfficer {
  id: string;
  org_id: string;
  name: string;
  title: string;
  email: string;
  phone?: string | null;
  role: 'DPO' | 'COP';
  is_primary_dpo: boolean;
  assigned_branch_dept?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Department {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  process_count: number;
  created_at?: string | null;
  updated_at?: string | null;
}
