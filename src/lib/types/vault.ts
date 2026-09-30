export type DocumentCategory =
  | 'SEC_GIS'
  | 'SECRETARY_CERTIFICATE'
  | 'BOARD_RESOLUTION'
  | 'NOTARIZED_DPO_FORM'
  | 'NPC_REGISTRATION_CERT'
  | 'NPC_SEAL_OF_REGISTRATION'
  | 'DATA_SHARING_AGREEMENT'
  | 'OTHER_COMPLIANCE';

export interface StatutoryDocument {
  id: string;
  org_id: string;
  year: number;
  category: DocumentCategory;
  title: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type?: string | null;
  notes?: string | null;
  uploaded_at?: string | null;
}

export interface UploadDocumentPayload {
  org_id: string;
  year: number;
  category: DocumentCategory;
  title: string;
  file_name: string;
  base64_content: string;
  mime_type?: string;
  notes?: string;
}
