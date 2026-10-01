export type AgreementType = 'DATA_SHARING' | 'OUTSOURCING_PIP' | 'CROSS_BORDER' | 'INTER_AGENCY';
export type DsaStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED';

export interface DataSharingAgreement {
  id: string;
  org_id: string;
  counterparty_name: string;
  agreement_type: AgreementType;
  description?: string | null;
  data_categories: string;
  data_subjects?: string | null;
  purpose: string;
  lawful_basis?: string | null;
  effective_date: string;
  expiration_date: string;
  auto_renew: boolean;
  status: DsaStatus;
  pip_compliance_certified: boolean;
  security_measures?: string | null;
  vault_document_id?: string | null;
  vault_document_title?: string | null;
  vault_document_file_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDsaPayload {
  org_id: string;
  counterparty_name: string;
  agreement_type: AgreementType;
  description?: string;
  data_categories: string;
  data_subjects?: string;
  purpose: string;
  lawful_basis?: string;
  effective_date: string;
  expiration_date: string;
  auto_renew: boolean;
  pip_compliance_certified: boolean;
  security_measures?: string;
  vault_document_id?: string;
}

export interface UpdateDsaPayload {
  counterparty_name: string;
  agreement_type: AgreementType;
  description?: string;
  data_categories: string;
  data_subjects?: string;
  purpose: string;
  lawful_basis?: string;
  effective_date: string;
  expiration_date: string;
  auto_renew: boolean;
  status: DsaStatus;
  pip_compliance_certified: boolean;
  security_measures?: string;
  vault_document_id?: string;
}
