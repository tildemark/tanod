# Changelog

All notable changes to TANOD (DPO Compliance Platform) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1-wip] - 2026-02-04

### Added

#### Feature Dashboard Pages
- **Risk Assessment Dashboard** (`/risk`)
  - Real-time risk distribution statistics
  - High/Medium/Low risk counts and percentages
  - Visual risk distribution bar chart
  - Recommended actions based on risk profile
  - Processes ranked by risk level
  - Filter and sort by risk severity
  
- **Breach Monitor Page** (`/breach`)
  - Incident reporting dialog with full form validation
  - Track open incidents and critical alerts
  - 72-hour NPC notification window tracking
  - Incident list with severity and status badges
  - Real-time incident statistics
  
- **My ROPA List** (`/ropa`)
  - Comprehensive process list view
  - Department-wide statistics
  - Approved vs Draft/Review counts
  - Full table with filtering and sorting

#### Breach Incident Management (Database-Ready)
- Incident database model with comprehensive fields:
  - Title, occurrence date, discovery date
  - Severity levels (LOW, MEDIUM, HIGH, CRITICAL)
  - Impacted individuals count
  - Systems affected tracking
  - Detailed summary/description
- Workflow states: REPORTED → ASSESSING → NOTIFYING → RESOLVED
- NPC notification tracking (date, status)
- Server actions for full CRUD operations
- Report incident dialog with validation

#### Organization Breach Settings
- **Breach Settings Page** (`/admin/breach-settings`)
  - Configure NPC notification email (default: privacy.complaints@privacy.gov.ph)
  - Set notification window (default: 72 hours)
  - Philippine Data Privacy Act reference information
  - NPC Circular 16-03 compliance guidance

#### Visual Enhancements
- TANOD SVG logo created (shield with data subject icon)
- Logo displayed as fallback when no company logo uploaded
- Logo shown in sidebar footer for branding consistency
- Professional shield design with Philippine DPA theme

### Changed
- Updated sidebar header to show TANOD logo when no company logo
- Enhanced sidebar footer with logo and branding
- Organization schema extended with breach notification fields
- Improved breach monitor with real incident data instead of placeholders

### Technical
- Added Incident model to Prisma schema
- Created incident server actions (create, read, update, delete)
- Extended Organization model with NPC notification settings
- Updated schemas to support breach notification configuration
- Database migration for new incident tracking

## [0.1.0-wip] - 2026-02-04

### Added

#### Core ROPA Module
- Complete ROPA (Records of Processing Activities) management system
- Four-step ROPA wizard for creating and editing processing activities
- ROPA detail view displaying all 5 data protection pillars:
  - Data Subjects
  - Data Categories
  - Lawful Basis
  - Recipients
  - Retention Period
- Full CRUD operations (Create, Read, Update, Delete) for processes
- TanStack React Table with:
  - Sorting by any column
  - Multi-column filtering
  - Pagination (10, 25, 50 items per page)
  - Row selection
  - Responsive design

#### AI Risk Assessment
- SILIP API integration (Philippine legal AI system)
- Automatic risk calculation on process creation and updates
- Hybrid risk assessment approach:
  - Primary: SILIP AI analysis (no API keys required)
  - Fallback: Rule-based scoring algorithm
- Risk levels: LOW (0-3), MEDIUM (4-6), HIGH (7-10)
- Risk score calculation based on:
  - Data sensitivity (special categories weighted higher)
  - Number of data subjects
  - Recipients count
  - Retention period
  - Lawful basis type
- Real-time AI status indicator in sidebar footer
- Fallback mechanism when SILIP unavailable

#### Administration Panel
- **Organization Settings** (`/admin/settings`)
  - 14 configurable organization fields:
    - Basic Info: Name, Slug, Industry, Employee Count, Description
    - Contact: Address, City, Country, Phone, Email, Website
    - DPO: DPO Name, DPO Email
  - Logo upload with automatic resizing (200x100px)
  - Logo preview before saving
  - URL-based logo input fallback
  - Form validation with Zod schemas

- **Department Management** (`/admin/departments`)
  - Create departments with descriptions
  - Edit existing departments
  - Delete departments (with process count validation)
  - Department list with process count badges
  - Modal-based create/edit forms
  - Confirmation dialogs for destructive actions

- **Admin Dashboard** (`/admin`)
  - Organization overview card
  - Department statistics
  - DPO contact information
  - Quick action buttons
  - Recent departments list
  - Quick navigation links

- **Sidebar Header**
  - Dynamic logo display (when uploaded)
  - Company name display below logo
  - Fallback to "TANOD - DPO Compliance Platform" text
  - Professional branded appearance

#### Delete Functionality
- Delete confirmation dialog with Radix UI AlertDialog
- Prevents accidental data deletion
- Clear warning messages
- Department deletion with process count validation
- Process deletion with full confirmation flow

#### Data Model Enhancements
- **Organization Model** expanded to 14 fields:
  - Added: `slug` (UNIQUE), `logo`, `address`, `city`, `country`
  - Added: `phone`, `email`, `website`, `dpoEmail`, `industry`
  - Added: `employeeCount`, `description`, `updatedAt`

- **Department Model** enhanced:
  - Added: `description`, `updatedAt`

#### API Endpoints
- `POST /api/uploads` - Logo file upload with validation
- `GET /api/organization` - Fetch current organization data
- `GET /api/ai/status` - AI system status indicator

#### Server Actions
- `updateOrganization()` - Update organization details with validation
- `getOrganization()` - Fetch organization with departments
- `createDepartment()` - Create new department
- `updateDepartment()` - Edit department details
- `deleteDepartment()` - Delete department with validation
- `getDepartmentsByOrg()` - List departments with process counts
- `createProcess()` - Create process with auto-risk calculation
- `updateProcess()` - Update process with auto-risk calculation
- `deleteProcess()` - Delete process with confirmation
- `assessProcessRisk()` - Assess risk via SILIP/fallback

#### UI Components
- **Shadcn/UI Components**: 20+ pre-built components
  - Button, Input, Label, Textarea, Card, Badge
  - Dialog, AlertDialog, Separator, Select
  - Tabs, Dropdown Menu, Icons
- **Custom Components**:
  - `organization-form.tsx` - Organization settings form
  - `department-management.tsx` - Department CRUD interface
  - `delete-process-button.tsx` - Delete confirmation wrapper
  - `delete-confirmation-dialog.tsx` - Reusable delete dialog
  - `ai-status.tsx` - AI system status badge
  - `sidebar-header.tsx` - Dynamic branding header

#### Layout & Pages
- `app/admin/layout.tsx` - Admin section layout
- `app/admin/page.tsx` - Admin dashboard
- `app/admin/settings/page.tsx` - Organization settings
- `app/admin/departments/page.tsx` - Department management
- `app/(main)/layout.tsx` - Main app layout with sidebar
- `app/dashboard/page.tsx` - Main dashboard

#### Database & ORM
- PostgreSQL 15 database
- Prisma 5.8.0 ORM
- Schema migrations for all model updates
- Seed script with sample organization and data
- Database migrations tracked in `prisma/migrations`

#### Development Features
- TypeScript 5 with strict mode
- React Hook Form 7.50.1 for form handling
- Zod 3.22.4 for schema validation
- React 18.2.0 with server/client components
- Next.js 16.1.6 with App Router
- Tailwind CSS 3.3.0 with slate theme
- TanStack Table 8.11.6 for data management
- Radix UI primitives for accessible components
- Lucide React icons (300+ icons)

#### Validation & Error Handling
- Comprehensive Zod schemas for all forms
- Server-side validation for all operations
- Client-side error display in forms
- Success/error toast messages
- Loading states during operations
- Form field-level error messages

#### File Management
- Logo upload to `public/uploads/` directory
- Timestamped filenames for uniqueness
- File type and size validation
- ImageMagick optimization support (graceful fallback)
- `.gitignore` configured for uploads directory

#### Styling & UX
- Professional slate color palette
- Responsive design (mobile, tablet, desktop)
- Consistent spacing and typography
- Loading skeletons for async operations
- Disabled states during operations
- Hover effects and transitions
- Modal dialogs for forms
- Inline error messages

#### Documentation
- Comprehensive README.md
- SILIP API integration documentation
- Risk assessment algorithm documentation
- Database setup instructions
- Troubleshooting guide
- Development setup guide

### Technical Stack

**Frontend:**
- Next.js 16.1.6 (App Router)
- React 18.2.0
- TypeScript 5
- Tailwind CSS 3.3.0
- Shadcn/UI Components
- React Hook Form 7.50.1
- Zod 3.22.4
- TanStack React Table 8.11.6
- Lucide React Icons
- Radix UI Primitives

**Backend:**
- Next.js Server Actions
- Node.js
- Express-style routing

**Database:**
- PostgreSQL 15
- Prisma 5.8.0 ORM

**AI/ML:**
- SILIP API (https://silip.sanchez.ph)
- Rule-based fallback algorithm

**Development:**
- TypeScript strict mode
- ESLint for code quality
- Automatic code generation
- Hot module reloading

### Project Structure

```
tanod/
├── app/                          # Next.js app directory
│   ├── admin/                    # Admin pages
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── settings/page.tsx
│   │   └── departments/page.tsx
│   ├── api/                      # API routes
│   │   ├── uploads/route.ts
│   │   ├── organization/route.ts
│   │   └── ai/status/route.ts
│   ├── dashboard/page.tsx        # Main dashboard
│   ├── ropa/                     # ROPA pages
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home/redirect
├── components/                   # React components
│   ├── ui/                       # Shadcn/UI components
│   ├── organization-form.tsx
│   ├── department-management.tsx
│   ├── sidebar.tsx
│   ├── sidebar-header.tsx
│   ├── ai-status.tsx
│   └── ...
├── actions/                      # Server actions
│   ├── ropa.ts
│   └── admin.ts
├── lib/                          # Utilities
│   ├── db.ts
│   ├── ai.ts
│   ├── riskCalculator.ts
│   ├── schemas.ts
│   └── utils.ts
├── prisma/                       # Database
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/                       # Static assets
│   └── uploads/                  # User-uploaded logos
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── .env.example
└── README.md
```

### Key Features Implemented

✅ **ROPA Management** - Complete process management with 4-step wizard
✅ **AI Risk Assessment** - SILIP-powered automatic risk scoring
✅ **Organization Administration** - Full company setup without hardcoding
✅ **Department Management** - Organize processes by department
✅ **Logo Upload** - Branded sidebar with company logo
✅ **Delete Confirmation** - Safe deletion with confirmation dialogs
✅ **Form Validation** - Comprehensive client & server validation
✅ **Data Filtering & Sorting** - TanStack Table integration
✅ **Responsive Design** - Works on all device sizes
✅ **Real-time AI Status** - Shows AI system availability

### Known Limitations

- ImageMagick optimization is optional (gracefully falls back)
- Single-organization system (designed for DPO per installation)
- Logo size limited to 5MB
- No user authentication (Phase 2 feature)
- No PDF report generation (Phase 3 feature)
- No breach monitoring dashboard (Phase 3 feature)

### Upcoming Features (Not Yet Implemented)

- User authentication and multi-tenancy
- PDF ROPA report generation
- Breach monitor dashboard
- Risk assessment reports
- Data protection impact assessment (DPIA) module
- Data subject rights management
- Email notifications
- API documentation
- Mobile app version

### Installation & Setup

See [README.md](README.md) for complete setup instructions.

### Contributors

- Development Team

### License

MIT License - See LICENSE file for details

---

**Status:** ✅ STABLE - Phase 1 ROPA Module Complete
**Version:** 0.1.0
**Release Date:** February 4, 2026
