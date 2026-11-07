# MEDIA TECH VUS CEO EMPIRE v14 — Release Notes

## New
- Docker Compose two-service deployment (`web` Nginx SPA + `api` Node.js).
- API accessible only inside Docker network; public-facing web port binds to local loopback by default.
- Same-origin `/api` reverse proxy for frontend and backend.
- Dockerfiles with multi-stage static frontend build and production API dependencies.
- Healthchecks: process + Supabase migration readiness using existing `/api/ready`.
- `.env.deploy.example` with non-secret placeholders and checker `npm run check:deploy`.
- Public HTTP smoke checker `npm run smoke:deployed` (web, liveness, readiness, authentication boundary).
- 16 extra deployment unit tests, GitHub Actions Docker image build checks, docs.

## Compatible / migration
- Upgrades the v13 codebase; game backend business logic, CEO rights, Academy, agents and treasury unchanged.
- No new SQL migration. Do not reset Supabase; keep existing data and back up before database changes.
- Docker Compose runs a **single API worker**. Scaling requires distributed queue/locking.

## Verification (creation environment)
- `npm run test:all`: 122/122 Node tests passed and structural checks passed.
- API Node syntax parsed; 18 frontend source files parsed with global TypeScript transpiler (syntax only).
- Compose/workflow YAML parsed; no Docker engine available, and npm registry unreachable (EAI_AGAIN), so Docker builds and full React dependency-based build have NOT been validated.
- Live Supabase, Gemini, OpenAI, Docker, TLS and Playwright E2E were NOT run. These must be tested before publishing.
