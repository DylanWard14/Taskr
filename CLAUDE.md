# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Taskr is a team-based task management application. Users sign in, see the teams they belong to, and manage each team's tasks on a kanban-style board (todo/in-progress/done), with comments and media attachments on tasks.

- A user can belong to multiple teams, and a team has multiple member users (many-to-many membership).
- A user must be a member of a team to view or act on that team's tasks — this is enforced both by the JWT-based authorization and at the DB/query layer, not just hidden in the UI.
- Tasks carry more fields than just title/description/status — e.g. assignee, due date, priority, created/updated timestamps.
- Team membership has roles (e.g. owner/admin vs. regular member) governing who can manage team membership or delete tasks.

## Stack

- **Frontend**: React + TypeScript, Material UI, built/served with [Vite](https://vitejs.dev/)
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
    app/                # app shell: routing, providers, layout
    features/
      auth/
        components/      # e.g. LoginForm
        api/              # login/logout requests, JWT handling
        hooks/            # e.g. useAuth
        types.ts
      teams/
        components/       # e.g. TeamList, TeamSwitcher
        api/
        hooks/             # e.g. useTeams
        types.ts
      tasks/
        components/       # e.g. TaskBoard, TaskCard, TaskDetail, StatusColumn
        api/
        hooks/             # e.g. useTasks, useUpdateTaskStatus
        types.ts
      comments/
        components/        # e.g. CommentList, CommentInput
        api/
        hooks/
        types.ts
    components/           # shared/reusable UI not owned by one feature
    lib/                  # shared utilities, API client setup, etc.
```

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

This repository is not yet scaffolded — no source, package manifests, or build tooling exist yet. As the project is set up, update this file with:

- Actual build/lint/dev commands, how to run a single test with Vitest, and how to run Cypress e2e tests, once a package manager is chosen
- The `docker-compose.yml` services (frontend, backend, Postgres, etc.) and exact commands to build/run/tear down the stack
- How `client/` and `server/` are wired together as packages (npm workspaces vs. independent packages, shared config, etc.)
- Knex migration/seed conventions (how to run/create migrations) once `server/db/migrations` exists
- Media storage approach for task/comment attachments (e.g. object storage vs. local disk, upload flow)
- Any conventions for sharing types between frontend and backend
