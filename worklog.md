---
Task ID: 1
Agent: Main Agent
Task: Développer la Webapp Guichetier pour Bus Go — Phase 2

Work Log:
- Reviewed all existing files: components, API routes, pages, schema, auth
- Found and fixed 3 bugs:
  1. Trajets API: `dateFilter` query param mismatch (pages sent `dateFilter=today`, API read `date`). Also added support for `upcoming` and `all` filters.
  2. QR code URL in `/api/billets/create-guichet` used `ticketNumber` instead of `billetId` (spec requires `busgo.sn/b/[billetId]`)
  3. Same QR code URL bug in `/api/trajets/import-csv` and `/api/billets/route.ts`
- Installed vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom, @vitejs/plugin-react
- Created vitest.config.ts with jsdom environment and path aliases
- Created comprehensive test setup with mocks for next-auth, Prisma, bcryptjs, canvas, window.open
- Wrote 65 unit tests across 6 test files:
  - `api/buses.test.ts` (9 tests): GET/POST auth, validation, uniqueness, creation
  - `api/trajets.test.ts` (14 tests): GET dateFilter modes (today/upcoming/all), includeBillets, status filter, ordering; POST validation and creation
  - `api/create-guichet.test.ts` (9 tests): auth, validation, seat conflicts, ticket uniqueness, client creation/reuse, QR code URL correctness
  - `api/import-csv.test.ts` (11 tests): auth, validation, invalid seats, occupied seats, success import, QR URL, partial success
  - `components/seat-selector.test.tsx` (11 tests): rendering, click handling, occupied/disabled states, selected highlighting, capacity bounds
  - `components/qr-code-display.test.tsx` (11 tests): rendering, info display, print button, reset button
- All 65 tests pass

Stage Summary:
- 3 bugs fixed (dateFilter mismatch, QR URL using ticketNumber in 3 routes)
- 65 unit tests written and passing
- Guichetier webapp is fully functional: /admin/guichet, /admin/trajets, /admin/buses
- Reusable components: SeatSelector (visual bus layout), QRCodeDisplay (QR generation + print)
- API routes: 8 endpoints covering full CRUD for buses, trajets, billets + CSV import
- Test infrastructure: vitest + jsdom + testing-library configured with proper mocks