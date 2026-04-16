# AlgoLab

AlgoLab is a full-stack algorithm learning platform that combines interactive visualizations with persisted experiment tracking, analytics, reporting, and role-based administration.

The repository contains:
- A Next.js frontend for visual learning workflows
- An Express + MongoDB backend for auth, storage, analytics, and reports

## Table of Contents

- [Architecture](#architecture)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Run the Apps](#run-the-apps)
- [Available Scripts](#available-scripts)
- [Authentication and Roles](#authentication-and-roles)
- [API Quick Reference](#api-quick-reference)
- [Error Format](#error-format)
- [Troubleshooting](#troubleshooting)
- [Related Docs](#related-docs)
- [Current Limitations](#current-limitations)

## Architecture

- Frontend (default: `http://localhost:3000`) calls backend API.
- Backend (default: `http://localhost:5000`) exposes `/api` and `/api/v1` route bases.
- MongoDB stores users, experiments, and reports.
- Authentication uses:
  - access token (returned in JSON)
  - refresh token (HttpOnly cookie)

## Key Features

- Interactive sorting visualizer with dataset generation and step controls
- Binary search visualizer
- Algorithm racing mode for side-by-side comparison
- Experiment persistence with filtering and pagination
- Analytics views (personal and class-level for instructor/admin)
- PDF report generation and download
- Admin tools (user management and platform analytics)
- Pixel upload endpoint for image-based workflows

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Radix UI + shadcn/ui components
- Framer Motion
- Recharts

### Backend
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- Zod validation
- JWT auth (access + refresh)
- Multer (file uploads)
- PDFKit (report generation)

## Project Structure

```text
AlgoLab/
  backend/
    src/
      modules/
        auth/
        experiments/
        analytics/
        reports/
        admin/
        upload/
      routes/
      middleware/
      config/
  frontend/
    app/
    components/
    hooks/
    lib/
```

## Prerequisites

- Node.js 20+
- npm 10+ (backend)
- pnpm 9+ (recommended for frontend)
- MongoDB (local instance or Atlas)

## Local Setup

1. Clone the repository and move into it.
2. Install backend dependencies.
3. Install frontend dependencies.
4. Configure environment variables.
5. Start backend and frontend in separate terminals.

```bash
git clone <your-repository-url>
cd AlgoLab

# Backend
cd backend
npm install

# Frontend
cd ../frontend
pnpm install
```

If you prefer npm in the frontend:

```bash
cd frontend
npm install
```

## Environment Variables

Create these files:
- `backend/.env`
- `frontend/.env.local`

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/algolab

# Provide either JWT_ACCESS_SECRET or JWT_SECRET.
JWT_ACCESS_SECRET=replace-with-at-least-16-characters
JWT_REFRESH_SECRET=replace-with-at-least-16-characters

JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Comma-separated list is supported.
CORS_ORIGIN=http://localhost:3000
```

Notes:
- `JWT_SECRET` can be used instead of `JWT_ACCESS_SECRET`.
- `JWT_REFRESH_SECRET` is required.

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Run the Apps

Start both services in separate terminals.

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
pnpm dev
```

Open:
- Frontend: `http://localhost:3000`
- Backend health check: `http://localhost:5000/health`

## Available Scripts

### Backend (`backend/package.json`)

- `npm run dev` - Start backend in watch mode (`tsx watch`).
- `npm run build` - Compile TypeScript to `dist/`.
- `npm run start` - Run compiled backend from `dist/server.js`.
- `npm run typecheck` - Type-check backend without emitting.

### Frontend (`frontend/package.json`)

- `pnpm dev` - Start Next.js dev server.
- `pnpm build` - Create production build.
- `pnpm start` - Run production frontend.
- `pnpm lint` - Run ESLint.

## Authentication and Roles

Supported roles:
- `student`
- `instructor`
- `admin`

Auth flow summary:
1. Login/signup returns `{ user, accessToken }`.
2. Backend sets `refreshToken` as an HttpOnly cookie (path `/api`).
3. Frontend stores access token and sends it as `Authorization: Bearer <token>`.
4. On access token expiry, frontend calls `/api/auth/refresh` with credentials.

Frontend middleware uses cookies for route guards:
- `algolab_access_token`
- `algolab_user_role`

Protected route behavior:
- Unauthenticated users are redirected to `/login`.
- Role-restricted routes:
  - `/analytics` requires `instructor` or `admin`
  - `/admin` requires `admin`

## API Quick Reference

Base URL (default): `http://localhost:5000`

Supported API prefixes:
- `/api/*`
- `/api/v1/*`

Public utility:
- `GET /health`

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/register` (alias of signup)
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout` (auth required)
- `GET /api/auth/me` (auth required)

### Experiments (auth required)

- `POST /api/experiments`
- `GET /api/experiments`
- `GET /api/experiments/summary`
- `GET /api/experiments/:id`
- `DELETE /api/experiments/:id`
- `GET /api/experiments/all` (instructor/admin)

Query constraints:
- `limit` max is `100`.

### Analytics (auth required)

- `GET /api/analytics/performance`
- `GET /api/analytics/class` (instructor/admin)
- `POST /api/analytics/benchmark`

Note:
- `POST /api/analytics/benchmark` currently returns `501 BENCHMARK_NOT_IMPLEMENTED`.

### Reports (auth required)

- `POST /api/reports` (body includes `experimentId`)
- `POST /api/reports/experiments/:experimentId/pdf`
- `GET /api/reports`
- `GET /api/reports/:reportId`
- `GET /api/reports/:reportId/download`
- `DELETE /api/reports/:reportId`

### Admin (admin only)

- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/role`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/analytics`

### Upload (auth required)

- `POST /api/upload-image`
  - multipart field: `image`
  - allowed mime types: `image/png`, `image/jpeg`, `image/jpg`
  - max size: 2 MB

## Error Format

Typical error response shape:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {}
}
```

## Troubleshooting

- Backend exits at startup:
  - Check required vars in `backend/.env`.
  - Verify MongoDB connectivity and `MONGODB_URI`.
- Frontend cannot call API:
  - Confirm `NEXT_PUBLIC_API_URL` in `frontend/.env.local`.
  - Confirm backend is running on expected port.
  - Confirm `CORS_ORIGIN` contains frontend origin.
- Frequent 401 responses:
  - Verify access token is set on the client.
  - Verify refresh cookie is present and valid.
  - Retry login to rotate session tokens.

## Related Docs

- `frontend/FEATURES.md`
- `frontend/USAGE_GUIDE.md`
- `frontend/IMPLEMENTATION_SUMMARY.md`
- `backend/IMPLEMENTATION_BLUEPRINT.md`

## Current Limitations

- Backend benchmark runner endpoint exists but is intentionally not implemented yet (`501`).
- There is no monorepo root script to start frontend and backend together; run them in separate terminals.