# TANOD - DPO Compliance Platform

A comprehensive SaaS platform for Philippine Data Protection Officers (DPOs) to manage Records of Processing Activities (ROPA) in compliance with the **Data Privacy Act of 2012 (RA 10173)** and **NPC Guidelines**.

**Current Phase:** Phase 1 - ROPA Core Module

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + Shadcn/UI components
- **Database:** PostgreSQL 15+ (via Prisma ORM)
- **Forms & Validation:** React Hook Form + Zod
- **Data Tables:** TanStack Table (React Table)
- **AI Integration:** SILIP (Philippine Legal AI with rule-based fallback)
- **External APIs:** SILIP (Philippine Data Privacy Knowledge Base)
- **Containerization:** Docker & Docker Compose

## AI-Powered Risk Assessment (via SILIP)

TANOD uses **SILIP** (Searchable Interface for Legal Information & Privacy) for intelligent risk assessment:

### Why SILIP?

✅ **Philippine-Focused:** Built specifically for RA 10173 compliance  
✅ **No API Keys:** Free to use, no quota limits  
✅ **Source Citations:** Provides legal references for audit trails  
✅ **AI-Powered:** Semantic search + legal reasoning  
✅ **Graceful Fallback:** Seamlessly uses rule-based scoring if SILIP unavailable

### How It Works

**Hybrid Approach:**
1. **Primary:** SILIP AI analyzes process data against Philippine data privacy law
2. **Fallback:** Rule-based scoring algorithm when SILIP is unavailable
3. **Transparent:** Real-time status badge shows current mode (SILIP Ready / Using Rule-Based)

### Configuration

No additional setup required! SILIP is already integrated. Optionally customize:

```bash
# .env configuration (optional)
AI_ENABLED=true                                      # Enable/disable (default: true)
NEXT_PUBLIC_SILIP_API_URL="https://silip.sanchez.ph/api"  # SILIP endpoint
```

### Features

- **Automatic Risk Scoring:** Risk level (LOW/MEDIUM/HIGH) auto-calculated on process creation/update
- **Smart Analysis:** SILIP evaluates data sensitivity, volume, retention, recipients
- **Zero Quota Issues:** SILIP has no per-request limits (public good project)
- **No User Action Required:** Risk assessment happens silently in background
- **Compliance-Focused:** Recommendations aligned with NPC guidelines

### Risk Calculation

**SILIP AI Mode:** Analyzes against Philippine Data Privacy Act with legal reasoning

**Rule-Based Mode:** Scoring algorithm (0-10 scale):
- Data Sensitivity: 0-3 points (special categories weighted higher)
- Data Categories Count: 0-2 points  
- Data Subjects Count: 0-2 points
- Retention Period: 0-2 points (longer retention = higher risk)
- Recipients Count: 0-2 points (more recipients = higher risk)

**Score Mapping:**
- 0-2: LOW risk
- 3-6: MEDIUM risk  
- 7-10: HIGH risk

### Status Badge

The sidebar displays current AI mode:
- 🟢 **SILIP Ready:** SILIP API available, AI analysis enabled
- 🟡 **Using Rule-Based:** SILIP unavailable or disabled, using rule-based scoring
- ⚪ **AI Disabled:** Explicitly disabled in `.env` (AI_ENABLED=false)

## Getting Started

### Prerequisites

- **Node.js:** v18+ ([Download](https://nodejs.org))
- **Docker & Docker Compose:** ([Install Guide](https://docs.docker.com/get-docker/))
- **PostgreSQL:** (via Docker, or local installation)
- **Git:** ([Download](https://git-scm.com))

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env with your configuration
# For local Docker PostgreSQL (default):
# DATABASE_URL="postgresql://tanod:tanod123@localhost:5434/tanod?schema=public"
```

### 3. Start PostgreSQL with Docker

```bash
# Start the database container
docker-compose up -d

# Verify it's running
docker ps
```

### 4. Initialize Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database
npm run pri & Roadmap

### ✅ Phase 1: ROPA Core Module (Current)

**Completed:**
- ✅ Dashboard with TanStack Table (sorting, filtering, pagination)
- ✅ 4-step ROPA Wizard (Create & Edit)
- ✅ The 5 Pillars of ROPA documentation
- ✅ SILIP API integration for compliance guidance
- ✅ Process detail view with full metadata
- ✅ Professional audit-ready UI (Slate theme)
- ✅ Responsive design (mobile-friendly)
- ✅ Docker compose setup
- ✅ AI-powered risk assessment with rule-based fallback
- ✅ Real-time AI status indicator

**In Development:**
- 🔄 Delete functionality with confirmations
- 🔄 Risk Assessment page (/risk) with trend analysis

### 🚧 Phase 2: Advanced Features (Q2 2026)

- Risk Assessment Dashboard with trends
- NPC-compliant PDF ROPA Report generation
- Breach Incident Logging & Notification
- Data Subject Rights Module (Access, Deletion, Portability)
- Bulk operations (Import/Export CSV)
- Advanced filtering and search
- Activity audit logs
- Email notifications

### 🔮 Phase 3: Enterprise Features (Q3 2026)

- Multi-organization support
- User role-based access (Admin, DPO, Auditor)
- Advanced AI analytics (risk trends, predictive assessment)
- Third-party vendor management
- Data Retention Policy templates
- Automated compliance reports (quarterly)
- Integration with external audit tools

---
├── app/                           # Next.js App Router
│   ├── dashboard/                 # Main dashboard with process table
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── ropa/                      # ROPA management
│   │   ├── new/                   # Create new entry
│   │   │   └── page.tsx
│   │   ├── [id]/                  # View/edit entry
│   │   │   ├── page.tsx           # Detail view
│   │   │   └── edit/page.tsx      # Edit form
│   │   └── layout.tsx
│   ├── layout.tsx                 # Root layout
│   ├── globals.css                # Global styles
│   └── page.tsx                   # Redirect to dashboard
│
├── components/
│   ├── ui/                        # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── data-table.tsx         # TanStack Table wrapper
│   │   ├── dropdown-menu.tsx
│   │   ├── separator.tsx
│   │   └── textarea.tsx
│   ├── ropa-form.tsx              # Create form (4-step wizard)
│   ├── ropa-edit-form.tsx         # Edit form (4-step wizard)
│   ├── process-table.tsx          # Dashboard table
│   └── sidebar.tsx                # Navigation sidebar
│
├── actions/
│   └── ropa.ts                    # Server actions for CRUD
│       ├── createProcess()        # Create new ROPA entry
│       ├── getProcessesByOrg()    # Fetch processes
│       ├── getProcessById()       # Get single process
│       ├── updateProcess()        # Update ROPA entry
│       ├── deleteProcess()        # Delete ROPA entry
│       ├── getDepartmentsByOrg()  # Fetch departments
│       ├── getOrganization()      # Fetch org details
│       └─ Reference

### Development
```bash
npm run dev              # Start Next.js dev server (http://localhost:3000)
npm run build            # Build optimized production bundle
npm run start            # Start production server
npm run lint             # Run ESLint on codebase
```

### Database
```bash
npm run prisma:generate  # Generate Prisma Client
npm run prisma:push      # Sync schema to PostgreSQL
npm run prisma:seed      # Populate sample data
npm run db:studio        # Open Prisma Studio (http://localhost:5555)
```

---

## Design Philosophy

### Visual Identity
- **Color Palette:** Slate (professional, corporate, legal)
- **Typography:** Clear hierarchy, readable fonts
- **Spacing:** Generous whitespace for clarity
- **Components:** Consistent Shadcn/UI design system

### UX Principles
- **Audit-Ready:** All actions logged and traceable
- **Compliance-First:** ROPA guidelines built into workflows
- **User-Focused:** Guided wizard reduces complexity
- **Responsive:** Works on desktop, tablet, mobile
- **Accessible:** WCAG 2.1 compliance

---

## Support & Documentation

### Resources
- **Philippine Data Privacy Act (RA 10173):** [NPC Official](https://www.privacy.gov.ph)
- **NPC Advisories & Circulars:** [NPC Issuances](https://www.privacy.gov.ph/issuances)
- **SILIP Knowledge Base:** https://silip.sanchez.ph
- **Google Generative AI:** [AI Studio](https://ai.google.dev) | [Docs](https://ai.google.dev/docs)
- **Shadcn/UI Docs:** https://ui.shadcn.com
- **TanStack Table:** https://tanstack.com/table
- **Prisma Docs:** https://www.prisma.io/docs

### Contributing
We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Follow our code style
4. Submit a pull request

### Reporting Issues
Found a bug? [Create an issue](https://github.com/tildemark/tanod/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Environment details

### AI Troubleshooting

**Problem: "Using Rule-Based" shown in AI status badge**
- Likely cause: SILIP API temporarily unavailable (network, server)
- Solution: Check internet connection, SILIP status at https://silip.sanchez.ph
- Note: System continues working with rule-based scoring (no data loss)

**Problem: Risk assessment not auto-calculating**
- Likely cause: Form validation error or server error
- Solution: Check browser console and server logs
- Fallback: Rule-based scoring will be used automatically

**Problem: "AI Disabled" badge showing**
- Likely cause: Set `AI_ENABLED=false` in .env
- Solution: Remove or set `AI_ENABLED=true` in .env, restart server

**Problem: SILIP endpoint errors in server logs**
- Likely cause: Network issue or SILIP server maintenance
- Solution: Verify you can reach https://silip.sanchez.ph/api/consult
- Fallback: System automatically uses rule-based scoring

---

## License

Proprietary - © 2026 TANOD. All rights reserved.

For licensing inquiries, contact the maintainers.

---

## Changelog

### v0.2.0 (February 4, 2026)
- ✨ SILIP-powered risk assessment (Philippine legal AI)
- ✨ Zero-quota AI integration (no API keys needed)
- ✨ Rule-based fallback for 100% uptime
- ✨ AI status indicator in sidebar
- ✨ Automatic risk level calculation on process create/update
- 📚 Comprehensive SILIP configuration guide

### v0.1.0 (February 4, 2026)
- ✨ Initial ROPA Core Module launch
- ✨ Dashboard with TanStack Table
- ✨ 4-step ROPA Wizard (Create & Edit)
- ✨ SILIP API integration
- ✨ Process detail view
- ✨ Docker compose setup
- 🐛 Fixed Next.js 15 params handling
- 🐛 Fixed form validation for riskLevel

---

## Acknowledgments

- **NPC (National Privacy Commission)** - Compliance framework
- **SILIP** - Legal knowledge base integration
- **Shadcn/UI** - Component library
- **TanStack** - Table library
- **Vercel** - Next.js framework
- **Prisma** - ORM     ├── LAWFUL_BASIS
│       └── RECIPIENTS
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── seed.ts                    # Seed script
│
├── public/                         # Static assets
├── .env.example                    # Example environment variables
├── docker-compose.yml              # Docker compose config
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript config
├── tailwind.config.js              # Tailwind config
├── postcss.config.js               # PostCSS config
└── README.md                       # This file
```

---

## Database Schema

### Organization
- Represents a company/entity using TANOD
- Has multiple departments
- Includes DPO contact information and industry classification

### Department
- Organizational units (HR, Marketing, IT, etc.)
- Belongs to one organization
- Has multiple processes

### Process (ROPA Entry)
- Core record of processing activity
- **The 5 Pillars of ROPA:**
  1. **Data Subjects:** WHO is affected? (Employees, Customers, etc.)
  2. **Data Categories:** WHAT data? (Financial, Personal Info, Biometric, etc.)
  3. **Lawful Basis:** WHY? (Consent, Legal Obligation, Legitimate Interest, etc.)
  4. **Recipients:** WHO can access? (Internal staff, Banks, BIR, etc.)
  5. **Retention Period:** HOW LONG? (Duration and deletion policy)
- **Status Tracking:** DRAFT → REVIEW → APPROVED
- **Risk Assessment:** Automatic calculation (LOW, MEDIUM, HIGH)

## SILIP Integration
**SILIP API** (https://silip.sanchez.ph/api) provides real-time compliance guidance powered by Philippine data privacy law knowledge:

### How It Works
- **Trigger:** When user enters a process title (e.g., "CCTV Surveillance")
- **Query:** System asks "What is the lawful basis under Philippine DPA?"
- **Response:** Displays contextual compliance tips in the ROPA wizard
- **Example:** "For CCTV: NPC Circular 2020-XX suggests 'Legitimate Interest' as the basis, provided notice is given."

### Implementation
- Custom hook: `useSilipConsult.ts`
- Non-blocking: Tips are helpful but not mandatory
- Future: Expand to risk assessment suggestions

## Risk Assessment Matrix

### Risk Calculation Methodology

TANOD uses a **rule-based risk assessment** to automatically calculate risk levels:

```
RISK SCORE CALCULATION:

1. Data Sensitivity (0-3 points)
   - Biometric/Health data: +3
   - Financial/Government IDs: +2
   - Personal Information: +1
   - Public data: 0

2. Data Volume (0-2 points)
   - >10,000 subjects: +2
   - 100-10,000 subjects: +1
   - <100 subjects: 0

3. Data Categories Count (0-2 points)
   - 5+ categories: +2
   - 3-4 categories: +1
   - 1-2 categories: 0

4. Retention Period (0-2 points)
   - >5 years: +2
   - 1-5 years: +1
   - <1 year: 0

5. Recipients Count (0-1 points)
   - 5+ recipients: +1
   - <5 recipients: 0

TOTAL SCORE MAPPING:
- 0-2 points: LOW
- 3-6 points: MEDIUM
- 7+ points: HIGH
```

### Risk Level Indicators

| Level | Color | Meaning | Examples |
|-------|-------|---------|----------|
| **LOW** | 🟢 Green | Minimal risk | Public mailing list, Non-sensitive data |
| **MEDIUM** | 🟡 Yellow | Moderate monitoring | Employee directory, Customer contact info |
| **HIGH** | 🔴 Red | Requires controls | Salary processing, CCTV footage, Health data |

**Note:** Risk assessment is automatic but can be reviewed and updated by DPOs.
- Example: "For CCTV, NPC Circular 2020-XX suggests 'Legitimate Interest' as the basis"

## Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:push      # Push schema to database
npm run prisma:seed      # Seed sample data
npm run db:studio        # Open Prisma Studio
```

## Design Philosophy

**Professional & Audit-Ready**
- Slate/Zinc color palette (legal/corporate feel)
- Clean, minimalist interface
- Clear typography and spacing
- Focus on compliance and documentation

## License

Private - © 2026 TANOD
