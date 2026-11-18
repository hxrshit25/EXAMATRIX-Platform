# EXAMATRIX 2.0

A full-stack examination seating allocation system. Manage students, rooms and examinations, generate room-wise seat assignments, search records, and print seating plans.

## Stack
- Frontend: React 18, TypeScript, Vite, Lucide icons
- Backend: Node.js, Express, TypeScript
- Storage: JSON file store (simple single-instance prototype storage)

## Requirements
Node.js 20+ and npm 10+.

## Run locally
```bash
npm install
npm run dev
```
Frontend: http://localhost:5173  
API: http://localhost:4000/api/health

## Production build
```bash
npm run build
npm start
```
The API listens on `PORT` (defaults to 4000). The frontend is built to `client/dist`.

## Deployment notes
This repository is a full-stack app: deploying only the Vite frontend will not provide the API. Deploy the Node server on a Node hosting service and set `VITE_API_URL` to the public API base URL when building the frontend. Configure CORS to the exact frontend origin before public production use. Set `DATA_DIR` to a persistent mounted disk path; the included JSON storage is intended for a single server instance and is not a substitute for a managed database under concurrent/multi-instance production load.

Suggested deployment split:
1. Backend service: root directory `server` is not sufficient for workspace install; deploy from repository root, build with `npm install && npm run build`, start with `npm start` (or `npm run start -w server`).
2. Frontend static site: root directory `client`; build command `npm install && npm run build`; publish directory `dist`; set `VITE_API_URL=https://YOUR-BACKEND-DOMAIN/api`.

## Allocation rules
- Students are filtered to the examination's department and semester.
- Eligible students are sorted by roll number (natural/numeric-aware order).
- Seats are assigned sequentially across rooms in configured order.
- A room's usable capacity is the lower of its configured capacity and rows × columns.
- The engine rejects insufficient capacity and duplicate generation for the same exam.
- Clearing an exam's allocation allows it to be generated again.

## Current limitations
- No authentication/login is included in this prototype; the admin interface is not access-controlled.
- JSON storage is suitable for local demos/single-instance testing only. For a public multi-user deployment, migrate to PostgreSQL/Supabase, add authentication, validation, audit logging and stricter CORS/security controls.
- Room seat numbering is row-major (A1, A2 ... B1 ...). This version does not implement alternate-column/zig-zag distribution or student-specific accommodations.

## API
- `GET /api/health`
- `GET /api/dashboard`
- CRUD: `/api/students`, `/api/rooms`, `/api/exams`
- `GET /api/allocations?examId=...`
- `POST /api/allocations/generate` body `{ "examId": "..." }`
- `DELETE /api/allocations/:examId`
- `GET /api/export`
