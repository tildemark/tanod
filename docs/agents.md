You are an expert full-stack engineer specializing in Tauri v2, Rust, SvelteKit, and SQLite. Your task is to maintain and extend TANOD — a privacy-first, 100% local, offline Windows desktop application for Philippine Data Protection Officers (DPOs) complying with the Data Privacy Act of 2012 (RA 10173).

This project was pivoted from an existing Next.js prototype. All cloud dependencies, external AI, and multi-tenant SaaS features are permanently removed. Everything runs locally inside the user's machine to preserve absolute data sovereignty. Do not use cloud services, external databases, or third-party AI APIs.

---

## Technology Stack

* **Frontend:** SvelteKit (with `@sveltejs/adapter-static` for SPA mode), TypeScript, Tailwind CSS v4.
* **UI Components:** lucide-svelte icons, svelte-dnd-action (Kanban boards), TanStack Table (data grids).
* **Form Validation:** sveltekit-superforms with zod.
* **Backend / OS Bridge:** Tauri v2 (Rust) for native Windows APIs, dialogs, and IPC.
* **Database:** Local SQLite using the `rusqlite` crate (bundled with SQLCipher for AES-256 encryption at rest).
* **PDF Engine:** Native `typst` crate in Rust for export generation.
* **Reactivity:** Svelte 5 runes (`$state`, `$derived`, `$effect`) — do NOT use Svelte 4 `$:` reactive declarations.

---

## Current Database Schema (SQLite)

All tables use `TEXT PRIMARY KEY` UUIDs and `DATETIME` timestamps. Foreign keys are enabled.

1. **organizations** — Entity profile, DPO credentials, NPC registration, renewal deadlines, ASIR due date, NPC seal status.
2. **departments** — Organizational divisions linked to ROPA processes.
3. **processes** — ROPA entries with 5-pillar JSON fields (data_subjects, data_categories, lawful_basis, recipients, retention_period).
4. **pia_assessments** — NPC 4×4 matrix evaluations (impact 1–4 × probability 1–4 = risk_rating, risk_level).
5. **incidents** — Breach records with breach_timer_deadline (discovered + 72h), ASIR flags, NPC notification status.
6. **dsr_requests** — Data Subject Rights requests with SLA deadline (received + 30 working days).
7. **dsr_action_logs** — Append-only per-request action history with action_taken enum.
8. **dpo_memos** — Policies, Privacy Manuals, Directives, Notices, SOPs. Extended fields: `policy_category` (PRIVACY_MANUAL | POLICY | DIRECTIVE_MEMO | PRIVACY_NOTICE | SOP), `version`, `effective_date`, `review_date`, `approved_by`.
9. **data_sharing_agreements** — DSA/PIP contracts. Fields: counterparty_name, counterparty_type, agreement_type (DATA_SHARING | PIP_CONTRACT | JOINT_CONTROLLER | DATA_TRANSFER), security_tier (STANDARD | SENSITIVE | CRITICAL), status (DRAFT | ACTIVE | EXPIRING | EXPIRED | TERMINATED), start_date, expiration_date.
10. **statutory_documents** — Vault documents by year and category (NPC_REGISTRATION_CERT, NPC_SEAL_OF_REGISTRATION, SEC_GIS, SECRETARY_CERTIFICATE, NOTARIZED_DPO_FORM, BOARD_RESOLUTION, OTHER_COMPLIANCE).
11. **privacy_officers** — DPO and COP designations with is_primary_dpo flag.
12. **system_audit_logs** — Append-only SHA-256 hash-chained compliance event log (action, entity_type, entity_id, summary, details, prev_hash, entry_hash).

---

## Current Routes & Modules

| Route | Module | Status |
| --- | --- | --- |
| `/` | Executive Dashboard | ✅ Complete |
| `/ropa` | ROPA Registry | ✅ Complete |
| `/pia` | PIA 4×4 Matrix | ✅ Complete |
| `/incidents` | 72-Hour Breach Monitor | ✅ Complete |
| `/dsr` | DSR Rights Helpdesk | ✅ Complete |
| `/dsa` | Data Sharing Agreements | ✅ Complete |
| `/memos` | Policies, Privacy Manual & Directives | ✅ Complete |
| `/npc-registration` | NPCRS Registry & Filing Portal | ✅ Complete |
| `/vault` | Statutory Document Vault | ✅ Complete |
| `/audit-trail` | Immutable Audit Trail | ✅ Complete (standalone page) |
| `/backup` | Disaster Recovery & Migration | ✅ Complete |
| `/settings` | Entity & Governance Administration | ✅ Complete |

---

## Critical UI/UX Directives

The primary end-users of TANOD are corporate lawyers and non-technical Data Protection Officers. The interface must be clean, highly intuitive, executive, and free of developer jargon.

1. **Terminology & Labeling:** Use strictly legal and NPC statutory wording (e.g., "Personal Information Controller (PIC)", "Lawful Basis under Sec. 12/13", "NPC Seal/Registration"). Never expose raw error traces or technical jargon.

2. **Guided, Low-Cognitive-Load Inputs:** Replace open-ended text fields with standardized multi-select badge chips wherever possible. All complex wizards must feature breadcrumb progress steps.

3. **Visual Design & Tone:** Clean "Slate" color theme with Amber accents for compliance status. High contrast, legible typography with generous whitespace.

4. **Legal-Grade Exports:** One-click "Export to Official PDF" buttons producing audit-ready, signable documents.

5. **Svelte 5 Runes Only:** Use `$state()`, `$derived()`, `$derived.by()`, and `$effect()`. The `page` store from `$app/stores` must be used for reactive URL param reading — never `window.location` in `onMount`.

---

## Sidebar Navigation Structure

```
Core Compliance
  Dashboard              /
  ROPA Registry          /ropa
  PIA 4x4 Matrix         /pia

Regulatory Enforcement
  72-Hour Breach Monitor /incidents
  Data Sharing (DSA/PIP) /dsa
  DSR Rights Helpdesk    /dsr
  Policies & Manual      /memos

Statutory Archive
  Document Vault         /vault
  NPCRS Registry         /npc-registration
  Backup & Recovery      /backup

Administration & System
  Entity & Governance    /settings
  Immutable Audit Trail  /audit-trail
```

---

## Rust Command Handler Pattern

All commands are in `src-tauri/src/commands/` and registered in `lib.rs`. Follow this pattern:

```rust
#[tauri::command]
pub fn list_data_sharing_agreements(
    state: tauri::State<DbState>,
    org_id: String,
) -> Result<Vec<DataSharingAgreement>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // SQL query...
    Ok(results)
}
```

Commands are registered in `lib.rs` via `.invoke_handler(tauri::generate_handler![...])`.

---

## Distribution

The application is distributed via GitHub Releases (`.exe` NSIS installer and `.msi` WiX installer) compiled by the `tauri-release.yml` GitHub Actions workflow on version tag pushes (`v*`).

The landing page is hosted at `tanod.sanchez.ph` via GitHub Pages (`deploy-pages.yml` workflow) from the `/website` directory.

Current version: **v1.1.0**
