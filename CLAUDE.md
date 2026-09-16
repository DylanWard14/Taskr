# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Taskr is a team-based task management application. Users sign in, see the teams they belong to, and manage each team's tasks on a kanban-style board (todo/in-progress/done), with comments and media attachments on tasks.

- A user can belong to multiple teams, and a team has multiple member users (many-to-many membership).
- A user must be a member of a team to view or act on that team's tasks — this is enforced both by the JWT-based authorization and at the DB/query layer, not just hidden in the UI.
- Tasks carry more fields than just title/description/status — e.g. assignee, due date, priority, created/updated timestamps.
- Team membership has roles (e.g. owner/admin vs. regular member) governing who can manage team membership or delete tasks.

## Stack

- **Frontend**: React + TypeScript, Material UI, built/served with [Vite](https://vitejs.dev/). Routing is handled by [TanStack Router](https://tanstack.com/router); network requests/server state are handled by [TanStack Query](https://tanstack.com/query) rather than ad-hoc `fetch`/`useEffect` data loading.
- **Backend**: TypeScript on [Hono](https://hono.dev/)
- **Database**: PostgreSQL, accessed directly by the Hono backend via [Knex](https://knexjs.org/) as the query builder — Knex also handles schema migrations

## Project Structure

The repo is split into two top-level folders:

- `client/` — the React frontend
- `server/` — the Hono backend

`client/` follows a feature-based structure (features own their own components/hooks/api calls/types, rather than splitting by file type across the whole app). Example:

```
client/
  src/
    app/                # app shell: TanStack Router route tree/config, providers (incl. QueryClientProvider), layout
    features/
      auth/
        components/      # e.g. LoginForm
        api/              # login/logout requests, JWT handling
        hooks/            # e.g. useAuth — TanStack Query hooks wrapping api/
        types.ts
      teams/
        components/       # e.g. TeamList, TeamSwitcher
        api/
        hooks/             # e.g. useTeams — TanStack Query hooks wrapping api/
        types.ts
      tasks/
        components/       # e.g. TaskBoard, TaskCard, TaskDetail, StatusColumn
        api/
        hooks/             # e.g. useTasks, useUpdateTaskStatus — TanStack Query hooks wrapping api/
        types.ts
      comments/
        components/        # e.g. CommentList, CommentInput
        api/
        hooks/              # TanStack Query hooks wrapping api/
        types.ts
    components/           # shared/reusable UI not owned by one feature
    lib/                  # shared utilities, API client setup, etc.
```

Within a feature, `api/` holds the raw request functions (e.g. wrapping the shared API client from `lib/`) and `hooks/` wraps them in TanStack Query `useQuery`/`useMutation` hooks — components consume the hooks, not `api/` directly. Route definitions for a feature's pages live in `app/` (TanStack Router's file-based or code-based route tree, per whichever convention is adopted when routing is set up), not inside the feature folder.

`server/` follows common Hono REST API conventions: a thin entry point that mounts per-domain route modules, with each domain split into route/handler, validation, and service/repository layers, mirroring the client's feature boundaries. Example:

```
server/
  src/
    index.ts               # app entry: creates Hono app, mounts routes, starts server
    db/
      knexfile.ts           # Knex connection config
      migrations/
      seeds/
    middleware/
      auth.ts                # JWT verification middleware
      error-handler.ts
    modules/
      auth/
        routes.ts             # POST /login, POST /logout, etc.
        service.ts             # token issuing/verification logic
        schema.ts               # request/response validation (e.g. zod)
      teams/
        routes.ts               # GET /teams, GET /teams/:id
        service.ts
        repository.ts            # Knex queries for teams table
        schema.ts
      tasks/
        routes.ts               # GET/POST/PATCH/DELETE /teams/:id/tasks
        service.ts
        repository.ts
        schema.ts
      comments/
        routes.ts               # GET/POST /tasks/:id/comments
        service.ts
        repository.ts
        schema.ts
      media/
        routes.ts                # upload endpoint(s) used by task/comment bodies
        service.ts
    lib/                    # shared utilities (e.g. API client wrappers, config loading)
    types/                   # shared/domain types
```

Each `modules/<domain>` groups its route definitions, request validation, and business logic/DB access together, and `index.ts` composes them with `app.route(...)`.

## Core Domain

- **Users** sign in and belong to one or more **Teams**.
- Selecting a team shows that team's **Tasks**.
- Tasks can be created, edited, and deleted, and moved between statuses (`todo`, `in-progress`, `done`) — i.e. a kanban-style board per team.
- Users can add **Comments** to tasks.
- Both task descriptions and comments support attaching media (e.g. images), not just plain text.

## Authentication

- Auth is JWT-based: the Hono backend issues and verifies JWTs itself and uses them to authorize requests (e.g. checking team membership before returning a team's tasks).

## Local Development

- The app is intended to run locally via Docker and Docker Compose (e.g. `docker compose up`), rather than running the frontend/backend/database as separate bare-metal processes.

## Workflow

- Work should be broken into small, manageable chunks and submitted as separate, focused pull requests on GitHub rather than one large PR, so each change is easy to review.
- When PRs depend on one another, stack them (branch off the prior PR's branch) rather than waiting for each to merge before starting the next.
- All code should have unit tests, and the test suite must be passing before a PR is considered done. Use [Vitest](https://vitest.dev/) as the test runner (frontend and backend).
- All functionality should also be validated with end-to-end tests using [Cypress](https://www.cypress.io/).

## Status

The repository is scaffolded: `client/` (Vite + React + TS + MUI) and `server/` (Hono + TS + Knex) exist with the module/feature structure described above, wired as npm workspaces from the root `package.json`. Feature modules currently contain minimal stubs (e.g. `teams`/`tasks`/`comments` routes return data with no real auth/business logic yet) — this is the base other work builds on.

### Packages / workspaces

- Root `package.json` declares npm workspaces `["client", "server"]`. Run `npm install` once from the repo root — it installs both workspaces.
- Root convenience scripts: `npm run dev:client`, `npm run dev:server`, `npm run build`, `npm run test`, `npm run lint` (each delegates to the matching workspace script via `--workspace`).
- There are currently no shared/published types between `client/` and `server/` — each side defines its own domain types (`client/src/features/*/types.ts`, `server/src/modules/*/schema.ts`) shaped to match. Revisit if duplication becomes painful.

### Build / lint / dev commands

Run from the repo root, or `cd client` / `cd server` and drop the `--workspace` flag:

- Dev servers: `npm run dev --workspace server` (Hono on `:3000`, via `tsx watch`), `npm run dev --workspace client` (Vite on `:5173`)
- Build: `npm run build --workspace server` (`tsc`), `npm run build --workspace client` (`tsc -b && vite build`)
- Lint: `npm run lint --workspace server` (ESLint), `npm run lint --workspace client` (oxlint)

### Tests

- Unit tests use Vitest in both workspaces:
  - Run all: `npm run test --workspace server` / `npm run test --workspace client`
  - Watch mode: `npm run test:watch --workspace server` / `npm run test:watch --workspace client`
  - Run a single file: `npm run test --workspace server -- src/modules/teams/service.test.ts` (or `cd server && npx vitest run <path>`); same pattern for `client`
  - Run a single test by name: append `-t "<test name pattern>"` to the above
- Client component tests use `@testing-library/react` + jsdom, set up in `client/src/test/setup.ts` / `client/vitest.config.ts`.
- E2E tests use Cypress, configured in `client/cypress.config.ts` against `http://localhost:5173`:
  - Interactive: `npm run e2e:open --workspace client` (requires the dev stack running, e.g. via `docker compose up`)
  - Headless: `npm run e2e --workspace client`

### Docker Compose

`docker-compose.yml` at the repo root defines three services:

- `db` — Postgres 16, exposed on `5432`, credentials from `.env` (see `.env.example`), with a named volume `db-data` and a healthcheck the other services wait on
- `server` — builds `server/Dockerfile`, exposed on `3000`, depends on `db` being healthy, source bind-mounted from `./server/src` for live editing
- `client` — builds `client/Dockerfile`, exposed on `5173`, depends on `server`, source bind-mounted from `./client/src`

Commands: `docker compose up --build` to build and run the stack, `docker compose down` to tear it down (`-v` also drops the `db-data` volume).

Copy `.env.example` to `.env` before running Compose; it supplies `DB_*`, `JWT_SECRET`, `PORT`, and `VITE_API_BASE_URL`.

### Knex migrations / seeds

Migrations live in `server/src/db/migrations`, seeds in `server/src/db/seeds`, config in `server/src/db/knexfile.ts`. From `server/`:

- Create a migration: `npm run migrate:make -- <name>`
- Run migrations: `npm run migrate`
- Roll back the last batch: `npm run migrate:rollback`
- Run seeds: `npm run seed`

The initial migration (`20260101000000_init.ts`) creates `users`, `teams`, `team_members` (many-to-many with a `role` enum: `owner`/`admin`/`member`), `tasks` (status/priority/assignee/due date), `comments`, and `media` (attachable to either a task or a comment).

### Media storage

Not yet implemented — `server/src/modules/media` is a stub (`POST /media/upload` returns 501). The `media` table already supports attaching an uploaded file to either a task or a comment via nullable `task_id`/`comment_id` foreign keys. Decide on local disk vs. object storage (e.g. S3-compatible) when building this out.
