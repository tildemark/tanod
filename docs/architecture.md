The TANOD desktop application operates on a strict local-first architecture, decoupling the UI rendering from the secure OS-level data processing. This ensures the application handles highly sensitive Philippine DPA compliance data without external cloud dependencies.

```mermaid
graph TD
    subgraph Frontend ["Presentation Layer — SvelteKit (adapter-static)"]
        A[SvelteKit SPA] --> B(lucide-svelte + Tailwind CSS v4)
        A --> C(Superforms + Zod Validation)
        A --> D(svelte-dnd-action Kanban)
        A --> E(TanStack Table Registry)
    end

    subgraph Bridge ["Middleware — Tauri v2 IPC"]
        F((Tauri API Bridge))
    end

    subgraph Backend ["Core Engine — Rust"]
        G[Rust Command Handlers] --> H[Typst PDF Engine]
        G --> I[SHA-256 Audit Chain Writer]
        G --> J[SQL Query Builder]
        G --> K[Native Windows APIs]
    end

    subgraph Storage ["Local Environment — Windows %APPDATA%"]
        L[(tanod.db — SQLite + SQLCipher AES-256)]
        M[vault/{year}/ — Statutory Documents]
        N[assets/ — Logos & Brand]
        O[Exported PDF Reports]
    end

    Frontend <-->|JSON Payloads| Bridge
    Bridge <--> Backend
    J <-->|AES-256 Encrypted Read/Write| L
    H -->|File System Write| O
    K -->|Shell Launch| M
```

## Technology Stack Blueprint

| Layer | Component | Primary Function |
| --- | --- | --- |
| **Frontend Framework** | SvelteKit (`adapter-static`) | Compiles to a lightweight SPA running inside native Windows Edge WebView2. |
| **UI System** | lucide-svelte + Tailwind CSS v4 | Accessible icon components with Slate/Amber professional theme. |
| **Form Handling** | Sveltekit-Superforms + Zod | Manages complex, deeply nested state for ROPA and PIA documentation with strict type validation. |
| **Backend Binary** | Tauri v2 (Rust) | Executes heavy computational logic, OS notifications, and file system operations outside the browser sandbox. |
| **Database** | `rusqlite` + SQLCipher | Stores all DPO records in a locally encrypted, zero-configuration relational database file (`%APPDATA%`). |
| **Document Generation** | `typst` (Rust Crate) | Compiles templates into precise, print-ready PDFs (PIAs, ASIRs, Memos) natively. |

## Core Module & Feature Inventory

### 1. Data Mapping & Risk Assessment

* **ROPA Lifecycle Wizard:** A 5-pillar guided workflow capturing Data Subjects, Categories, Lawful Basis, Recipients, and Retention schedules to maintain an active processing registry compliant with RA 10173 Sec. 16.
* **PIA Execution Engine:** Threshold analysis, personal data flow charting, and the strict NPC 4×4 Risk Matrix (Impact 1–4 × Probability 1–4) generating automated Negligible to High risk classifications.
* **Mitigation Tracker:** Links high-risk processes to specific recommended privacy solutions for auditor review.

### 2. Incident & Rights Management

* **72-Hour Breach Countdown:** A persistent UI alert system tracking the legally mandated window for notifying the NPC and data subjects following an incident discovery (NPC Circular 16-03).
* **ASIR Auto-Aggregator:** Automatically compiles all security incidents into the Annual Security Incident Report tabular layout (due March 31 annually).
* **DSR Kanban Helpdesk:** A `svelte-dnd-action` board tracking Data Subject Rights requests with 30-day resolution SLA timers; supports dual Kanban/table view.

### 3. Governance, Agreements & Policies

* **Institutional Policy Management System:** Draft, version-control, and approve organizational Privacy Manuals, Policies, DPO Directives, Privacy Notices, and SOPs — with `DRAFT → PROPOSED → APPROVED → ARCHIVED` workflow.
* **Data Sharing Agreement (DSA) Registry:** Tracks all DSAs and PIP contracts with counterparty details, agreement type, expiry dates, security tier, and status; triggers 30/60-day expiry warnings in the Executive Dashboard.
* **NPCRS Registry:** Dedicated NPC Registration page with 7-document renewal checklist synchronized against the Vault, portal helper for copy-paste credential submission, and statutory deadline counters.

### 4. Security & Auditability

* **Immutable Audit Trail:** A standalone page backed by an append-only `system_audit_logs` table. Each entry is SHA-256 hash-chained to the previous record. Supports module filtering, full-text search, and real-time integrity re-verification.
* **Cryptographic Sovereignty:** Complete data isolation utilizing AES-256 encryption at rest, ensuring that a compromised physical device does not constitute a data breach.
* **Disaster Recovery:** One-click `.tanod` archive bundling the SQLite database, vault documents, and assets with SHA-256 manifest verification.

## SQLite Schema Overview

| Table | Purpose |
| --- | --- |
| `organizations` | Entity profile, DPO credentials, NPCRS registration fields |
| `departments` | Organizational divisions linked to ROPA processes |
| `processes` | ROPA registry — 5-pillar personal data processing records |
| `pia_assessments` | NPC 4×4 Risk Matrix evaluations linked to ROPA entries |
| `incidents` | Breach records with 72-hour countdown and ASIR flags |
| `dsr_requests` | Data Subject Rights requests with 30-day SLA tracking |
| `dsr_action_logs` | Append-only DSR action history per request |
| `dpo_memos` | Policies, Privacy Manual, Directives, Privacy Notices, SOPs |
| `data_sharing_agreements` | DSA/PIP contracts with lifecycle, security tier, and expiry |
| `statutory_documents` | Vault — compliance documents organized by year and category |
| `privacy_officers` | DPO and COP designations per organization |
| `system_audit_logs` | Immutable SHA-256 hash-chained compliance event log |
