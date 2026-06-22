---
Task ID: 2
Agent: Main Agent
Task: Développer la Webapp Guichetier pour Bus Go

Work Log:
- Installed qrcode + papaparse libraries
- Created SeatSelector component (visual 2+2 bus layout with driver seat, occupied/selected/free states)
- Created QRCodeDisplay component (canvas-based QR gen via qrcode lib, print popup with ticket layout, mandatory scan warning)
- Created API routes:
  - POST /api/billets/create-guichet (auto-creates client + billet + QR URL)
  - GET/POST /api/trajets (list with date/status filters + create)
  - PATCH/DELETE /api/trajets/[id] (status update + delete with cascade)
  - GET/POST /api/buses (list + create with uniqueness check)
  - PUT/DELETE /api/buses/[id] (update + delete with active trajet check)
  - POST /api/trajets/import-csv (PapaParse CSV import with auto-client creation)
  - GET /api/drivers (list agent/admin users for driver assignment)
- Created 3 admin pages:
  - /admin/guichet: Quick ticket form, trajet dropdown, seat selector, QR display, print, Ctrl+Enter shortcut
  - /admin/trajets: CRUD, status workflow (scheduled→boarding→departed→arrived), passenger dialog, CSV import
  - /admin/buses: Card grid CRUD, driver assignment, capacity/trajet counts
- Updated admin sidebar nav (added Guichet with ScanLine icon)
- Updated seed to include 2 today's trajets for guichet testing
- Verified full guichet flow: login→admin→guichet→fill form→select trajet→pick seat→generate QR→see QR+warning→print button→reset
- All ESLint clean

Stage Summary:
- Full guichetier workflow operational with real DB data
- QR codes contain URL format: https://busgo.sn/b/[ticketNumber]
- Print generates a standalone ticket HTML with QR, passenger info, and mandatory scan warning
- CSV import supports columns: nom/name, telephone/phone/tel, siege/seat
- 3 billets verified sold on today's trajets (seat 1, 2, and newly created seat 3)