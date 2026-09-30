export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_path?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  dpo_name?: string | null;
  dpo_email?: string | null;
  industry?: string | null;
  description?: string | null;
  employee_count?: number | null;
  npc_notification_email?: string | null;
  breach_notification_hours?: number | null;
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
