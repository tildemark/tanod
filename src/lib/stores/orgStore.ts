import { writable } from 'svelte/store';
import { getOrganization } from '$lib/api/admin';
import type { Organization } from '$lib/types/organization';

export const organizationStore = writable<Organization | null>(null);

export async function refreshOrganization(): Promise<Organization | null> {
  try {
    const org = await getOrganization();
    organizationStore.set(org);
    return org;
  } catch (e) {
    console.error('Failed to load organization profile', e);
    return null;
  }
}
