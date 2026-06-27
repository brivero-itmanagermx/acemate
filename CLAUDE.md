# AceMate — CLAUDE.md

## Project Overview
AceMate is a social tennis platform for amateur players to track their tennis career,
find opponents nearby, register matches, and organize/join leagues.
Target audience: amateur tennis players, Spanish and English speaking.

## Tech Stack
- **Frontend:** Next.js (App Router) + React + Tailwind CSS
- **Backend:** Node.js + TypeScript + Hono (REST API)
- **Database & BaaS:** Supabase (Postgres + Auth + Storage + Realtime)
- **Geolocation:** PostGIS (via Supabase)
- **Hosting:** Vercel (frontend) + Supabase (backend/db)

## Architecture
- Supabase handles auth, storage, and base CRUD via auto-generated API
- Custom Hono API layer handles business logic on top of Supabase
- Frontend consumes the Hono API (not Supabase directly)
- API is designed to be consumed later by a mobile app
- All code, routes, variables, functions and comments in English
- UI text uses i18n (español + English), library: next-intl

## Project Structure
acemate/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Hono backend
├── packages/
│   └── types/        # Shared TypeScript types between frontend and api
├── supabase/
│   ├── migrations/   # Database migrations
│   └── seed.sql      # Seed data
└── CLAUDE.md

## Core Features (by phase)

### Phase 1 — Core (build first)
- User profiles (name, photo, level, location, dominant hand, preferred surface)
- Find nearby players (PostGIS radius search)
- Friend requests / follow system
- Register friendly matches (flexible scoring: any set format, any score)
- Match history and basic stats per player

### Phase 2 — Leagues
- Create and manage leagues (round robin, single elimination, groups)
- Player registration to leagues
- Match scheduling (calendar)
- League rankings and draws
- News/announcements section per league

## Database conventions
- Table names: plural snake_case (users, matches, league_players)
- Primary keys: uuid (gen_random_uuid())
- Timestamps: created_at, updated_at on every table
- Soft deletes: deleted_at nullable timestamp (never hard delete)
- All migrations in /supabase/migrations with timestamp prefix

## Code conventions
- TypeScript strict mode everywhere
- Shared types in /packages/types, never duplicate
- API routes: REST, plural nouns, versioned (/api/v1/matches)
- No raw SQL in API code, use Supabase client or query builder
- Environment variables: never hardcode secrets, always use .env

## Key business rules
- Match scores are flexible: no rigid set/game validation
- A match can be 1 or more sets, any score accepted
- Match status: pending | confirmed | disputed | cancelled
- Player levels: beginner | intermediate | advanced | competitive
- Location is optional but required to appear in nearby search

## What NOT to do
- Do not build mobile app (API must support it later, but not now)
- Do not add payment features in Phase 1
- Do not hard delete any user data
- Do not validate scores rigidly (flexible match format is a core feature)

## Working style
- Work autonomously end to end
- Apply migrations, install packages and create files without asking for confirmation
- Only pause if you encounter a blocking error that requires a decision