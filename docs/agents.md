You are an expert full-stack engineer specializing in Tauri v2, Rust, SvelteKit, and SQLite. Your task is to build TANOD, a privacy-first, 100% local, offline Windows desktop application for Philippine Data Protection Officers (DPOs) complying with the Data Privacy Act of 2012 (RA 10173).

This project is a pivot from an existing Next.js prototype. All cloud dependencies, external AI (SILIP), and multi-tenant SaaS features are permanently removed. Everything runs locally inside the user's machine to preserve absolute data sovereignty. Do not use cloud services, external databases, or third-party AI APIs. Everything must run locally on the user's machine to maintain strict data sovereignty.

### Technology Stack

* Frontend: SvelteKit (with @sveltejs/adapter-static for Single Page Application mode), TypeScript, Tailwind CSS.
* UI Components: shadcn-svelte (Slate theme), lucide-svelte, and svelte-dnd-action (for Kanban boards).
* Tables: @tanstack/svelte-table (sorting, filtering, pagination).
* Form Validation: sveltekit-superforms with zod.
* Backend / OS Bridge: Tauri v2 (Rust) for native Windows APIs, dialogs, and IPC.
* Database: Local SQLite using the rusqlite crate (bundled with SQLCipher for AES-256 encryption at rest).
* PDF Engine: Native typst crate in Rust for export generation.

### Core Database Architecture (SQLite)

Translate the existing relational schema into SQLite with foreign keys enabled:

1. organizations:
   * id (TEXT PRIMARY KEY), name (TEXT NOT NULL), slug (TEXT UNIQUE NOT NULL)
   * logo_path (TEXT) -> stored locally in app data
   * address, city, country, phone, email, website (TEXT)
   * dpo_name, dpo_email, industry, description (TEXT), employee_count (INTEGER)
   * created_at, updated_at (DATETIME)

2. departments:
   * id (TEXT PRIMARY KEY), org_id (TEXT REFERENCES organizations(id))
   * name (TEXT NOT NULL), description (TEXT), created_at, updated_at (DATETIME)

3. processes (ROPA entries):
   * id (TEXT PRIMARY KEY), dept_id (TEXT REFERENCES departments(id))
   * title (TEXT NOT NULL), description (TEXT)
   * data_subjects (JSON TEXT: e.g. ["Employees", "Customers"])
   * data_categories (JSON TEXT: e.g. ["Biometric", "Financial"])
   * lawful_basis (JSON TEXT: e.g. ["Consent", "Legitimate Interest"])
   * recipients (JSON TEXT: e.g. ["BIR", "Banks"])
   * retention_period (TEXT NOT NULL)
   * status (TEXT CHECK(status IN ('DRAFT', 'REVIEW', 'APPROVED')))
   * created_at, updated_at (DATETIME)

4. pia_assessments (Privacy Impact Assessments):
   * id (TEXT PRIMARY KEY), process_id (TEXT REFERENCES processes(id))
   * threshold_answers (JSON TEXT)
   * data_flow_details (JSON TEXT)
   * privacy_principles_checklist (JSON TEXT)
   * impact_score (INTEGER CHECK(impact_score BETWEEN 1 AND 4)) -- 1: Negligible, 2: Limited, 3: Significant, 4: Maximum
   * probability_score (INTEGER CHECK(probability_score BETWEEN 1 AND 4)) -- 1: Unlikely, 2: Possible, 3: Likely, 4: Almost Certain
   * risk_rating (INTEGER GENERATED ALWAYS AS (impact_score * probability_score) STORED)
   * risk_level (TEXT) -- Computed: 1 = 'NEGLIGIBLE', 2-4 = 'LOW', 6-9 = 'MEDIUM', 10-16 = 'HIGH'
   * mitigation_solutions (TEXT)
   * created_at, updated_at (DATETIME)

5. incidents:
   * id (TEXT PRIMARY KEY), incident_date (DATETIME), discovered_date (DATETIME)
   * breach_timer_deadline (DATETIME) -- Auto-calculated: discovered_date + 72 hours
   * description (TEXT), measures_taken (TEXT), is_notifiable_breach (BOOLEAN)
   * asir_reported (BOOLEAN DEFAULT 0), created_at, updated_at (DATETIME)

6. dsr_requests (Data Subject Rights):
   * id (TEXT PRIMARY KEY), request_type (TEXT: Access, Erasure, Rectification, Portability, Objection)
   * requester_name (TEXT), requester_email (TEXT)
   * status (TEXT CHECK(status IN ('RECEIVED', 'UNDER_REVIEW', 'ACTIONED', 'REJECTED')))
   * received_date (DATETIME), sla_deadline (DATETIME) -- received_date + 30 working days
   * created_at, updated_at (DATETIME)

7. dpo_memos:
   * id (TEXT PRIMARY KEY), memo_number (TEXT UNIQUE NOT NULL), title (TEXT NOT NULL)
   * pillar (TEXT: Organizational, Physical, Technical, Incident)
   * target_dept_id (TEXT REFERENCES departments(id) NULLABLE) -- NULL means Org-wide
   * content (TEXT NOT NULL), issued_date (DATETIME), created_at (DATETIME)

### Legacy Context Mapping

Before writing new code, read the relevant files in the `/legacy` folder to match the existing UI and business logic:

1. **Database:** Look at `/legacy/prisma/schema.prisma` to understand the Organization, Department, and Process models. Translate these exactly into SQLite `CREATE TABLE` commands in Rust (`rusqlite`), but add the new `pia_assessments`, `incidents`, `dsr_requests`, and `dpo_memos` tables.
2. **UI & Styling:** Look at `/legacy/app/globals.css` to grab the Slate theme color variables. Look at `/legacy/components/ui/` to match the visual feel when scaffolding `shadcn-svelte` components.
3. **Forms & Validation:** Read `/legacy/actions/ropa.ts` and the associated Zod schemas. Reuse these exact field names and validation rules in `sveltekit-superforms`.

### Critical UI/UX Directive: Designing for Legal Practitioners

The primary end-users of TANOD are corporate lawyers and non-technical Data Protection Officers. The user interface must be clean, highly intuitive, executive, and free of developer jargon:

1. Terminology & Labeling:
   * Use strictly legal and NPC statutory wording (e.g., "Personal Information Controller (PIC)", "Personal Information Processor (PIP)", "Lawful Basis under Sec. 12/13", "Data Subject Request", "NPC Seal/Registration").
   * Never expose raw data formats, error traces, or technical jargon in the UI.

2. Guided, Low-Cognitive-Load Inputs:
   * Replace open-ended text fields with standardized multi-select badge chips wherever possible (e.g., pre-populate statutory options for Lawful Basis, Data Categories, Sensitive Personal Information, and Recipient types).
   * All complex wizards (ROPA & PIA) must feature breadcrumb progress steps with "Save Draft" and clear forward/back buttons.

3. Visual Design & Tone:
   * Clean, distraction-free "Slate" color theme with high contrast, legible typography (sans-serif text with clean line spacing), and generous whitespace.
   * Use standard Shadcn-Svelte components: Dialog, Sheet, Tabs, Badge, and Tooltip.
   * Every complex regulatory field must have an info icon (Tooltip) citing the relevant NPC Circular or DPA section in plain language.

4. Legal-Grade Exports:
   * Provide one-click "Export to Official PDF" buttons that produce audit-ready, signable documents formatted specifically for Philippine regulatory submissions.

### Application Functional Requirements

1. Branded Sidebar & Header: Displays the uploaded organization logo (or TANOD fallback text), active organization name, and navigation links.
2. Organization & Department Settings: Port the 14-field form with local logo picker (`tauri-plugin-dialog`) and department CRUD with safe deletion guards.
3. 4-Step ROPA Wizard: Intuitive multi-step form covering the 5 Pillars of ROPA, utilizing Superforms + Zod.
4. ROPA TanStack Table: Data table with multi-column sorting, debounced search filtering, status badges, and pagination controls.
5. Official NPC PIA Matrix Engine: Strictly implement the 4x4 matrix (Impact 1-4 × Probability 1-4 = Risk Rating 1-16) mapping to Negligible, Low, Medium, and High Risk.
6. 72-Hour Breach Countdown & DSR Kanban: Live countdown for breach reporting, and a drag-and-drop board (`svelte-dnd-action`) for rights requests with SLA indicators.
7. DPO Memos & Native Printing: Rich-text memo generator with CSS `@media print` rules for clean Windows printing.

### Implementation Protocol

Do not dump all files at once. Work iteratively and ask for confirmation after each stage:

* Phase 1: Setup & Rust Core - Scaffolding commands, `Cargo.toml`, Windows `%APPDATA%` SQLite database creation (`db.rs`), and initial schema migrations.
* Phase 2: Organization & Department Module - Rust Tauri commands for Org/Dept CRUD, logo file storage handling, and the SvelteKit Admin Settings pages.
* Phase 3: ROPA Module - SvelteKit 4-Step Wizard, Zod schemas, Rust commands, and the TanStack Table view with delete confirmations.
* Phase 4: NPC PIA Engine - The 4x4 matrix scoring, assessment steps, and Typst PDF export Rust command.
* Phase 5: Incident (72h Timer), DSR Kanban, and Memos.

### Phase 6: Distribution & Landing Page (GitHub Pages)

The application will be distributed via a landing page hosted on GitHub Pages at the custom domain `tanod.sanchez.ph`.

1. Create a `/website` directory at the root of the project. This must be entirely separate from the main SvelteKit app in `/src`.
2. Inside `/website`, create a clean, professional, single-page `index.html` using a CDN-linked Tailwind CSS script (for simplicity).
3. The design should feature:
   * A hero section with the TANOD logo, a headline ("Privacy-First DPO Workspace"), and a subheadline.
   * A mock screenshot placeholder.
   * A "Features" grid highlighting: 100% Local Storage, NPC 4x4 PIA Matrix, 72-Hour Breach Timers.
   * A dynamic download button using vanilla JavaScript to fetch the latest `.msi` release from the GitHub API (`tildemark/tanod`).
4. Include a `CNAME` file in the `/website` directory containing `tanod.sanchez.ph`.
5. Create `.github/workflows/deploy-pages.yml` to automatically deploy the `/website` folder to GitHub Pages on pushes to the main branch.
6. Create `.github/workflows/tauri-release.yml` using the official `tauri-apps/tauri-action` to compile the Windows `.msi` installer and publish it to GitHub Releases whenever a new version tag is pushed.

Start with Phase 1: Provide the project creation commands, dependency installation lists, and the Rust database initialization module (`db.rs`).
