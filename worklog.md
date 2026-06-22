---
Task ID: 1
Agent: Main Agent
Task: Développer le Dashboard SuperAdmin pour Bus Go

Work Log:
- Updated Prisma schema with 4 new models: Subscription, Invoice, SystemLog, NotificationTemplate
- Pushed schema to SQLite and regenerated Prisma client
- Updated seed data with 2 subscriptions, 8 invoices, 8 system logs, 7 notification templates
- Updated superadmin layout: new sidebar with 5 nav items (Vue d'ensemble, Entreprises, Facturation, Analytique, Configuration), mobile Sheet support
- Created 6 API routes: /api/superadmin/dashboard, /api/superadmin/tenants, /api/superadmin/tenants/[tenantId], /api/superadmin/[tenantId]/subscription, /api/superadmin/invoices, /api/superadmin/analytics, /api/superadmin/settings, /api/superadmin/impersonate
- Enhanced /superadmin dashboard: 4 KPI cards (compagnies, MRR with growth %, bus, passagers), Recharts MRR area chart, alerts panel (failed payments, overdue invoices, inactive tenants), recent activity logs
- Created /superadmin/tenants: card grid with search, detail dialog (subscription, users list, invoices), activate/deactivate toggle, plan change dialog, impersonate with confirmation and JWT token generation
- Created /superadmin/billing: pricing banner (20 000 FCFA/bus), summary cards (revenue, pending, failed), filterable invoices table, status change dialog, "Relancer les impayés" action
- Created /superadmin/analytics: 4 KPI cards, monthly bar chart (billets/boarded), boarding rate line chart, status breakdown badges, feature usage panel, ROI per company table
- Created /superadmin/settings: 3 tabs (Templates, TTS, Logs), notification template table with edit/toggle, TTS config cards, filterable system logs table
- Wrote 13 unit tests covering: authorization guards for all routes, dashboard KPI computation, alert detection, tenant CRUD, impersonation flow
- Fixed Prisma relation errors (SystemLog has no tenant relation, Tenant has no billets count), fixed missing import (AlertTriangle)
- Browser-verified all 5 pages render correctly with data

Stage Summary:
- 4 new Prisma models, 8 new seed records
- 8 API routes, 5 pages, 1 layout update
- 13/13 tests passing, 0 new lint errors
- All pages browser-verified: dashboard with charts, tenants with detail/impersonate, billing with invoices, analytics with charts, settings with templates/TTS/logs