# Changelog

All notable changes to **TANOD Desktop** (Privacy-First Local DPO Workspace for the Philippines) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-10-01

### 🆕 New Modules & Major Features

This release introduces four significant new compliance modules and architectural improvements, all driven by real DPO workflow requirements under RA 10173 and NPC issuances.

#### Data Sharing Agreements (DSA / PIP) Registry — `/dsa`
- New dedicated module for tracking all Data Sharing Agreements and Personal Information Processor (PIP) contracts under RA 10173 Sec. 20 and NPC Circular 2022-01.
- Full agreement lifecycle management: `DRAFT → ACTIVE → EXPIRING → EXPIRED → TERMINATED`.
- Agreement type classification: `DATA_SHARING`, `PIP_CONTRACT`, `JOINT_CONTROLLER`, `DATA_TRANSFER` (cross-border).
- Security tier tagging: `STANDARD`, `SENSITIVE`, `CRITICAL` with mandatory safeguard fields per party.
- 30/60-day automated expiry warnings surfaced in the Executive Dashboard action items.
- Rust backend: `dsa.rs` command handler with full SQLite `data_sharing_agreements` table.

#### NPCRS Registry — `/npc-registration` (Separated from Governance)
- New dedicated page for NPC Registration lifecycle management, now separated from the general Entity & Governance settings.
- Statutory renewal checklist tracking 7 mandatory filing documents cross-referenced against Vault inventory.
- `NPC_REGISTRATION_CERT` and `NPC_SEAL_OF_REGISTRATION` added as first-class vault categories.
- Renewal deadline countdown, ASIR submission tracker (March 31 due date), and registration status panel.
- **Portal Helper:** Copy-paste credential block pre-populated with org details for NPC Privacy Portal submissions.

#### Policies, Privacy Manual & Directives — `/memos` (Major Refactor)
- Complete refactor of the former "DPO Memos & Directives" into a full **Institutional Policy Management System**.
- Policy document categories: `PRIVACY_MANUAL`, `POLICY`, `DIRECTIVE_MEMO`, `PRIVACY_NOTICE`, `SOP`.
- Three-stage approval workflow tracking: `DRAFT → PROPOSED → APPROVED → ARCHIVED`.
- **Privacy Manual Compliance Banner:** Detects whether an NPC Advisory 2017-01-compliant approved manual exists; flags as `Action Required` if missing.
- Policy metrics: Total Documents, Approved & In Force, Draft & Proposed, Privacy Manual status.
- Quick-start templates: Data Privacy Manual (full NPC Advisory 2017-01 boilerplate), Password & Lockout Policy, Public Privacy Notice.
- Serial number auto-generation prefixed by document type (e.g., `DPA-MANUAL-2026-001`, `DPO-MEMO-2026-002`).
- Security pillar filter pills: Organizational / Physical / Technical / Breach & Incident Protocol.
- Version tracking and annual review date fields on all policy documents.
- Print-optimized formal letterhead preview modal with `window.print()` support.

### 🛠 Improvements

#### Executive Dashboard
- **Renewal Documents Progress Counter:** `{n}/7 Documents Ready` stat card with progress bar and list of missing items, linked to Vault and NPCRS Registry.
- **Data Privacy Manual Alert:** Action item fires when no approved `PRIVACY_MANUAL` policy exists.
- **DSA Expiry Alerts:** Expired DSAs surface as `CRITICAL`, expiring DSAs as `WARNING` action items.
- **Compliance Score Refinement:** Now factors in missing renewal documents (up to −15 pts) and absence of approved Privacy Manual (−10 pts).

#### Document Vault
- Added `NPC_REGISTRATION_CERT` and `NPC_SEAL_OF_REGISTRATION` as archivable document categories.
- These categories are tracked against the dashboard 7-item renewal document checklist.

#### Immutable Audit Trail Navigation Bug Fix
- **Fixed:** Navigating away from `/settings?tab=audit_trail` and returning no longer resets to the default organization tab.
- **Root cause:** `onMount()` read `window.location.search` only once. Fixed by replacing with reactive `$effect()` bound to the `$page.url.searchParams` store from `$app/stores`.

#### Sidebar Navigation Restructure
- Navigation groups updated to reflect the expanded module set:
  - **Core Compliance:** Dashboard, ROPA Registry, PIA 4×4 Matrix.
  - **Regulatory Enforcement:** 72-Hour Breach Monitor, Data Sharing (DSA / PIP), DSR Rights Helpdesk, Policies & Privacy Manual.
  - **Statutory Archive:** Document Vault, NPCRS Registry, Backup & Recovery.
  - **Administration & System:** Entity & Governance, Immutable Audit Trail.

### Database Schema Changes
- **New table:** `data_sharing_agreements` — Tracks all DSAs and PIP contracts with counterparty details, agreement type, expiry dates, security tier, and status.
- **Extended `dpo_memos`:** Added `policy_category`, `version`, `effective_date`, `review_date`, `approved_by` columns for full policy lifecycle management.
- **Extended `organizations`:** Added `npc_notification_email`, `breach_notification_hours`, `has_npc_seal`, `asir_due_date` statutory compliance fields.
- **Extended `statutory_documents`:** Added `NPC_REGISTRATION_CERT` and `NPC_SEAL_OF_REGISTRATION` to allowed category values.

---

## [1.0.0] - 2026-10-01

### 🚀 Initial Production Release

TANOD v1.0.0 delivers a sovereign, privacy-by-design desktop compliance workstation tailored specifically for Data Protection Officers (DPOs), Compliance Officers for Privacy (COPs), and privacy practitioners operating under Republic Act No. 10173 (Data Privacy Act of 2012) and National Privacy Commission (NPC) circulars.

### Added

- **Core Governance & Registration Engine (NPCRS):**
  - Full compliance tracking for PIC/PIP organization profiles, sectors, and DPO/COP appointments.
  - Statutory renewal countdown timers, Head of Organization sign-off tracking, and registration seal status.
- **Records of Processing Activities (ROPA):**
  - Statutory 5-pillar structure complying with DPA Sec. 16 and NPC guidelines.
  - Interactive multi-step wizard for personal data processing lifecycles.
  - Standard enterprise templates (HR Employee Lifecycle, Customer KYC, CCTV & Physical Security, Visitor Logging).
  - Excel template export (`.xlsx`) and batch spreadsheet ingestion for bulk onboarding.
- **Official NPC 4×4 Privacy Impact Assessment (PIA):**
  - Automated threshold diagnostics determining mandatory PIA requirements.
  - Complete 5-stage personal data flow mapping (Collection, Storage, Usage, Disclosure, Disposal).
  - Principles assessment (Transparency, Legitimate Purpose, Proportionality).
  - Interactive Gartner-style 4×4 risk quadrant matrix evaluating Likelihood vs. Impact with threat mitigations.
  - Automatic cross-linking of approved ROPA activities directly into the PIA evaluation engine.
- **Regulatory Enforcement & Compliance Automation:**
  - **72-Hour Security Incident & Data Breach Clock:** Real-time countdown timer strictly adhering to NPC Circular 16-03 for mandatory breach notification and mitigation logs.
  - **Data Subject Rights (DSR) Management:**
    - Dual View Switcher: Interactive Kanban swimlanes (drag-and-drop triage) and compact Tabular Data Grid.
    - Viewport overflow mitigation: Fixed column headers with independent internal swimlane scrolling.
    - Granular evidentiary tracking: `requested_scope`, storage `data_location`, and compliance `action_taken` (`EXTRACTED_PROVIDED`, `ERASED`, `REDACTED`, `CORRECTED`, `DENIED`).
    - Dedicated append-only `dsr_action_logs` history drawer for longitudinal audit readiness.
  - **DPO Memos & Directives:** Internal statutory directives and advisory issuance engine.
- **Statutory Document Vault & Archival:**
  - Secure local document vault categorized by compliance lifecycle with full-text search.
  - Native Windows file launcher (`open_vault_file`) enabling one-click inspection in default system viewers.
- **Disaster Recovery & Clean Install Portability:**
  - One-click atomic backup engine compressing SQLite database and uploaded vault assets into a timestamped `.tanod` archive.
  - Cryptographic SHA-256 manifest generation verifying archive integrity.
  - Full atomic restore and clean-install portability.
- **Tamper-Evident System Audit Trail:**
  - Append-only `system_audit_logs` table linked with cryptographic SHA-256 hash chaining (`prev_hash` → `entry_hash`).
  - Zero-overhead architecture (no unnecessary user/operator login barriers).
  - Audit trail integrity validator in Settings with real-time hash-chain verification.
- **About TANOD & Companion Ecosystem Integration:**
  - Re-engineered as a modal dialog accessible from the bottom of the persistent sidebar.
  - Embedded developer information for Alfredo Sanchez Jr (`derf@sanchez.ph`, `https://sanchez.ph`).
  - Seamless links to companion privacy engineering suites:
    - **SILIP**: Searchable Interface for Legal Information & Privacy (`https://silip.sanchez.ph`).
    - **DPA Mastery**: Interactive DPA Knowledge Suite & Certification Drills (`https://dpa.sanchez.ph`).
- **Visual Design & Aesthetics:**
  - Consistent light enterprise aesthetic featuring slate/indigo/amber palettes and high-contrast typography.
  - Replaced legacy default icons with high-resolution TANOD Philippine Shield emblems across the taskbar, window title, and favicon.

### Security & Privacy

- **100% Offline Sovereignty:** Zero third-party telemetry, zero external cloud dependencies. All data resides securely in the user's local application data directory (`rusqlite` WAL mode).
- **Cryptographic Chaining:** Sequential verification ensuring regulatory records cannot be silently pruned or modified.
