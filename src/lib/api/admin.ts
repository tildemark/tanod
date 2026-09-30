import { invoke } from '@tauri-apps/api/core';
import type { Organization, Department, PrivacyOfficer } from '$lib/types/organization';

export async function getOrganization(): Promise<Organization> {
  return await invoke<Organization>('get_organization');
}

export async function updateOrganization(
  id: string,
  payload: Omit<Organization, 'id' | 'created_at' | 'updated_at'>
): Promise<Organization> {
  return await invoke<Organization>('update_organization', { id, payload });
}

export async function saveOrgLogo(fileName: string, base64Data: string): Promise<string> {
  return await invoke<string>('save_org_logo', { fileName, base64Data });
}

export async function listDepartments(orgId: string): Promise<Department[]> {
  return await invoke<Department[]>('list_departments', { orgId });
}

export async function createDepartment(payload: {
  org_id: string;
  name: string;
  description?: string;
}): Promise<Department> {
  return await invoke<Department>('create_department', { payload });
}

export async function updateDepartment(
  id: string,
  payload: { name: string; description?: string }
): Promise<void> {
  return await invoke<void>('update_department', { id, payload });
}

export async function deleteDepartment(id: string): Promise<void> {
  return await invoke<void>('delete_department', { id });
}

// Privacy Officers (DPO + COPs under NPC Circular 2022-04)
export async function listPrivacyOfficers(orgId: string): Promise<PrivacyOfficer[]> {
  return await invoke<PrivacyOfficer[]>('list_privacy_officers', { orgId });
}

export async function createPrivacyOfficer(payload: {
  org_id: string;
  name: string;
  title: string;
  email: string;
  phone?: string;
  role: 'DPO' | 'COP';
  is_primary_dpo: boolean;
  assigned_branch_dept?: string;
}): Promise<PrivacyOfficer> {
  return await invoke<PrivacyOfficer>('create_privacy_officer', { payload });
}

export async function updatePrivacyOfficer(
  id: string,
  payload: {
    name: string;
    title: string;
    email: string;
    phone?: string;
    role: 'DPO' | 'COP';
    is_primary_dpo: boolean;
    assigned_branch_dept?: string;
  }
): Promise<void> {
  return await invoke<void>('update_privacy_officer', { id, payload });
}

export async function deletePrivacyOfficer(id: string): Promise<void> {
  return await invoke<void>('delete_privacy_officer', { id });
}
