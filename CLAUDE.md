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

## Design System

### Theme
Dark-first. All surfaces use dark backgrounds. No light mode for now.

### Color Palette
| Token | Hex | Usage |
|---|---|---|
| Background | #111111 | Page background |
| Surface | #222222 | Cards, modals, inputs |
| Border | #333333 | Dividers, card borders |
| Ace Green | #C5F135 | Primary CTAs, victories, highlights, stat numbers |
| Lime Light | #EEFF88 | Green hover states, subtle green tints |
| Rally Orange | #FF7F2D | Ace! reactions, challenges, notifications, social energy |
| Orange Light | #FFB380 | Orange hover states, subtle orange tints |
| Grass | #4a8c3f | Grass headers (profile, league banners) |
| Text Primary | #FFFFFF | Main text |
| Text Secondary | rgba(255,255,255,0.6) | Supporting text |
| Text Muted | rgba(255,255,255,0.35) | Captions, timestamps, placeholders |

### Typography
- Display/Scores: 32px, weight 800, letter-spacing -0.02em (match scores, big numbers)
- Heading: 22px, weight 700, letter-spacing -0.01em
- Body: 16px, weight 500
- Caption: 13px, weight 400, color Text Muted

### Buttons
- Primary: background #C5F135, color #1a1a1a, border none, border-radius 8px, font-weight 700
- Secondary: background transparent, color #C5F135, border 1.5px solid #C5F135, border-radius 8px
- Ghost: background rgba(255,255,255,0.06), color rgba(255,255,255,0.7), border 0.5px solid #333
- Ace! reaction: background rgba(255,127,45,0.18), border 1.5px solid #FF7F2D, color #FF7F2D, border-radius 20px, font-weight 700

### Components

#### Match Card
- Background: #222222, border: 0.5px solid #333333, border-radius: 12px
- Winner row: name in #ffffff weight 700, score in #ffffff weight 800 size 20px
- Loser row: name in rgba(255,255,255,0.5) weight 500, score in rgba(255,255,255,0.28)
- Thin divider between players: 0.5px solid #333, margin-left 42px
- Victory badge: background rgba(197,241,53,0.18), color #C5F135
- Defeat badge: background rgba(255,255,255,0.08), color rgba(255,255,255,0.5)
- Ace! button: use Ace! reaction style defined above

#### Stat Cards
- Background: #1a1a1a, border: 0.5px solid #2a2a2a, border-radius: 12px, text-align center
- Number: 28px weight 800, color #C5F135 (or white for non-positive stats)
- Label: 11px, color rgba(255,255,255,0.35)

#### Grass Header (profile & league banners)
- Base background: #4a8c3f
- Alternating stripe overlay: repeating-linear-gradient stripes rgba(0,0,0,0.13)
- Court lines: SVG overlay with baseline, service line, center line in rgba(255,255,255,0.55)
- Bottom fade: linear-gradient rgba(0,0,0,0) to rgba(0,0,0,0.72)
- Text sits at bottom of header on top of the fade
- Height: 160px on web, taller on mobile

#### Avatar
- Winner/self: background #C5F135, color #1a1a1a, initials, font-weight 700
- Other player: background #2e2e2e, color rgba(255,255,255,0.45)
- Size: 32px web, 40px mobile, border-radius 50%

#### Badges
- Surface/location: background rgba(255,255,255,0.08), color rgba(255,255,255,0.55)
- Level chips: background rgba(197,241,53,0.18), color #C5F135

### Design principles
- Dark surfaces everywhere — never use white or light backgrounds
- Ace Green for achievements and actions, Rally Orange for social reactions
- Scores and stats always large and prominent — they tell the story
- Grass header reserved for hero moments: profile header, league banner, match detail
- Subtle borders (0.5px solid #333) — structure without heaviness
- Text hierarchy matters: winner always brighter than loser

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