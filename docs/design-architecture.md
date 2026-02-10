---
type: "design-supporting"
parent: "./design.md"
project: "Work Management"
version: "0.1"
created: "2026-02-10"
updated: "2026-02-10"
---

# Architecture: Work Management

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Consumers                             │
│                                                              │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────────┐ │
│  │ Dashboard │   │ MCP Clients  │   │ Future REST clients │ │
│  │ (Browser) │   │ (Claude, etc)│   │                     │ │
│  └─────┬─────┘   └──────┬───────┘   └──────────┬──────────┘ │
│        │                │                       │            │
└────────┼────────────────┼───────────────────────┼────────────┘
         │                │                       │
         │ HTTPS          │ stdio                 │ HTTPS
         │                │                       │
┌────────▼────────────────┼───────────────────────▼────────────┐
│                         │          Vercel                     │
│  ┌──────────────────────┼──────────────────────────────────┐ │
│  │              Next.js App                                 │ │
│  │                      │                                   │ │
│  │  ┌───────────────┐   │   ┌───────────────────────────┐  │ │
│  │  │   Dashboard   │   │   │     REST API              │  │ │
│  │  │   (React)     │   │   │     /api/*                │  │ │
│  │  │               │   │   │                           │  │ │
│  │  │  App Router   │   │   │  Route Handlers           │  │ │
│  │  │  RSC + Client │   │   │  Validation + Logic       │  │ │
│  │  │  Components   │   │   │  Activity Logging         │  │ │
│  │  └───────────────┘   │   └────────────┬──────────────┘  │ │
│  │                      │                │                  │ │
│  └──────────────────────┼────────────────┼──────────────────┘ │
│                         │                │                    │
└─────────────────────────┼────────────────┼────────────────────┘
                          │                │
┌─────────────────────────┼────────────────┼────────────────────┐
│  WM MCP Server (local)  │                │  Supabase JS Client│
│                         │                │                    │
│  ┌───────────────────┐  │                │                    │
│  │  MCP Tool Calls   │──┘ HTTP to        │                    │
│  │  → REST API calls │  Vercel API       │                    │
│  │                   │                   │                    │
│  │  sync_project()   │                   │                    │
│  │  └─ ADF Parser    │                   │                    │
│  │  └─ REST push     │                   │                    │
│  └───────────────────┘                   │                    │
│                                          │                    │
└──────────────────────────────────────────┼────────────────────┘
                                           │
                          ┌────────────────▼────────────────────┐
                          │           Supabase                   │
                          │                                      │
                          │  ┌────────────┐  ┌───────────────┐  │
                          │  │  Postgres   │  │  Supabase     │  │
                          │  │  Database   │  │  Auth         │  │
                          │  │            │  │  (JWT/GoTrue) │  │
                          │  └────────────┘  └───────────────┘  │
                          │                                      │
                          └──────────────────────────────────────┘
```

## Components

### 1. Next.js Application (Vercel)

Single Next.js 15 application serving both the REST API and the dashboard.

**API Layer** (`/src/app/api/`)
- Route Handlers for all REST endpoints
- Business logic: validation rules, workflow_type enforcement, data_origin enforcement
- Activity logging middleware: every mutation logs to ActivityLog with actor context
- Health computation: query-time function called by project endpoints
- JWT validation via Supabase Auth helpers

**Dashboard Layer** (`/src/app/(dashboard)/`)
- React Server Components for initial data loading
- Client Components for interactivity (drag-and-drop, inline editing)
- View switching via URL routing (Today, Portfolio, Project Detail, etc.)
- Supabase Auth UI for login

**Shared Library** (`/src/lib/`)
- Supabase client configuration (server + browser)
- TypeScript types (generated from schema)
- Shared validation logic
- Health computation function

### 2. Supabase

**Postgres Database**
- All entity tables (Project, Plan, Phase, Task, BacklogItem, ActivityLog, ActorRegistry, Connector)
- Indexes for common query patterns
- Row Level Security (RLS) policies for auth
- Database functions for complex operations (display_id generation)

**Supabase Auth**
- Single user authentication
- JWT token issuance and validation
- Session management
- Used by both dashboard (browser) and API (server)

### 3. WM MCP Server

Separate TypeScript process running locally via stdio transport.

**MCP Tools** — thin wrappers that call the REST API:
- CRUD tools mapping 1:1 to REST endpoints
- Query tools (status, whats-next, blockers, deadlines, search)
- `sync_project` tool (triggers ADF connector)

**ADF Connector** — module within the MCP server:
- Parses ADF markdown files (status.md, tasks.md, backlog.md)
- Maps parsed data to WM entity shapes
- Pushes via REST API calls
- Uses source_id for idempotent upsert

## Request Flows

### Dashboard → API → Supabase

```
Browser → Next.js Route Handler → Supabase JS Client → Postgres
         (JWT in cookie)          (service role key)
         Validates JWT
         Applies business logic
         Logs to ActivityLog
         Returns JSON
```

### MCP Client → MCP Server → API → Supabase

```
Claude Desktop → WM MCP Server → HTTP to Vercel API → Supabase
                 (stdio)          (API key in header)
                 Maps MCP tool    Route Handler
                 call to REST     processes as above
```

### ADF Sync → API → Supabase

```
MCP Client calls sync_project({repo_path})
  → MCP Server reads ADF files from disk
  → Parses status.md, tasks.md, backlog.md
  → For each entity: POST/PATCH to REST API (upsert by source_id)
  → API validates, logs activity, persists
```

## Authentication & Security

### Auth Architecture

- **Provider:** Supabase Auth (GoTrue)
- **Method:** Email/password for MVP (single user)
- **Token format:** JWT (issued by Supabase, validated by API)
- **Session storage:** HTTP-only cookies (dashboard), Authorization header (API/MCP)

### Auth by Consumer

| Consumer | Auth Method | Token Source |
|----------|-----------|--------------|
| Dashboard (browser) | Supabase Auth UI → cookie-based session | Supabase Auth |
| REST API (external) | Bearer JWT in Authorization header | Supabase Auth or service key |
| MCP Server | Service role key or user JWT | Configured in MCP server env |

### Server DB Access Pattern

Route handlers use the **Supabase service role key** for all database operations. The API layer is the trusted security boundary — it validates JWTs, enforces business rules (data_origin, workflow_type, one-active-plan), and logs activity. Service role bypasses RLS intentionally; the API layer provides equivalent protection.

**Rationale:** Single-user MVP with a single auth user. RLS adds no practical value when every authenticated request has full access. API-level enforcement is simpler to test and reason about. Service role is needed anyway for connector operations and activity logging.

### Row Level Security (RLS)

RLS policies on all tables as a **defense-in-depth baseline** — tightened when multi-user is added. For single-user MVP:
- All authenticated requests can read/write all rows
- Unauthenticated requests blocked
- RLS is not the primary security mechanism (API-level enforcement via service role is primary)
- `data_origin = 'synced'` write protection enforced at API level (not RLS — requires business logic context)

### API Security Rules

1. **Data origin enforcement:** Mutations on `data_origin = 'synced'` entities return `403 Forbidden` (except connector-originated requests identified by service role)
2. **Workflow type enforcement:** Task creation validates plan_id/phase_id against project's workflow_type
3. **Input validation:** All inputs validated and sanitized at the API layer
4. **No secrets in client:** Supabase anon key (public) in browser, service role key server-side only

## Environment Configuration

### Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://fxidgnsjhjdaunzzbxpe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# App
NEXT_PUBLIC_APP_URL=https://<vercel-domain>

# MCP Server (local .env)
WM_API_URL=https://<vercel-domain>/api
WM_API_KEY=<service-role-key-or-jwt>
```

### Local Development

- `supabase start` — local Supabase instance (Postgres + Auth + Studio)
- `pnpm dev` — Next.js dev server (API + dashboard)
- MCP server connects to local API (`http://localhost:3000/api`)

## Project Structure

```
work-management/
├── docs/                       # ADF artifacts (design, brief, etc.)
├── src/
│   ├── app/
│   │   ├── api/                # REST API route handlers
│   │   │   ├── projects/
│   │   │   ├── plans/
│   │   │   ├── phases/
│   │   │   ├── tasks/
│   │   │   ├── backlog/
│   │   │   ├── plans/
│   │   │   ├── connectors/
│   │   │   ├── activity/
│   │   │   ├── status/
│   │   │   ├── whats-next/
│   │   │   ├── blockers/
│   │   │   ├── deadlines/
│   │   │   └── search/
│   │   ├── (dashboard)/        # Dashboard pages (route group)
│   │   │   ├── page.tsx        # Today view (default)
│   │   │   ├── portfolio/
│   │   │   ├── projects/[id]/
│   │   │   └── layout.tsx      # Dashboard shell (sidebar, header)
│   │   ├── auth/               # Auth pages (login)
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser client
│   │   │   ├── server.ts       # Server client (route handlers)
│   │   │   └── middleware.ts   # Auth middleware
│   │   ├── api/
│   │   │   ├── activity.ts     # Activity logging helper
│   │   │   ├── health.ts       # Health computation
│   │   │   └── validation.ts   # Shared validation rules
│   │   └── types/
│   │       └── database.ts     # Generated types from Supabase
│   └── components/
│       ├── ui/                 # Base UI components
│       ├── dashboard/          # Dashboard-specific components
│       └── forms/              # Form components
├── mcp/
│   ├── server.ts               # MCP server entry point
│   ├── tools/                  # Tool definitions (1:1 with REST)
│   └── connector/
│       ├── adf-parser.ts       # ADF markdown parser
│       └── sync.ts             # Sync orchestration
├── supabase/
│   ├── migrations/             # SQL migration files
│   ├── seed.sql                # Seed data (5-8 real projects)
│   └── config.toml
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

## Error Handling Strategy

### API Errors

Consistent JSON error response format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Tasks in flat projects cannot have a plan_id",
    "details": { "field": "plan_id", "constraint": "workflow_type=flat" }
  }
}
```

| HTTP Status | Usage |
|-------------|-------|
| 400 | Validation errors, malformed input |
| 401 | Missing or invalid auth |
| 403 | Data origin enforcement (synced entity mutation), unauthorized |
| 404 | Entity not found |
| 409 | Conflict (duplicate source_id, etc.) |
| 500 | Unexpected server error |

### MCP Error Handling

MCP tools return errors in MCP's standard error format, translating HTTP errors:
- 4xx → tool error with descriptive message
- 5xx → tool error with generic message (no internal details leaked)

### ADF Sync Errors

- **Parse failure:** Log warning, skip unparsable artifact, continue sync
- **API rejection:** Log error with context, continue with remaining entities
- **Partial sync:** Report summary (N synced, M failed) in tool response
