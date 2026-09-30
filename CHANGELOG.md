# Changelog

All notable changes to **TANOD Desktop** (Privacy-First Local DPO Workspace for the Philippines) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - Append-only `system_audit_logs` table linked with cryptographic SHA-256 hash chaining (`prev_hash` ➔ `entry_hash`).
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
