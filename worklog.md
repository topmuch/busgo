---
Task ID: 1
Agent: Super Z (main)
Task: Develop PWA Agent for Bus Go

Work Log:
- Reviewed existing codebase: agent layout, Prisma schema, socket hook, auth config, seed data
- Installed `html5-qrcode` library for QR scanning
- Updated Prisma schema: added `driverId` + `driver` relation to Trajet, added `reliabilityScore` + `drivenTrajets` to User
- Ran `prisma db push` + `prisma generate` to sync schema
- Updated seed: 9 users (5 clients), 7 trajets (3 today with driverId assignment), 38 billets across trajets, varied statuses
- Created 7 API routes for agent operations
- Created 6 agent UI components
- Created 2 main pages: /agent/trajets and /agent/embarquement/[trajetId]
- Updated socket hook with driver-retard events, emit helpers, and infinite reconnection
- Updated agent layout with mobile bottom nav, PWA provider integration
- Created PWA manifest, service worker, offline store (IndexedDB), PWA registration hook
- Generated PWA icons (192px, 512px)
- Fixed API response format mismatch (scan route → flat fields)
- Fixed trajets page data parsing (array vs wrapped object)
- Fixed embarquement page socket listener timing (replaced direct listeners with hook-based state)
- Verified: `next build` succeeds with all 25+ routes

Stage Summary:
- Complete PWA Agent with 7 API routes, 6 reusable components, 2 pages
- Features: QR scanning (html5-qrcode + Web Audio beeps), visual seat map (bus shape), departure timer, missing passenger management, real-time retard notifications, offline support (IndexedDB + SW), PWA installable
- Files created: 20+ new files under src/app/api/agent/, src/components/agent/, src/app/(agent)/agent/, src/lib/, src/hooks/, public/