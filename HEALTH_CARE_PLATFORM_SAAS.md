# ClinicOS — Multi-Tenant Healthcare SaaS Platform
## Complete Product Architecture Document

**Version:** 1.2.0
**Date:** 2026-06-20
**Status:** Architecture Draft

> **v1.1 Changes:** Added CRM (internal), Marketing, Website Builder, and AI Receptionist modules. Removed deferred enterprise features: Insurance/Claims, HL7/FHIR, SAML, DICOM Viewer, Telehealth Recording, Wearables, Clinical Trials.
> **v1.2 Changes:** Replaced enterprise-grade infrastructure (Kafka, Kubernetes, Spring Boot, Redshift, Datadog) with a lean MVP stack (React, Node.js/Express, Supabase, BullMQ, Vercel/Railway). Adopted Modular Monolith over Microservices. Budget constraint: solo developer, self-funded.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [User Personas](#2-user-personas)
3. [Tenant Architecture](#3-tenant-architecture)
4. [User Roles](#4-user-roles)
5. [Feature Matrix](#5-feature-matrix)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Module Breakdown](#8-module-breakdown)
9. [Database Domain Model](#9-database-domain-model)
10. [Permission Matrix](#10-permission-matrix)
11. [API Domains](#11-api-domains)
12. [Event Flow](#12-event-flow)
13. [Notification Architecture](#13-notification-architecture)
14. [Billing Architecture](#14-billing-architecture)
15. [AI Features](#15-ai-features)
16. [Reporting Requirements](#16-reporting-requirements)
17. [Security Requirements](#17-security-requirements)
18. [Future Expansion Opportunities](#18-future-expansion-opportunities)

---

## 1. Product Vision

### Mission Statement
> Empower every clinic — from a solo veterinarian to a 50-branch hospital chain — to deliver exceptional care through intelligent, affordable, and compliant practice management software.

### Vision
ClinicOS becomes the operating system of choice for 10,000+ clinics globally by 2028, managing 1M+ patient records, processing $500M+ in billing annually, and reducing administrative overhead by 60% through AI-powered automation.

### Core Value Propositions

| Pillar | Description |
|--------|-------------|
| **Universal** | Single platform for human & veterinary clinics, solo practitioners & enterprise chains |
| **Intelligent** | AI-first: diagnosis assist, scheduling optimization, AI receptionist |
| **Compliant** | HIPAA, GDPR, and regional healthcare regulation built-in |
| **Scalable** | Multi-tenant SaaS from Day 1 — one clinic or one thousand |
| **Growth-Driven** | Built-in CRM, marketing tools, and website builder to help clinics grow |

### Target Markets

```
Primary Markets:
├── Human Healthcare
│   ├── General Practice / Family Medicine
│   ├── Specialty Clinics (Dental, Dermatology, Orthopedics, etc.)
│   ├── Urgent Care Centers
│   └── Multi-specialty Hospital Outpatient Departments
│
└── Veterinary Healthcare
    ├── Small Animal (Companion Animal Clinics)
    ├── Large Animal / Equine
    ├── Mixed Practice
    └── Specialist Veterinary Hospitals

Secondary Markets:
├── Physiotherapy & Rehabilitation Centers
├── Mental Health & Counseling Centers
├── Diagnostic Labs (standalone & attached)
└── Pharmacy Chains with clinic integration
```

---

## 2. User Personas

### Persona 1 — Solo Practitioner (Dr. Aisha)
- **Profile:** General physician, 1 clinic, 30–50 patients/day
- **Pain Points:** Paper-based records, no-show patients, manual billing, 2hrs/day on admin
- **Goals:** Go digital in <1 week, reduce no-shows by 40%, get paid faster
- **Plan:** Starter / Professional
- **Key Features:** Appointment booking, EMR, invoicing, WhatsApp reminders

### Persona 2 — Clinic Owner / Administrator (Rajesh)
- **Profile:** Owns 3 dental clinics, manages 12 staff, moderate tech-savvy
- **Pain Points:** No consolidated view, staff scheduling nightmares, revenue leakage
- **Goals:** Centralized dashboard, staff accountability, branch performance comparison
- **Plan:** Business (Multi-Branch)
- **Key Features:** Multi-branch dashboard, staff attendance, inter-branch reporting

### Persona 3 — Enterprise Chain CTO (Sarah)
- **Profile:** VP Operations at a 50-clinic chain, technical background
- **Pain Points:** Legacy EMR lock-in, no API access, compliance reporting is manual
- **Goals:** API integration, custom workflows, white-labeling, multi-branch visibility
- **Plan:** Enterprise
- **Key Features:** REST API, custom roles, audit logs, white-label, multi-branch dashboard

### Persona 3b — ClinicOS Sales Rep (Internal) (Arjun)
- **Profile:** ClinicOS BDR/AE, manages a pipeline of 200+ clinic leads
- **Pain Points:** Tracking demos, follow-ups, and proposals across spreadsheets
- **Goals:** See full lead-to-conversion pipeline, log calls, schedule demos, track proposals
- **Access:** Internal CRM (SYSTEM_ADMIN / SALES_REP roles — not visible to clinic tenants)

### Persona 4 — Veterinarian (Dr. Marcus)
- **Profile:** Mixed-practice vet, 1 clinic, treats dogs/cats/horses
- **Pain Points:** Human EMR doesn't fit vet workflows (species, breed, weight-based dosing)
- **Goals:** Species-aware records, vaccine schedules, client portal for pet parents
- **Plan:** Professional (Veterinary)
- **Key Features:** Vet-specific EMR, vaccination tracking, weight-based prescriptions

### Persona 5 — Receptionist / Front Desk (Priya)
- **Profile:** Non-clinical staff, handles scheduling & billing
- **Pain Points:** Double-booking, insurance verification, payment follow-ups
- **Goals:** Easy appointment management, automated reminders, quick invoice generation
- **Features Used:** Appointment calendar, patient check-in, billing, SMS/WhatsApp

### Persona 6 — Patient / Pet Owner (Michael)
- **Profile:** Patient accessing his own records and appointments
- **Pain Points:** Calling clinic to book, lost physical prescriptions, no test result access
- **Goals:** Self-book appointments, view prescriptions, download reports
- **Features Used:** Patient Portal (mobile-first)

---

## 3. Tenant Architecture

### Tenancy Model: Hybrid Multi-Tenant

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SAAS PLATFORM LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │  Shared DB  │  │  Shared DB  │  │    Dedicated DB (Enterprise) │ │
│  │  Schema per │  │  Schema per │  │    Full isolation, custom    │ │
│  │  Tenant     │  │  Tenant     │  │    domain, own DB instance   │ │
│  │  (Starter)  │  │  (Business) │  │    (Enterprise/Compliance)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Tenant Hierarchy

```
Organization (Tenant Root)
├── Metadata: org_id, slug, plan, region, created_at
├── Subscription: plan_id, billing_cycle, seat_count
├── Configuration: timezone, currency, locale, clinic_type
│
├── Branch 1 (Clinic Location)
│   ├── branch_id, name, address, phone
│   ├── Operating Hours
│   ├── Services Offered
│   └── Staff Assignments
│
├── Branch 2 ... Branch N
│
└── Shared Resources
    ├── Patient Master Registry (org-level)
    ├── Inventory (per-branch or shared)
    ├── Billing Configuration
    └── Roles & Permissions
```

### Tenant Isolation Guarantees

| Layer | Isolation Mechanism |
|-------|---------------------|
| **Database** | Row-level `tenant_id` on all tables + PostgreSQL RLS policies |
| **API** | JWT contains `tenant_id` + `branch_id`; enforced at middleware |
| **Storage** | S3 prefix: `/{tenant_id}/{branch_id}/` with bucket policies |
| **Cache** | Redis key prefix: `tenant:{tenant_id}:` |
| **Search** | Elasticsearch index per tenant (Enterprise) or filtered index (Starter/Pro) |
| **Audit** | All mutations logged with `tenant_id`, `user_id`, `ip`, `timestamp` |

### Clinic Type Differentiation

```
clinic_type ENUM:
├── HUMAN_GENERAL          → Standard EMR, human anatomy, ICD-10/11
├── HUMAN_SPECIALTY        → Specialty modules (Dental, Ortho, Derma, etc.)
├── HUMAN_MENTAL_HEALTH    → SOAP notes, therapy session tracking
├── VETERINARY_SMALL       → Species: dog/cat/rabbit; weight dosing
├── VETERINARY_LARGE       → Species: horse/cattle; farm management
├── VETERINARY_MIXED       → All species, flexible modules
└── PHYSIOTHERAPY          → Session-based, exercise protocols
```

---

## 4. User Roles

### Role Hierarchy

```
SYSTEM_ADMIN          (Platform-level — ClinicOS team only; accesses CRM + all tenants)
│
├── SALES_REP         (Internal — CRM access only; no clinic tenant data)
├── SALES_MANAGER     (Internal — CRM + marketing analytics; no clinic tenant data)
│
└── ORG_OWNER         (Tenant root — full org access)
    ├── ORG_ADMIN     (Manages staff, billing, settings across branches)
    │
    ├── BRANCH_MANAGER    (Single branch — scheduling, staff, reports)
    │
    ├── DOCTOR / VET       (Clinical staff — EMR read/write for own patients)
    ├── SPECIALIST         (Read-only across branches, write own specialty)
    ├── NURSE / TECHNICIAN (Vitals, notes, no prescriptions)
    ├── RECEPTIONIST       (Scheduling, check-in, billing — no clinical)
    ├── BILLING_STAFF      (Invoice, payments — no clinical)
    ├── PHARMACIST         (Prescription dispensing, inventory)
    ├── LAB_TECHNICIAN     (Lab orders, results entry)
    │
    └── PATIENT            (Self-service portal — own records only)
        └── PET_OWNER      (Vet-specific patient role)
```

> **Internal roles** (SYSTEM_ADMIN, SALES_REP, SALES_MANAGER) exist in the ClinicOS platform database outside any tenant schema. They have zero access to clinic patient data — only CRM lead/pipeline data and aggregate (anonymized) SaaS metrics.

### Role Configuration Rules
- An `ORG_OWNER` can create custom roles derived from base roles
- Roles are scoped: `org-level`, `branch-level`, or `patient-level`
- A user can hold multiple roles across different branches
- Time-bounded role assignment supported (e.g., locum doctor for 2 weeks)

---

## 5. Feature Matrix

| Feature | Starter | Professional | Business | Enterprise |
|---------|:-------:|:------------:|:--------:|:----------:|
| **Clinics/Branches** | 1 | 1 | Up to 10 | Unlimited |
| **Providers (Doctors)** | 2 | 5 | 20 | Unlimited |
| **Patients/Month** | 500 | 2,000 | 10,000 | Unlimited |
| **Storage** | 5 GB | 20 GB | 100 GB | Custom |
| **Appointment Booking** | ✅ | ✅ | ✅ | ✅ |
| **Online Self-Booking** | ❌ | ✅ | ✅ | ✅ |
| **EMR / Medical Records** | ✅ | ✅ | ✅ | ✅ |
| **e-Prescriptions** | ✅ | ✅ | ✅ | ✅ |
| **Lab Order & Results** | ❌ | ✅ | ✅ | ✅ |
| **Invoicing & Payments** | Basic | ✅ | ✅ | ✅ |
| **Inventory Management** | ❌ | ✅ | ✅ | ✅ |
| **Multi-Branch Dashboard** | ❌ | ❌ | ✅ | ✅ |
| **Patient Portal** | ❌ | ✅ | ✅ | ✅ |
| **WhatsApp / SMS Reminders** | ❌ | ✅ | ✅ | ✅ |
| **Telehealth / Video** | ❌ | ❌ | ✅ | ✅ |
| **AI Receptionist (Chat)** | ❌ | ✅ | ✅ | ✅ |
| **AI Diagnosis Assist** | ❌ | ❌ | ✅ | ✅ |
| **AI SOAP Note Generator** | ❌ | ❌ | ✅ | ✅ |
| **Website Builder** | ❌ | ✅ | ✅ | ✅ |
| **Online Booking Widget** | ❌ | ✅ | ✅ | ✅ |
| **Marketing Campaigns** | ❌ | ❌ | ✅ | ✅ |
| **Custom Reports** | ❌ | ❌ | ✅ | ✅ |
| **REST API Access** | ❌ | ❌ | ❌ | ✅ |
| **White-Label** | ❌ | ❌ | ❌ | ✅ |
| **Dedicated DB** | ❌ | ❌ | ❌ | ✅ |
| **SLA (Uptime)** | 99% | 99.5% | 99.9% | 99.95% |
| **Support** | Email | Email+Chat | Priority | Dedicated CSM |

**Veterinary Add-on** (applies to Pro, Business, Enterprise):
- Species/breed management
- Weight-based dosing calculator
- Vaccination schedule tracker
- Parasite prevention protocols
- Pet owner portal

---

## 6. Functional Requirements

### FR-01: Appointment Management
- **FR-01.1** Online booking widget embeddable on clinic website
- **FR-01.2** Real-time slot availability with provider-specific calendars
- **FR-01.3** Recurring appointment support (weekly physio, monthly chronic care)
- **FR-01.4** Waitlist management with auto-fill on cancellation
- **FR-01.5** Multi-provider, multi-resource booking (room + equipment + doctor)
- **FR-01.6** Appointment types with custom durations and buffer times
- **FR-01.7** Check-in kiosk support (QR code or token-based)
- **FR-01.8** Cancellation and rescheduling with configurable policies
- **FR-01.9** No-show tracking and automated follow-up

### FR-02: Electronic Medical Records (EMR)
- **FR-02.1** SOAP (Subjective, Objective, Assessment, Plan) structured notes
- **FR-02.2** Chief complaint, history of present illness, past medical/surgical history
- **FR-02.3** Vital signs tracking with trend visualization
- **FR-02.4** Chronic disease management with care plan templates
- **FR-02.5** Allergy and adverse reaction registry with drug-interaction alerts
- **FR-02.6** ICD-10 / ICD-11 diagnosis coding with search
- **FR-02.7** Surgical procedure documentation with CPT codes
- **FR-02.8** Document attachments (images, PDFs)
- **FR-02.9** EMR versioning — every edit timestamped and attributed
- **FR-02.10** Vet-specific: species, breed, weight, reproductive status, microchip ID

### FR-03: Prescription Management
- **FR-03.1** Digital prescription with doctor digital signature
- **FR-03.2** Drug database integration (OpenFDA / local formulary)
- **FR-03.3** Drug-drug interaction and allergy alerts
- **FR-03.4** Prescription templates for common conditions
- **FR-03.5** Controlled substance prescription with DEA compliance flags
- **FR-03.6** Weight-based dosing calculator (Pediatric + Veterinary)
- **FR-03.7** QR-code-enabled pharmacy dispensing
- **FR-03.8** Prescription refill requests from patient portal

### FR-04: Lab & Diagnostics
- **FR-04.1** Lab order creation with test name and category
- **FR-04.2** Lab result ingestion (manual entry; file upload for external lab PDFs)
- **FR-04.3** Critical value alerts with mandatory doctor acknowledgment
- **FR-04.4** Result trend graphs across visits
- **FR-04.5** Pathology / histology report management (PDF upload + structured fields)
- **FR-04.6** In-house lab panel configuration (clinic-defined test catalog)

### FR-05: Billing & Revenue Cycle
- **FR-05.1** Fee schedule management per provider / service / branch
- **FR-05.2** Invoice generation with itemized services
- **FR-05.3** Multi-currency and multi-tax support (GST, VAT, HST)
- **FR-05.4** Payment gateway integration (Stripe, Razorpay, PayPal)
- **FR-05.5** Outstanding balance tracking and payment reminders
- **FR-05.6** Credit notes, refunds, and write-offs
- **FR-05.7** End-of-day financial reconciliation report

### FR-06: Patient Portal
- **FR-06.1** Appointment booking and management
- **FR-06.2** Medical history and prescription view
- **FR-06.3** Lab result access (with configurable release rules)
- **FR-06.4** Secure messaging with provider
- **FR-06.5** Bill payment and invoice download
- **FR-06.6** Consent form digital signing
- **FR-06.7** Health summary PDF export
- **FR-06.8** Mobile-first PWA + native app wrappers (iOS/Android)

### FR-07: Inventory & Pharmacy
- **FR-07.1** Drug and consumable stock management
- **FR-07.2** Expiry date tracking with FIFO dispensing
- **FR-07.3** Reorder alerts and purchase order generation
- **FR-07.4** Batch/lot number tracking for recalls
- **FR-07.5** Wastage tracking and adjustment
- **FR-07.6** Supplier management with purchase history
- **FR-07.7** Dispensing linked to prescriptions (auto stock deduction)

### FR-08: Staff & HR
- **FR-08.1** Staff profile with qualifications, license numbers, and expiry tracking
- **FR-08.2** Shift scheduling with conflict detection
- **FR-08.3** Leave management and approval workflow
- **FR-08.4** Attendance tracking (biometric / QR / manual)
- **FR-08.5** Commission / incentive calculation per doctor
- **FR-08.6** Performance metrics (patients seen, revenue generated, no-show rate)

### FR-09: Telehealth
- **FR-09.1** Video consultation with WebRTC (no third-party dependency)
- **FR-09.2** Waiting room queue with patient status
- **FR-09.3** Screen sharing for reviewing reports during consultation
- **FR-09.4** In-call prescription and note creation
- **FR-09.5** Prescription generated post-teleconsult with telemedicine compliance flag

### FR-10: Multi-Branch Management
- **FR-10.1** Consolidated org-level dashboard
- **FR-10.2** Patient transfer between branches (with record portability)
- **FR-10.3** Centralized inventory with branch allocation
- **FR-10.4** Cross-branch doctor scheduling (visiting consultants)
- **FR-10.5** Branch-level P&L and performance comparison
- **FR-10.6** Centralized drug formulary with branch overrides

### FR-11: CRM — Internal Sales (ClinicOS Admins Only)
> **Scope:** Accessible exclusively to SYSTEM_ADMIN and SALES_REP/SALES_MANAGER roles. Not visible to any clinic tenant. Supports ClinicOS's own go-to-market motion.

- **FR-11.1** Lead capture: manual entry, web form submissions, referral tracking, campaign source attribution
- **FR-11.2** Lead profiles: clinic name, type (human/vet), size, location, decision-maker contact, source
- **FR-11.3** Lead status pipeline: `New → Contacted → Demo Scheduled → Demo Done → Proposal Sent → Negotiation → Won / Lost`
- **FR-11.4** Opportunity management: expected ARR, close date, probability score, assigned sales rep
- **FR-11.5** Follow-up tasks: create tasks with due dates, reminders, and outcome logging
- **FR-11.6** Meeting logging: log call/meeting notes, link to opportunity, next action
- **FR-11.7** Demo tracking: schedule demo, link to calendar, log demo feedback, track demo-to-trial conversion rate
- **FR-11.8** Proposal tracking: upload proposal PDF, track sent date, viewed date (email pixel), expiry
- **FR-11.9** Conversion workflow: on Won → auto-provision tenant, send welcome email, assign onboarding CSM
- **FR-11.10** Pipeline dashboard: funnel view (stage counts + ARR), conversion rates, avg days per stage
- **FR-11.11** Sales rep performance: leads worked, demos done, deals won, ARR generated per rep
- **FR-11.12** Lost reason tracking: mandatory dropdown (price/feature/competitor/timing/no response) + notes

### FR-12: Marketing Module
> **Scope:** Available to clinic Org Admins (Business/Enterprise). Used to engage their own patient base — not for ClinicOS marketing.

- **FR-12.1** Email campaign builder: drag-and-drop template editor, subject line, sender name, schedule/send
- **FR-12.2** WhatsApp campaign builder: template message composer, variable fields (patient name, appointment date)
- **FR-12.3** Campaign audience builder: filter patients by last visit date, diagnosis category, age group, location
- **FR-12.4** Template library: pre-built campaign templates (appointment reminders, health tips, seasonal offers, reactivation)
- **FR-12.5** Campaign scheduling: one-time send, recurring (weekly health tip), drip sequence
- **FR-12.6** WhatsApp opt-in management: capture patient opt-in, honor opt-outs, maintain compliance log
- **FR-12.7** Campaign analytics: sent / delivered / opened / clicked / bounced / unsubscribed per campaign
- **FR-12.8** A/B testing: split send on subject lines or message variants with winner auto-selection
- **FR-12.9** Automated campaigns: trigger-based sends (birthday greetings, post-visit follow-up, 6-month recall, no-show re-engagement)
- **FR-12.10** Campaign credits: WhatsApp/SMS sends tracked as credits against plan allowance

### FR-13: Public Website Builder
> **Scope:** Every clinic on Professional plan and above gets a hosted website at `{clinic-slug}.clinicos.site` or their own custom domain.

- **FR-13.1** Clinic landing page: name, logo, hero image, about section, services list, contact info, map embed
- **FR-13.2** Doctor / provider profiles: photo, qualifications, specialization, languages spoken, consultation fee
- **FR-13.3** Online booking widget: embeds on any page; real-time slot availability; patient fills name + phone + reason
- **FR-13.4** SEO pages: per-service pages (e.g., `/dental-cleaning`, `/dog-vaccination`) with meta title, description, OG tags
- **FR-13.5** Blog / health articles: simple rich-text editor, category tags, publish/draft workflow
- **FR-13.6** Gallery: clinic photos, team photos
- **FR-13.7** Testimonials: collect and display patient reviews (optional)
- **FR-13.8** Custom domain support: point `www.dranilclinic.com` to ClinicOS-hosted site (DNS CNAME)
- **FR-13.9** Mobile-responsive: all pages auto-optimized for mobile
- **FR-13.10** Analytics integration: Google Analytics / Meta Pixel embed via tag field
- **FR-13.11** WhatsApp Click-to-Chat button: sticky button on all pages

### FR-14: AI Receptionist
> **Scope:** A conversational AI chat widget embedded on the clinic's website (Website Builder) and optionally on WhatsApp. Available on Professional plan and above. Powered by Claude claude-sonnet-4-6.

- **FR-14.1** Chat widget: floating chat bubble on clinic website; opens as a conversation panel
- **FR-14.2** Book appointment: AI collects patient name, phone, preferred doctor, and desired time → checks live availability → confirms booking
- **FR-14.3** Reschedule appointment: patient provides booking reference or phone number → AI shows existing appointment → offers available alternatives → confirms reschedule
- **FR-14.4** Cancel appointment: patient requests cancellation → AI confirms identity → cancels and notifies clinic staff
- **FR-14.5** Clinic information: answers questions about clinic hours, address, services offered, parking
- **FR-14.6** Doctor availability: tells patient which doctors are available today / this week
- **FR-14.7** FAQ responses: clinic configures a knowledge base (hours, pricing, specializations) → AI answers from it
- **FR-14.8** Handoff to human: if AI cannot resolve query → offers to send message to front desk; creates a task for receptionist
- **FR-14.9** WhatsApp integration: same AI Receptionist flows available on WhatsApp Business number
- **FR-14.10** Multilingual: detects patient language, responds in same language (supports 10+ languages)
- **FR-14.11** Conversation logs: all AI chat sessions stored per patient; searchable by clinic staff
- **FR-14.12** Customization: clinic sets AI persona name (e.g., "Dr. Anil's Assistant"), greeting message, and knowledge base
- **FR-14.13** Guardrails: AI never gives medical advice; redirects clinical questions to "please consult your doctor"

---

## 7. Non-Functional Requirements

> **Budget reality:** Solo developer, self-funded. NFRs are split into **MVP targets** (what you ship) and **Scale targets** (what you design toward but don't build yet).

### 7.1 Performance
| Metric | MVP Target | Scale Target (later) |
|--------|-----------|----------------------|
| API response time (p95) | < 500ms | < 150ms |
| Page load (LCP) | < 3s | < 2s |
| Appointment booking flow | < 5s | < 3s |
| Report generation | < 10s (synchronous) | Async + notify |
| Concurrent users | 50–200 (Railway handles this) | 10,000+ |

### 7.2 Availability & Reliability
| Metric | MVP Target | Notes |
|--------|-----------|-------|
| Uptime | ~99.5% | Railway/Render managed; acceptable for early clinics |
| Backup frequency | Daily (Supabase automatic) | Supabase handles this for free |
| Backup retention | 7 days (free tier), 30 days (paid) | Upgrade when paying customers arrive |
| Medical record retention | 7 years | Archive to Supabase Storage; never delete |
| Recovery | Manual restore from Supabase backup | Acceptable at MVP stage |

### 7.3 Scalability — Modular Monolith First
```
MVP Approach: Single Node.js/Express app, well-structured by domain modules.
Extract into services ONLY when a specific module becomes a bottleneck.

Extraction signals (not until you hit these):
  - DB connections exhausted          → Add read replica
  - Background jobs slow the API      → Extract job worker to separate process
  - Notification volume spikes        → Extract notification worker
  - AI calls adding latency           → Extract AI service

Railway/Render will auto-scale the single app to handle 500+ concurrent users
before you need to split anything.
```

### 7.4 Security & Compliance
- HIPAA-aligned data handling (BAA with Supabase, Resend)
- GDPR basics: consent capture, data export on request, deletion flow
- All PHI fields encrypted at application level (AES-256-GCM)
- TLS enforced everywhere (Vercel + Railway handle this automatically)
- Row-Level Security (RLS) on all Supabase tables — tenant isolation for free

### 7.5 Usability
- Mobile-first responsive design (Tailwind breakpoints)
- English + 1–2 regional languages at launch (add more via i18n library)
- Works on low-end Android browsers (target clinics in emerging markets)

### 7.6 Maintainability
- Single repo (monorepo: `apps/web`, `apps/api`, `packages/shared`)
- Environment-based feature flags (simple `FEATURE_X=true` in `.env`)
- API versioned from day one (`/api/v1/`) — never skip this
- Deploy in minutes: `git push` → Vercel (frontend) + Railway (backend) auto-deploy

---

## 8. Module Breakdown

```
ClinicOS Platform
│
├── Core Platform
│   ├── MOD-01: Identity & Access Management (IAM)
│   ├── MOD-02: Tenant Provisioning & Lifecycle
│   ├── MOD-03: Subscription & Plan Management
│   └── MOD-04: Audit & Compliance Logger
│
├── Clinical Modules
│   ├── MOD-05: Appointment Management
│   ├── MOD-06: Patient Registry (Demographics + Master)
│   ├── MOD-07: Electronic Medical Records (EMR)
│   ├── MOD-08: Prescription Engine
│   ├── MOD-09: Lab & Diagnostics
│   └── MOD-10: Telehealth / Video Consult
│
├── Veterinary Extension
│   ├── MOD-11: Veterinary EMR (species-aware)
│   ├── MOD-12: Vaccination & Wellness Tracker
│   └── MOD-13: Pet Owner Portal
│
├── Operations Modules
│   ├── MOD-14: Inventory & Pharmacy
│   ├── MOD-15: Staff & HR Management
│   ├── MOD-16: Multi-Branch Management
│   └── MOD-17: Facility & Resource Management
│
├── Financial Modules
│   ├── MOD-18: Billing & Invoice Engine
│   ├── MOD-19: Payment Processing
│   └── MOD-20: Revenue Analytics
│
├── Patient Engagement
│   ├── MOD-21: Patient Portal (Web + Mobile)
│   ├── MOD-22: Notification Engine
│   └── MOD-23: Feedback & Reviews
│
├── [NEW] Growth & Marketing (Clinic-facing)
│   ├── MOD-24: Marketing Campaign Engine (Email + WhatsApp)
│   ├── MOD-25: Public Website Builder
│   └── MOD-26: AI Receptionist
│
├── [NEW] Internal CRM (ClinicOS staff only — zero tenant visibility)
│   ├── MOD-27: Lead & Opportunity Management
│   ├── MOD-28: Demo & Proposal Tracker
│   └── MOD-29: CRM Analytics & Pipeline Dashboard
│
├── AI & Intelligence
│   ├── MOD-30: AI Diagnosis Assistant
│   ├── MOD-31: SOAP Note Auto-Generator
│   ├── MOD-32: Scheduling Optimizer
│   └── MOD-33: Revenue Intelligence
│
├── Reporting & Analytics
│   ├── MOD-34: Operational Reports
│   ├── MOD-35: Financial Reports
│   ├── MOD-36: Clinical Analytics
│   └── MOD-37: Executive Dashboard
│
└── Integration Layer
    ├── MOD-38: REST API Gateway
    ├── MOD-39: Webhook Engine
    └── MOD-40: Third-Party Integrations (Labs, Payment Gateways)
```

---

## 9. Database Domain Model

### Core Entities

```sql
-- TENANT DOMAIN
organizations         (id, slug, name, clinic_type, plan_id, region, created_at)
branches              (id, org_id, name, address, timezone, is_active)
subscriptions         (id, org_id, plan_id, status, billing_cycle, seats, renews_at)

-- IDENTITY DOMAIN
users                 (id, org_id, email, phone, password_hash, mfa_secret, status)
user_profiles         (user_id, first_name, last_name, gender, date_of_birth, photo_url)
staff_profiles        (user_id, branch_id, designation, license_number, specialization)
roles                 (id, org_id, name, scope, is_system_role)
user_roles            (user_id, role_id, branch_id, valid_from, valid_until)
permissions           (id, resource, action, description)
role_permissions      (role_id, permission_id)

-- PATIENT DOMAIN
patients              (id, org_id, mrn, first_name, last_name, dob, gender, blood_group)
patient_contacts      (patient_id, type, value, is_primary, is_verified)
patient_addresses     (patient_id, type, line1, city, state, country, postal_code)
emergency_contacts    (patient_id, name, relationship, phone)
-- Veterinary extension
pets                  (id, org_id, owner_patient_id, name, species, breed, dob, microchip_id)

-- APPOINTMENT DOMAIN
providers             (id, branch_id, user_id, specialization, consultation_fee)
provider_schedules    (id, provider_id, branch_id, day_of_week, start_time, end_time)
service_types         (id, org_id, name, duration_min, fee, requires_provider)
appointments          (id, branch_id, patient_id, provider_id, service_type_id,
                       scheduled_at, status, type[in-person|telehealth], created_by)
appointment_slots     (id, provider_id, date, slot_time, is_booked, appointment_id)
waitlist              (id, branch_id, patient_id, service_type_id, requested_at, notified_at)

-- EMR DOMAIN
visits                (id, appointment_id, patient_id, provider_id, branch_id,
                       visit_date, chief_complaint, visit_type, status)
soap_notes            (id, visit_id, subjective, objective, assessment, plan, ai_generated)
vitals                (id, visit_id, weight_kg, height_cm, bmi, temp_c, bp_sys, bp_dia,
                       pulse, spo2, respiratory_rate, recorded_at)
diagnoses             (id, visit_id, icd_code, icd_description, type[primary|secondary], status)
procedures            (id, visit_id, cpt_code, description, performed_by, performed_at)
allergies             (id, patient_id, allergen, reaction, severity, recorded_by)
medical_history       (id, patient_id, condition, onset_date, status, notes)
documents             (id, org_id, patient_id, visit_id, type, file_url, file_size, uploaded_by)

-- PRESCRIPTION DOMAIN
prescriptions         (id, visit_id, patient_id, provider_id, issued_at, valid_until,
                       status, digital_signature, qr_code)
prescription_items    (id, prescription_id, drug_id, drug_name, dosage, frequency,
                       duration, instructions, quantity)
drugs                 (id, org_id, generic_name, brand_name, category, form, strength,
                       schedule[OTC|Rx|Controlled], is_active)

-- LAB DOMAIN
lab_orders            (id, visit_id, patient_id, ordered_by, ordered_at, status, priority)
lab_order_items       (id, lab_order_id, loinc_code, test_name, lab_id)
lab_results           (id, lab_order_item_id, value, unit, ref_range_low, ref_range_high,
                       interpretation[N|L|H|C], result_at, verified_by)
external_labs         (id, org_id, name, api_endpoint, credentials_ref, is_active)

-- BILLING DOMAIN
fee_schedules         (id, org_id, service_type_id, price, tax_rate, valid_from, valid_until)
invoices              (id, org_id, branch_id, patient_id, visit_id, invoice_number,
                       status, subtotal, tax, discount, total, due_date)
invoice_items         (id, invoice_id, description, quantity, unit_price, tax_rate, amount)
payments              (id, invoice_id, amount, method, gateway_ref, status, paid_at)

-- INVENTORY DOMAIN
inventory_items       (id, org_id, branch_id, drug_id, batch_number, expiry_date,
                       quantity, reorder_level, unit_cost)
inventory_transactions (id, inventory_item_id, type[IN|OUT|ADJUST], quantity,
                        reference_id, performed_by, transacted_at)
suppliers             (id, org_id, name, contact, payment_terms, is_active)
purchase_orders       (id, org_id, branch_id, supplier_id, status, ordered_at, total)

-- STAFF DOMAIN
staff_schedules       (id, user_id, branch_id, date, start_time, end_time, type[REGULAR|LOCUM])
leave_requests        (id, user_id, leave_type, from_date, to_date, status, approved_by)
attendance            (id, user_id, branch_id, date, check_in, check_out, method)

-- AUDIT DOMAIN
audit_logs            (id, tenant_id, branch_id, user_id, action, resource, resource_id,
                       old_value, new_value, ip_address, user_agent, created_at)

-- CRM DOMAIN (platform-level schema — no tenant_id; internal ClinicOS use only)
crm_leads             (id, clinic_name, clinic_type, size_estimate, city, country,
                       source[web|referral|campaign|outbound|event], status, assigned_to,
                       created_at)
crm_contacts          (id, lead_id, name, title, email, phone, is_decision_maker)
crm_opportunities     (id, lead_id, expected_arr, close_date, probability, stage,
                       assigned_to, lost_reason, notes)
crm_activities        (id, opportunity_id, type[call|email|meeting|demo|proposal],
                       subject, notes, outcome, scheduled_at, completed_at, created_by)
crm_demos             (id, opportunity_id, scheduled_at, demo_link, attendees,
                       feedback_score, feedback_notes, converted_to_trial)
crm_proposals         (id, opportunity_id, file_url, sent_at, viewed_at, expires_at,
                       status[draft|sent|viewed|accepted|declined])
crm_pipeline_stages   (id, name, order, expected_days, is_terminal)

-- MARKETING DOMAIN (per-tenant)
campaign_templates    (id, org_id, name, channel[email|whatsapp|sms], subject,
                       body_html, body_text, variables, category, created_by)
campaigns             (id, org_id, name, template_id, channel, audience_filter_json,
                       status[draft|scheduled|running|completed|paused],
                       scheduled_at, sent_at, created_by)
campaign_recipients   (id, campaign_id, patient_id, status[pending|sent|delivered|
                       opened|clicked|bounced|unsubscribed], sent_at, opened_at)
campaign_analytics    (id, campaign_id, total_recipients, sent, delivered, opened,
                       clicked, bounced, unsubscribed, computed_at)
marketing_opt_outs    (id, org_id, patient_id, channel, opted_out_at, reason)

-- WEBSITE BUILDER DOMAIN (per-tenant)
clinic_websites       (id, org_id, subdomain, custom_domain, theme, status[draft|live],
                       ga_tag, meta_pixel_tag, published_at)
website_pages         (id, website_id, slug, title, meta_title, meta_description,
                       content_json, page_type[home|service|blog|doctor|contact], is_published)
website_doctors       (id, website_id, provider_id, bio, photo_url, order, is_visible)
website_blogs         (id, website_id, title, slug, content_html, author_id,
                       published_at, tags)

-- AI RECEPTIONIST DOMAIN (per-tenant)
ai_receptionist_config (id, org_id, persona_name, greeting_message, whatsapp_enabled,
                        knowledge_base_json, fallback_contact, is_active)
ai_chat_sessions      (id, org_id, patient_id, channel[web|whatsapp], started_at,
                       ended_at, outcome[booked|rescheduled|cancelled|faq|handoff|unknown])
ai_chat_messages      (id, session_id, role[user|assistant], content, created_at)
```

### Key Relationships
```
Organization (1) ──── (N) Branches
Branch (1) ──────────── (N) Providers
Patient (1) ──────────── (N) Appointments
Appointment (1) ─────── (1) Visit
Visit (1) ───────────── (1) SoapNote
Visit (1) ───────────── (N) Diagnoses
Visit (1) ───────────── (1) Prescription
Prescription (1) ─────── (N) PrescriptionItems
Visit (1) ───────────── (N) LabOrders
LabOrder (1) ─────────── (N) LabOrderItems
LabOrderItem (1) ─────── (1) LabResult
Visit (1) ───────────── (1) Invoice
Invoice (1) ─────────── (N) Payments
```

---

## 10. Permission Matrix

### Resource × Action Matrix

| Resource | create | read_own | read_any | update_own | update_any | delete | approve |
|----------|:------:|:--------:|:--------:|:----------:|:----------:|:------:|:-------:|
| **Appointment** | RECEP,DOC | PATIENT | RECEP,DOC,MGR | RECEP | MGR | MGR | — |
| **EMR / Visit** | DOC,NURSE | PATIENT | DOC,MGR | DOC | DOC | — | — |
| **Prescription** | DOC | PATIENT | DOC,MGR | DOC | — | — | PHARMACIST |
| **Lab Order** | DOC | PATIENT | DOC,LAB,MGR | DOC | — | — | LAB_TECH |
| **Invoice** | BILLING | PATIENT | BILLING,MGR | BILLING | ORG_ADMIN | — | MGR |
| **Payment** | BILLING | PATIENT | BILLING,MGR | — | — | — | — |
| **Inventory** | PHARMACIST | PHARMACIST | MGR | PHARMACIST | — | ORG_ADMIN | MGR |
| **Staff Profile** | ORG_ADMIN | USER_SELF | MGR | USER_SELF | ORG_ADMIN | ORG_ADMIN | — |
| **Leave Request** | ALL_STAFF | USER_SELF | MGR | USER_SELF | — | USER_SELF | MGR |
| **Campaign** | ORG_ADMIN | — | ORG_ADMIN,MGR | ORG_ADMIN | ORG_ADMIN | ORG_ADMIN | MGR |
| **Website** | ORG_ADMIN | — | ORG_ADMIN,MGR | ORG_ADMIN | ORG_ADMIN | ORG_ADMIN | — |
| **AI Chat Session** | SYSTEM | PATIENT | RECEP,MGR | — | — | — | — |
| **Reports (Branch)** | — | — | MGR,DOCTOR | — | — | — | — |
| **Reports (Org)** | — | — | ORG_ADMIN | — | — | — | — |
| **Subscription** | — | ORG_OWNER | — | ORG_OWNER | — | ORG_OWNER | — |
| **Audit Logs** | — | — | ORG_ADMIN,SYS | — | — | — | — |
| **CRM Lead** | SYS,SALES_REP | — | SALES_REP,SALES_MGR | SALES_REP | SALES_MGR | SALES_MGR | — |
| **CRM Opportunity** | SYS,SALES_REP | — | SALES_REP,SALES_MGR | SALES_REP | SALES_MGR | SALES_MGR | SALES_MGR |

**Legend:** DOC=Doctor/Vet, NURSE=Nurse/Technician, RECEP=Receptionist, BILLING=Billing Staff, PHARMACIST=Pharmacist, LAB_TECH=Lab Technician, MGR=Branch Manager, ORG_ADMIN=Org Admin, ORG_OWNER=Org Owner, SYS=System Admin, SALES_REP=Internal Sales Rep, SALES_MGR=Internal Sales Manager

### Special Rules
- Patients can only read their OWN records (enforced at API + DB level)
- PHI (Protected Health Information) access is always audit-logged
- Deletion is soft-delete only; hard delete requires ORG_OWNER + 30-day grace period
- Cross-branch access requires explicit `cross_branch_access` permission flag

---

## 11. API Domains

### API Gateway Design
```
Base URL: https://api.clinicos.io/v1/
Auth: Bearer JWT (access token 15min TTL + refresh token 7-day TTL)
Rate Limits:
  - Starter: 100 req/min
  - Professional: 500 req/min
  - Business: 2,000 req/min
  - Enterprise: Custom (default 10,000 req/min)
```

### API Domain Map

```
/auth
  POST   /auth/login                    # Email/password login
  POST   /auth/logout                   # Token invalidation
  POST   /auth/refresh                  # Refresh access token
  POST   /auth/mfa/verify               # MFA challenge
  POST   /auth/sso/callback             # SAML/OAuth callback (Enterprise)
  POST   /auth/password/reset           # Password reset flow

/tenants
  POST   /tenants                       # Provision new tenant (SaaS registration)
  GET    /tenants/:id                   # Org details
  PUT    /tenants/:id                   # Update org settings
  GET    /tenants/:id/branches          # List branches
  POST   /tenants/:id/branches          # Add branch

/patients
  POST   /patients                      # Register patient
  GET    /patients/:id                  # Patient demographics
  PUT    /patients/:id                  # Update demographics
  GET    /patients/:id/timeline         # Full clinical timeline
  GET    /patients/:id/appointments     # Appointment history
  GET    /patients/:id/prescriptions    # Prescription history
  GET    /patients/:id/labs             # Lab results
  GET    /patients/:id/invoices         # Billing history

/appointments
  GET    /appointments                  # List (filterable by branch, provider, date)
  POST   /appointments                  # Book appointment
  GET    /appointments/:id              # Appointment details
  PUT    /appointments/:id              # Reschedule / update
  PATCH  /appointments/:id/status       # Check-in, complete, cancel, no-show
  GET    /appointments/availability     # Slot availability query

/visits
  POST   /visits                        # Create visit from appointment
  GET    /visits/:id                    # Visit details
  PUT    /visits/:id/soap               # Update SOAP notes
  POST   /visits/:id/vitals             # Record vitals
  POST   /visits/:id/diagnoses          # Add diagnosis
  POST   /visits/:id/procedures         # Add procedure

/prescriptions
  POST   /prescriptions                 # Issue prescription
  GET    /prescriptions/:id             # Prescription details
  PATCH  /prescriptions/:id/dispense    # Mark dispensed
  GET    /prescriptions/:id/qr          # QR code for dispensing

/labs
  POST   /labs/orders                   # Create lab order
  GET    /labs/orders/:id               # Order + results
  POST   /labs/orders/:id/results       # Enter/ingest results
  POST   /labs/orders/:id/critical-ack  # Acknowledge critical value

/billing
  POST   /billing/invoices              # Generate invoice
  GET    /billing/invoices/:id          # Invoice details
  POST   /billing/invoices/:id/payment  # Record payment

/inventory
  GET    /inventory                     # Stock list
  POST   /inventory/receive             # Receive stock
  POST   /inventory/dispense            # Dispense (linked to prescription)
  GET    /inventory/alerts              # Low stock / expiry alerts

/reports
  POST   /reports/generate              # Async report generation
  GET    /reports/:job_id/status        # Job status
  GET    /reports/:job_id/download      # Download when ready

/webhooks
  GET    /webhooks                      # List webhook endpoints
  POST   /webhooks                      # Register webhook
  DELETE /webhooks/:id                  # Remove webhook
  GET    /webhooks/:id/deliveries       # Delivery logs

/marketing
  GET    /marketing/campaigns           # List campaigns
  POST   /marketing/campaigns           # Create campaign
  GET    /marketing/campaigns/:id       # Campaign details + analytics
  POST   /marketing/campaigns/:id/send  # Trigger campaign send
  GET    /marketing/templates           # List templates
  POST   /marketing/templates           # Create template

/website
  GET    /website                       # Get clinic website config
  PUT    /website                       # Update website settings
  GET    /website/pages                 # List pages
  POST   /website/pages                 # Create page
  PUT    /website/pages/:id             # Update page content
  POST   /website/publish               # Publish to live

/ai-receptionist
  GET    /ai-receptionist/config        # Get config
  PUT    /ai-receptionist/config        # Update persona / knowledge base
  GET    /ai-receptionist/sessions      # List chat sessions
  GET    /ai-receptionist/sessions/:id  # Session transcript
  POST   /ai-receptionist/chat          # Public endpoint (widget sends messages here)

# Internal CRM API — requires SYSTEM_ADMIN / SALES_REP role; separate auth scope
/crm/leads
  GET    /crm/leads                     # List leads (filterable by status, rep, source)
  POST   /crm/leads                     # Create lead
  GET    /crm/leads/:id                 # Lead details + activity history
  PUT    /crm/leads/:id                 # Update lead

/crm/opportunities
  GET    /crm/opportunities             # Pipeline view
  POST   /crm/opportunities             # Create opportunity
  PATCH  /crm/opportunities/:id/stage   # Move stage
  POST   /crm/opportunities/:id/activities  # Log activity (call/email/meeting)

/crm/demos
  POST   /crm/demos                     # Schedule demo
  PATCH  /crm/demos/:id                 # Update demo outcome

/crm/proposals
  POST   /crm/proposals                 # Upload proposal
  PATCH  /crm/proposals/:id/status      # Update proposal status

/crm/analytics
  GET    /crm/analytics/pipeline        # Funnel + ARR breakdown
  GET    /crm/analytics/reps            # Per-rep performance
```

---

## 12. Event Flow

### Event Architecture — BullMQ (not Kafka)

```
Queue Engine: BullMQ (Redis-backed job queue — runs on same Railway instance)
Why BullMQ over Kafka:
  - Zero infra overhead — Redis is already in the stack
  - Handles 99% of clinic-scale event volumes with ease
  - Built-in retry, delay, priority, and dead-letter queues
  - Kafka is the right call at 100K events/sec — not at 100 clinics

Queue naming: {domain}:{action}   e.g.  notification:send, billing:generate-invoice
```

### Core Event Flows

```
[APPOINTMENT LIFECYCLE]
appointment.created
  → Trigger: Patient books / Staff books
  → Consumers: Notification Service, Calendar Sync, Analytics

appointment.confirmed
  → Consumers: Notification Service (send confirmation SMS/email/WhatsApp)

appointment.checkedin
  → Consumers: Queue Management, EMR (auto-create visit draft)

appointment.completed
  → Consumers: Billing (trigger invoice), Analytics, Follow-up Scheduler

appointment.cancelled
  → Consumers: Notification Service, Slot Release → Waitlist Checker

appointment.noshowed
  → Consumers: Analytics, CRM (flag for re-engagement), Billing (cancellation fee)

[CLINICAL LIFECYCLE]
visit.created
  → Consumers: EMR Module

visit.soap_updated
  → Consumers: AI SOAP Analyzer (quality check), Audit Logger

prescription.issued
  → Consumers: Notification Service (send to patient), Pharmacy Module, Analytics

prescription.dispensed
  → Consumers: Inventory (deduct stock), Analytics

laborder.created
  → Consumers: Lab Module, External Lab Adapter (if integrated), Notification

labresult.received
  → Consumers: Notification (to doctor), Critical Value Checker

labresult.critical_flagged
  → Consumers: Urgent Notification Service (SMS + App push to doctor immediately)
             → Requires doctor acknowledgment within 30min (escalation if unacked)

[BILLING LIFECYCLE]
invoice.generated
  → Consumers: Notification Service, Revenue Analytics

invoice.paid
  → Consumers: Accounting Module, Analytics, Subscription Service (if SaaS payment)

[SUBSCRIPTION LIFECYCLE]
subscription.trial_started
  → Consumers: Onboarding Email Sequence, CRM

subscription.trial_expiring (3 days before)
  → Consumers: Notification Service (upgrade prompt), CRM

subscription.upgraded
  → Consumers: Feature Flag Service (unlock features), Analytics, CRM

subscription.payment_failed
  → Consumers: Dunning Email Sequence, Feature Flag (grace period), CRM

subscription.cancelled
  → Consumers: Data Export Preparation, Offboarding Sequence, CRM

[INVENTORY EVENTS]
inventory.low_stock_alert
  → Consumers: Notification (to pharmacist/manager), Auto-PO Creator (if enabled)

inventory.expiry_approaching (30 / 7 / 1 day warnings)
  → Consumers: Notification Service

[AI EVENTS]
ai.soap_note_generated
  → Consumers: EMR Module (attach to visit), Quality Auditor

ai.diagnosis_suggested
  → Consumers: EMR UI (display as suggestion, not auto-fill)

ai.receptionist.appointment_booked
  → Consumers: Appointment Service (create booking), Notification Service

ai.receptionist.handoff_requested
  → Consumers: Notification Service (alert receptionist), Task Creator

[MARKETING EVENTS]
campaign.sent
  → Consumers: Analytics, Delivery Tracker

campaign.delivered / campaign.opened / campaign.clicked
  → Consumers: Campaign Analytics (increment counters)

campaign.bounced / campaign.unsubscribed
  → Consumers: Opt-Out Registry, Patient Contact Suppression

[CRM EVENTS — internal platform only]
crm.lead.created
  → Consumers: Sales Rep Notification, CRM Analytics

crm.demo.completed
  → Consumers: CRM Analytics, Auto follow-up task creator

crm.opportunity.won
  → Consumers: Tenant Provisioning Service (create org), Onboarding Email Sequence
```

### Event Payload Schema (Example)
```json
{
  "event_id": "evt_01H8XY...",
  "event_type": "appointment.completed",
  "tenant_id": "org_4f3k...",
  "branch_id": "brnch_7g2m...",
  "occurred_at": "2026-06-20T10:30:00Z",
  "schema_version": "1.0",
  "payload": {
    "appointment_id": "appt_9b1z...",
    "patient_id": "pat_3c7x...",
    "provider_id": "usr_5a2y...",
    "duration_minutes": 20,
    "service_type": "general_consultation"
  },
  "metadata": {
    "correlation_id": "req_abc123",
    "source_service": "appointment-service",
    "ip": "10.0.1.25"
  }
}
```

---

## 13. Notification Architecture

### Notification Channels
```
Channel Priority (configurable per org/user):
1. In-App (Real-time WebSocket push)
2. WhatsApp Business API (Highest patient engagement)
3. SMS (Twilio / local provider)
4. Email (SendGrid / SES)
5. Push Notification (Firebase FCM — mobile app)
6. Voice Call (for critical alerts — Twilio Programmable Voice)
```

### Notification Types & Rules

| Notification | Recipient | Channel | Timing | Configurable |
|-------------|-----------|---------|--------|--------------|
| Appointment Confirmation | Patient | WhatsApp/SMS/Email | Immediate | Yes |
| Appointment Reminder | Patient | WhatsApp/SMS | 24hr before + 2hr before | Yes |
| Check-in Ready | Patient | SMS/App | When queue called | Yes |
| Prescription Ready | Patient | WhatsApp/SMS | After dispensing | Yes |
| Lab Result Available | Patient | App/Email | When released by doctor | Yes |
| Critical Lab Value | Doctor | App Push + SMS | Immediate | No (mandatory) |
| Outstanding Invoice | Patient | Email/WhatsApp | 3/7/14 days overdue | Yes |
| Low Stock Alert | Pharmacist | App/Email | When below reorder level | Yes |
| License Expiry (Staff) | Staff + Admin | Email | 90/30/7 days before | Yes |
| Subscription Renewal | Org Owner | Email | 30/7/1 days before | Yes |
| Payment Failed | Org Owner | Email + SMS | Immediate | No |

### Notification Template Engine
- Templates stored per org with variable substitution
- Multi-language support (template per locale)
- Org can customize templates (within compliance limits)
- Unsubscribe / opt-out management with compliance logging
- Delivery status tracking: sent → delivered → read → failed

### Notification Service Architecture
```
BullMQ Queue: notification:send
    │
    ▼
Notification Worker (Node.js process — same Railway dyno)
    ├── Template Engine (Handlebars / simple string interpolation)
    ├── Channel Router (based on user preferences + channel availability)
    └── Channel Dispatchers
        ├── Email Dispatcher    → Resend API (simple, affordable, great DX)
        ├── WhatsApp Dispatcher → Meta WhatsApp Business API (Cloud API — free tier)
        ├── SMS Dispatcher      → Twilio (pay-per-SMS; start small)
        └── In-App Dispatcher  → Supabase Realtime (WebSocket, zero extra cost)
              │
              ▼
         delivery_logs table (Supabase PostgreSQL)
         Failed jobs → BullMQ retry with exponential backoff (3 attempts)

Cost note:
  Resend:    free up to 3,000 emails/month; $20/mo after
  WhatsApp:  Meta Cloud API free for first 1,000 conversations/month
  Twilio:    ~$0.0079/SMS — only add when clinics explicitly need it
```

---

## 14. Billing Architecture

### SaaS Subscription Billing

```
Plans & Pricing Strategy:
┌─────────────────────────────────────────────────────┐
│ Starter     │ $29/mo   │ 1 branch, 2 providers      │
│ Professional│ $79/mo   │ 1 branch, 5 providers       │
│ Business    │ $199/mo  │ 10 branches, 20 providers   │
│ Enterprise  │ Custom   │ Unlimited, dedicated infra  │
│ Veterinary+ │ +$29/mo  │ Add-on to Pro/Business/Ent  │
└─────────────────────────────────────────────────────┘

Billing Models:
- Flat rate (most plans)
- Per-seat overage billing (excess providers)
- Usage-based components: SMS/WhatsApp credits, AI tokens, storage overages
- Annual discount: 20% off (annual prepay)
```

### Subscription Billing Stack
```
Payment Gateway: Stripe (primary) / Razorpay (India)
Billing Engine: Stripe Billing + custom metering layer
Tax: Stripe Tax (US/EU) + custom for India (GST)

Subscription States:
  trialing → active → past_due → unpaid → cancelled
                              ↓
                         grace_period (7 days)
                              ↓
                         feature_restricted (read-only)
                              ↓
                         cancelled (data held 90 days)
```

### Dunning Management
```
Payment Failure Recovery Sequence:
  Day 0:  Payment fails → Email "payment issue" + In-app banner
  Day 3:  Retry charge → Email reminder
  Day 7:  Retry charge → Email + SMS to owner
  Day 10: Feature restriction (read-only mode, no new appointments)
  Day 14: Final retry → Email "account at risk"
  Day 17: Account suspended (data preserved)
  Day 30: Cancel and begin 90-day data retention countdown
```

### In-Clinic Revenue Cycle (Patient Billing)

```
Clinical Billing Flow:
Appointment Completed
    │
    ▼
Auto-Invoice Generation
  (services + procedures + drugs dispensed)
    │
    ▼
Send invoice to patient (WhatsApp / Email / Portal)
    │
    ▼
Payment Collection
    ├── POS (in-clinic card/cash)
    ├── Online (Patient Portal payment link)
    ├── QR Code payment
    └── Split payment / partial settlement
    │
    ▼
Outstanding balance → Automated reminders (3 / 7 / 14 days)
```

---

## 15. AI Features

### AI Architecture

```
AI Stack (MVP — minimal cost):
- LLM:        Anthropic Claude claude-sonnet-4-6 via API (pay per token — no infra)
- Embeddings: pgvector extension on Supabase (already in your DB — no extra service)
- AI serving: Direct API calls from Node.js backend (no Ray Serve, no GPU servers)

Cost estimate per clinic per month (moderate usage):
  SOAP note generation:  ~200 notes × ~1,500 tokens = $0.90
  AI Receptionist chats: ~500 conversations × ~800 tokens = $1.20
  Total AI cost/clinic:  ~$2–5/month → easily absorbed in plan pricing
```

### AI Feature Catalog

#### AI-01: SOAP Note Auto-Generator
- **Input:** Doctor's voice-to-text dictation or free text
- **Output:** Structured SOAP note with ICD code suggestions
- **Model:** Claude claude-sonnet-4-6 with clinical prompt engineering
- **Guardrails:** Doctor must review and approve before saving; AI content flagged
- **Compliance:** AI contribution logged in audit trail

#### AI-02: Diagnosis Assist
- **Input:** Chief complaint, symptoms, vitals, patient history
- **Output:** Differential diagnosis list with probability scores and evidence
- **Disclaimer:** "Clinical Decision Support — Not a replacement for clinical judgment"
- **Data Source:** SNOMED-CT, ClinicalBERT embeddings over patient history

#### AI-03: Drug Interaction Checker
- **Input:** Existing medications + new prescription
- **Output:** Interaction severity (None / Minor / Moderate / Severe / Contraindicated)
- **Data Source:** OpenFDA Drug Interaction API + DrugBank
- **Action:** Block Severe/Contraindicated by default; override requires reason

#### AI-04: Appointment Scheduling Optimizer
- **Input:** Historical appointment data, no-show patterns, provider availability
- **Output:** Optimal slot recommendations to minimize gaps and no-shows
- **Algorithm:** Gradient Boosting model on appointment outcome features

#### AI-05: Smart No-Show Predictor
- **Input:** Patient demographics, appointment history, weather, time-of-day, lead time
- **Output:** No-show probability score (0–100%)
- **Action:** High risk (>70%) → Auto-trigger reminder + double-book slot as buffer

#### AI-06: Revenue Intelligence
- **Input:** Billing data, service utilization, patient volume trends
- **Output:** Revenue leakage detection, recommended fee adjustments, slow-day identification
- **Delivery:** Weekly AI insights report to Org Admin

#### AI-07: Clinical Summary Generator
- **Input:** Full patient history across all visits
- **Output:** Concise clinical summary for referrals or emergency care
- **Use Case:** Referral letter generation, emergency room handover

#### AI-08: Inventory Demand Forecasting
- **Input:** 12-month dispensing history, seasonality, patient volume forecast
- **Output:** Recommended reorder quantities and optimal order timing
- **Algorithm:** Prophet (Facebook time-series forecasting)

#### AI-09: Vet-Specific AI
- **Weight-based dosing calculator:** Dose auto-calculation by species/weight
- **Breed-specific disease risk profiling:** Alert vets to breed predispositions
- **Vaccination schedule AI:** Intelligent reminders based on species + age + history

#### AI-10: AI Receptionist (Conversational Booking Agent)
- **Model:** Claude claude-sonnet-4-6 with function-calling to live appointment availability API
- **Channels:** Web chat widget (embedded on Website Builder pages) + WhatsApp Business API
- **Capabilities:**
  - Book, reschedule, and cancel appointments via natural language
  - Answer clinic FAQs from a clinic-configured knowledge base
  - Tell patients which doctors are available and their consultation fees
  - Hand off to human receptionist when it cannot resolve
- **Guardrails:**
  - Never provides medical advice; deflects clinical questions to "please consult your doctor"
  - Verifies patient identity via phone OTP before modifying existing bookings
  - All conversations logged; no conversation data used to train models without consent
- **Demo Value:** Fully operational in a browser tab — shows prospects a working AI receptionist within minutes of signing up

### AI Governance
- All AI outputs surfaced as **suggestions, not auto-actions** (human-in-loop)
- Anthropic has a HIPAA BAA program — sign it before processing real patient data
- AI token usage logged per tenant (for cost attribution and plan limits)
- Keep a simple monthly AI cost dashboard so you know when a tenant is unprofitable

---

## 16. Reporting Requirements

### Report Categories

#### Operational Reports
| Report | Frequency | Audience | Format |
|--------|-----------|----------|--------|
| Daily Appointment Summary | Daily | Branch Manager | PDF/Email |
| Provider Productivity Report | Weekly | Org Admin | Dashboard |
| No-Show Analysis | Weekly | Manager | Dashboard |
| Patient Registration Trends | Monthly | Org Admin | Dashboard |
| Average Wait Time Analysis | Weekly | Manager | Chart |

#### Financial Reports
| Report | Frequency | Audience | Format |
|--------|-----------|----------|--------|
| Daily Revenue Summary | Daily | Manager/Owner | PDF/Email |
| Invoice Aging Report | Weekly | Billing Staff | Excel/CSV |
| Revenue by Provider | Monthly | Org Admin | Dashboard |
| Branch P&L Comparison | Monthly | Org Owner | Dashboard |
| Subscription MRR/ARR | Monthly | Org Owner | Dashboard |

#### Clinical Reports
| Report | Frequency | Audience | Format |
|--------|-----------|----------|--------|
| Disease Burden Report (ICD) | Monthly | Medical Director | Dashboard |
| Prescription Patterns | Monthly | CMO | Dashboard |
| Lab Turnaround Time | Weekly | Lab Manager | Dashboard |
| Chronic Disease Registry | Quarterly | Clinical Team | PDF |
| Vaccination Coverage (Vet) | Monthly | Vet Manager | Dashboard |

#### Compliance Reports
| Report | Trigger/Frequency | Audience | Format |
|--------|------------------|----------|--------|
| HIPAA Audit Log Export | On-demand / Annual | Compliance Officer | CSV |
| PHI Access Report | Monthly | Compliance Officer | PDF |
| Data Breach Audit Trail | On-incident | Legal / Compliance | Structured PDF |
| Controlled Substance Log | Monthly | Org Admin / Regulator | PDF |
| Staff License Compliance | Monthly | HR | Dashboard |

#### Marketing Reports
| Report | Frequency | Audience | Format |
|--------|-----------|----------|--------|
| Campaign Performance Summary | Per campaign | Org Admin | Dashboard |
| Patient Engagement Trends | Monthly | Org Admin | Dashboard |
| WhatsApp Opt-out Rate | Monthly | Org Admin | Chart |
| Campaign ROI (revenue from recalled patients) | Monthly | Org Owner | Dashboard |

#### CRM Reports (Internal — ClinicOS Admins Only)
| Report | Frequency | Audience | Format |
|--------|-----------|----------|--------|
| Pipeline Funnel (stage counts + ARR) | Real-time | Sales Manager | Dashboard |
| Demo Conversion Rate | Weekly | Sales Manager | Chart |
| Lead Source Attribution | Monthly | Sales Manager | Dashboard |
| Sales Rep Leaderboard | Weekly | Sales Manager | Dashboard |
| Avg Days per Stage | Monthly | Sales Manager | Dashboard |
| Churn & Cancellation Reasons | Monthly | CEO/Product | Dashboard |

### Analytics Architecture
```
MVP approach — no data warehouse, no ETL pipeline:

  Supabase PostgreSQL (operational DB)
      │
      ▼
  Reporting queries run directly on read-optimized views
  (Supabase supports up to 500 concurrent connections — more than enough at MVP)
      │
      ▼
  Analytics Layer
  ├── Pre-built dashboards: custom React charts (Recharts / Chart.js — free)
  ├── Product analytics: PostHog (generous free tier — 1M events/month free)
  ├── Reports: server-side SQL queries → JSON → rendered in app
  └── Data exports: CSV download (stream query results, no warehouse needed)

Scale trigger: Add read replica ONLY when report queries start slowing down
the operational DB (typically at 500+ active clinics).
```

---

## 17. Security Requirements

### Authentication & Authorization
- **Auth provider:** Supabase Auth (JWT-based, built-in — no extra service needed)
- **MFA:** TOTP via Supabase Auth (free, built-in) — enforce for clinical staff
- **Session Management:** Supabase handles JWT access tokens + refresh tokens automatically
- **Brute Force Protection:** Supabase Auth has built-in rate limiting; add Cloudflare free tier as WAF

### Data Encryption
| Layer | Mechanism |
|-------|-----------|
| **In Transit** | TLS 1.3 minimum; HSTS enforced; no TLS 1.0/1.1 |
| **At Rest (DB)** | AES-256 encryption (PostgreSQL + AWS RDS encryption) |
| **At Rest (Files)** | S3 SSE-KMS with per-tenant KMS keys (Enterprise) |
| **PHI Fields** | Application-level encryption (names, DOB, contact — AES-256-GCM) |
| **Backups** | Encrypted with separate key hierarchy |
| **API Keys** | Stored as PBKDF2 hash; shown once on creation |

### Infrastructure Security (MVP — lean and free where possible)
- **WAF:** Cloudflare free tier — covers DDoS, basic OWASP rules, rate limiting
- **Secrets:** Environment variables in Railway/Vercel dashboard — never in code or `.env` committed to git
- **Dependency scanning:** `npm audit` in CI (GitHub Actions — free for public/small repos) + Dependabot alerts
- **Hosting security:** Railway and Vercel handle TLS, network isolation, and container security automatically
- **Pen test:** Not needed at MVP — address when first enterprise clinic signs up or at SOC 2 roadmap kick-off

### Compliance Controls

#### HIPAA Controls
- Business Associate Agreements (BAA) with all PHI-touching vendors (AWS, Twilio, SendGrid)
- PHI access limited to minimum necessary principle
- PHI audit logs retained for 6 years
- Workforce training tracking module built-in
- Breach notification workflow (72-hour notification support)

#### GDPR Controls
- Data Subject Access Request (DSAR) workflow: 30-day fulfillment
- Right to Erasure: soft-delete with 30-day grace, with medical records exception documented
- Data Portability: Structured data export (PDF + CSV) on request within 30 days
- Consent management: granular consent capture and audit trail
- Data Residency: EU patients' data stored in EU regions only (Frankfurt / Ireland)

#### Audit Logging Standards
```
Every PHI-touching API call logs:
  - timestamp (UTC, microsecond precision)
  - user_id, role, tenant_id, branch_id
  - action (CREATE/READ/UPDATE/DELETE)
  - resource type + resource ID
  - source IP + User-Agent
  - request_id (for tracing)
  - success/failure + failure reason

Immutable logs: written to append-only store (AWS CloudTrail + S3 WORM)
Tamper detection: HMAC chain on log batches
Retention: 7 years (medical), 3 years (operational)
```

### Security Incident Response (Solo Developer Reality)
```
Two severities to start with:

  CRITICAL (PHI breach, account takeover):
    → You respond personally; notify affected clinic within 72 hours
    → Supabase + Railway both have incident notification via email
    → Keep a one-page "what to do" checklist in your Notion

  STANDARD (bug, data issue, billing error):
    → Fix and deploy via Railway (< 5 minutes)
    → Notify affected tenant via email

Monitoring setup (free):
  - Railway: built-in health checks + crash alerts via email
  - Supabase: dashboard alerts for DB errors and auth anomalies
  - PostHog: error tracking for frontend
  - Resend: email delivery failure alerts

Add PagerDuty/Datadog ONLY after you have paying enterprise customers with SLAs.
```

---

## 18. Future Expansion Opportunities

### Near-Term (0–12 months)
- **Telemedicine Marketplace:** Connect patients to on-demand doctors for platforms without their own providers
- **ClinicOS Payments:** Embedded payment infrastructure with net settlement to clinics
- **Referral Network:** In-platform specialist referral with shared records consent
- **Lab & Radiology Marketplace:** Connect to local diagnostic networks via API

### Mid-Term (12–24 months)
- **ClinicOS Pharmacy Network:** Integrated pharmacy fulfillment with home delivery
- **Population Health Analytics:** Anonymized aggregate insights for public health bodies
- **Mental Health Platform:** Specialized module for psychiatry and therapy (with video + mood tracking)
- **Insurance / TPA Claims:** EDI 837/835 integration for markets where insurance is dominant (US, Gulf)

### Long-Term (24–48 months)
- **ClinicOS Marketplace:** Third-party app store for specialty modules
- **AI Diagnostic Engine:** Proprietary AI trained on anonymized (consented) platform data
- **Global Health Records Network:** Cross-platform patient record portability standard
- **ClinicOS Insurance:** Embedded health insurance products for underserved markets
- **Government / Public Health Integration:** Direct API integration with national health registries (Ayushman Bharat, NHS, etc.)
- **Precision Medicine Module:** Genomics data integration for personalized treatment protocols

### Platform Ecosystem Play
```
Phase 1 (Now):     Clinic SaaS — capture workflow
Phase 2 (Y1–2):   Data Network — aggregate insights
Phase 3 (Y2–3):   Marketplace — third-party developers
Phase 4 (Y3–5):   Health OS — the operating system
                   for the entire healthcare value chain
```

---

## Architecture Decision Records (ADRs)

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-001 | PostgreSQL via Supabase (not MongoDB/NoSQL) | ACID compliance for medical records; Row-Level Security for multi-tenancy for free |
| ADR-002 | BullMQ (not Kafka) for async jobs | Redis already in stack; handles clinic-scale volume; zero infra overhead |
| ADR-003 | Schema-per-tenant in single Supabase DB | Supabase RLS enforces isolation; avoids managing multiple DB instances solo |
| ADR-004 | Modular Monolith (not Microservices) | Solo developer; faster MVP; deploy as one unit; extract services later at clear bottlenecks |
| ADR-005 | Supabase for Auth + DB + Storage + Realtime | Eliminates 4 separate services; generous free tier; everything in one dashboard |
| ADR-006 | Claude claude-sonnet-4-6 for AI features | Function-calling for booking; pay per token (no GPU cost); HIPAA BAA available |
| ADR-007 | Soft-delete only for all medical records | Legal retention; audit trail; no accidental data loss |
| ADR-008 | Resend for transactional email (not SendGrid) | Better DX; React Email templates; 3,000 free emails/month; $20/mo after |
| ADR-009 | Vercel (frontend) + Railway (backend) hosting | git push → live in minutes; managed SSL/scaling; combined cost ~$20–40/month |
| ADR-010 | PostHog for product analytics | 1M free events/month; session replays; feature flags; replaces LaunchDarkly + Mixpanel |
| ADR-011 | CRM in same Supabase DB as platform | No extra service; opportunity.won event → direct DB insert to provision tenant |
| ADR-012 | Defer HL7/FHIR/SAML/Insurance/Kubernetes | Not needed until enterprise clients with budgets appear; revisit at 500+ clinics |

---

## Technology Stack

### MVP Stack (ship in weeks, not months)

```
Layer            Tool                     Why / Cost
─────────────────────────────────────────────────────────────────────────
Frontend         React + Vite             Fast DX; huge ecosystem
Styling          Tailwind CSS             Utility-first; no design system needed
Charts           Recharts                 Free; composable React charts
State            Zustand                  Lightweight; no Redux boilerplate

Backend          Node.js + Express        Single language full-stack; fast iteration
API style        REST (JSON)              Simple; no GraphQL overhead at MVP
Validation       Zod                      Schema validation shared with frontend

Database         Supabase PostgreSQL      Managed Postgres; RLS for multi-tenancy
                                          Free tier: 500MB DB, 1GB storage
                                          Pro: $25/month (8GB DB, daily backups)
Auth             Supabase Auth            JWT + MFA built-in; free
Storage          Supabase Storage         Documents, prescriptions, photos
                                          Free: 1GB; Pro: 100GB included
Realtime         Supabase Realtime        WebSocket for in-app notifications; free
Search           PostgreSQL full-text      pg_trgm extension — no Elasticsearch needed

Cache            Redis (Upstash)          Serverless Redis; free tier 10K req/day
                                          Only needed for BullMQ + session cache
Job Queue        BullMQ (on Redis)        Async jobs, retries, scheduling
                                          Handles: emails, reminders, AI calls, reports

Email            Resend                   3,000 free emails/month; React Email templates
WhatsApp         Meta Cloud API           1,000 free conversations/month
SMS              Twilio                   Pay-per-SMS; add only when needed
AI               Anthropic Claude API     Pay per token; ~$2–5/clinic/month
Video (Telehealth) Daily.co / 100ms.io   Pay-per-minute; no infra

Frontend hosting Vercel                   Free for hobby; $20/month Pro
Backend hosting  Railway                  $5/month starter; ~$20/month with Redis
Domain + SSL     Cloudflare               Free tier; DDoS + WAF included

Product analytics PostHog                 1M events/month free; session replay
Error tracking   Sentry                  Free tier (5K errors/month)
Uptime monitoring Better Uptime / UptimeRobot   Free tier monitors

CI/CD            GitHub Actions           Free for public repos; 2,000 min/month free
```

### Estimated Monthly Infrastructure Cost

| Stage | Clinics | Est. Cost/Month |
|-------|---------|-----------------|
| Development | 0 | ~$0 (all free tiers) |
| Beta / First 10 clinics | 1–10 | ~$25–50 |
| Early revenue | 10–50 | ~$50–100 |
| Growing | 50–200 | ~$100–300 |
| Scale trigger | 200–500 | Add read replica, dedicated Redis (~$300–600) |

### When to Upgrade (scale triggers, not before)

```
You're on Supabase free → move to Pro ($25/mo) when:
  First paying customer signs up.

Add dedicated Redis (Upstash Pro) when:
  BullMQ queue depth exceeds 1,000 jobs regularly.

Add Supabase read replica when:
  Report queries start timing out (likely at 200+ active clinics).

Consider extracting services when:
  One module (e.g., AI) causes API latency for the rest of the app.

Consider Kubernetes/EKS when:
  You have a DevOps hire and 1,000+ paying clinics.
```

---

---

## Build Order (Solo Developer Roadmap)

```
Week 1–2:   Supabase setup + Auth + Tenant provisioning + Role system
Week 3–4:   Patient registration + Appointment booking (core loop)
Week 5–6:   EMR (SOAP notes, vitals, diagnoses)
Week 7–8:   Prescriptions + basic billing (invoice + manual payment)
Week 9:     Notification worker (BullMQ + Resend + WhatsApp reminders)
Week 10:    Patient portal (view appointments, prescriptions, invoices)
Week 11:    AI Receptionist (Claude API + booking function calls)
Week 12:    Website Builder (basic version — landing page + booking widget)
            → DEMO READY. Start outreach.

Month 4–5:  CRM (internal), Marketing campaigns
Month 5–6:  Lab orders, Inventory, Staff management
Month 6+:   Reporting dashboard, Multi-branch, Vet module
```

*Document prepared by: Principal SaaS Architect*
*Next Steps: Sprint 0 setup → Supabase schema → Auth flow → First appointment booked*
