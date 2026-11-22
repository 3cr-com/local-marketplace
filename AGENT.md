# AGENTS.md

Development instructions for this React, Astro, and Supabase project.

## Start each task

- Inspect `package.json`, the lockfile, Astro configuration, and the relevant source files. Use the existing package manager, scripts, and libraries.
- Follow these conventions for new code. Where older code differs, work within the existing structure and migrate only the parts needed for the task.
- Keep changes focused. Preserve public routes, API contracts, and compatibility with existing data unless the task calls for a change.

## Project structure

Create directories as they become necessary.

```text
src/
  pages/                       Astro pages and API endpoints
    api/
  layouts/                     Shared Astro page layouts
  components/
    ui/                        Reusable, feature-independent UI
  features/
    projects/                  Example feature
      components/              Feature-specific Astro and React views
      hooks/                   Feature-specific React behavior
      models/                  Domain types, rules, and invariants
      server/
        project.controller.ts  Adapts requests to service calls
        project.service.ts     Implements use cases
        project.repository.ts  Supabase queries and RPC calls
      project.schema.ts        Runtime validation of feature inputs
  lib/
    supabase/
      browser.ts               Browser-safe Supabase client
      server.ts                Request-scoped Supabase client for SSR
      database.types.ts        Generated Supabase schema types

supabase/
  config.toml
  migrations/                  Versioned SQL, including functions and policies
  functions/
    _shared/                   Helpers reused by multiple Edge Functions
    send-invitation/           Example deployable Edge Function
      index.ts                 HTTP entry point
      handler.ts               Request handling, when worth splitting out
      invitation.service.ts    Function-specific business logic
```

## MVC in Astro and React

- **View.** Use Astro pages and layouts to compose pages. Use React for interactive UI and hydrate only the islands that need browser interactivity. Keep rendering, presentation state, and event handling in components and hooks. Keep business rules in the model or service.
- **Controller.** Treat Astro API routes, actions, and server-rendered page loaders as entry points. Parse and validate inputs, resolve the session, call a service, and translate the result into a response or redirect. Extract a feature controller when the logic is shared or the entry point becomes hard to read.
- **Model.** Put domain types and rules in `models/`. Use services to coordinate use cases and enforce business rules. Put Supabase queries, RPC calls, and row mapping in repositories. Use an atomic database operation when multiple writes must succeed together.
- **Dependency direction.** Controllers call services, and services use models and repositories as needed. Models stay independent of Astro, React, and Supabase. Server modules stay out of hydrated React components and their import chains. Browser code calls an application endpoint or action for server-only operations.
- Keep a component in the feature that owns it. Move it to `src/components/ui/` once it has a real cross-feature use and can work without feature-specific dependencies. Create layers only when they have a distinct responsibility.

## Naming and Clean Code

- Use TypeScript for new application code. Prefer explicit types at public boundaries, inference for clear local variables, and runtime validation for external input. Avoid `any` and assertions that bypass validation.
- Use `PascalCase` for components, component filenames, and TypeScript types, such as `ProjectCard.tsx` and `ProjectCardProps`. Use `camelCase` for functions and variables. React hooks start with `use`, such as `useProjectFilters.ts`.
- Use `kebab-case` for feature folders, URL segments, and Edge Function directories. Follow Astro's file-based routing syntax, such as `projects/[id].astro`. Use responsibility suffixes for server modules, such as `project.service.ts`. Use `snake_case` for new PostgreSQL identifiers.
- Choose names that describe intent. Prefer `listProjectsForUser` over `getData`. Keep each function at one level of abstraction and give each module a clear reason to change. Use guard clauses where they simplify control flow.
- Keep dependencies explicit. Inject dependencies at boundaries when doing so makes behavior easier to test or reuse. Extract repeated business rules when the repetition represents the same rule. Skip interfaces and wrappers that add no meaningful boundary.
- Explain constraints or tradeoffs in comments. Use typed errors or explicit results for expected failures, and map them to safe user-facing messages at the boundary.

## Supabase

- Keep browser, request-scoped SSR, and privileged clients separate. Expose only the publishable or legacy anon key to the browser. Keep secret and service-role keys in server-only configuration and out of logs, responses, and client bundles.
- On the server, verify identity with the configured Supabase Auth flow. Derive the acting user from verified credentials. Enforce authorization in the application where needed and use Row Level Security with least-privilege policies on client-accessible tables. Use a user-scoped client for operations that should enforce that user's policies.
- Keep app-side data access in feature repositories. Use generated database types and regenerate them after schema changes. Check Supabase errors explicitly and translate database failures at the appropriate boundary.
- Add schema changes, SQL functions, and policy changes in new migrations under `supabase/migrations/`. Name each migration for the change it makes. Preserve applied migration history. Prefer `SECURITY INVOKER` for SQL functions. If elevated privileges are required, document the reason, set a safe `search_path`, qualify object names, and restrict execution grants.
- Treat each Edge Function as its own deployable module. Keep `index.ts` focused on wiring and move substantial logic into nearby modules. Use `_shared/` for code used by multiple functions, such as auth or response helpers. Keep deployment dependencies within the Supabase functions tree and compatible with the Edge runtime.
- Validate Edge Function inputs and verify the caller according to the endpoint's auth model before performing privileged work. For handlers that may be retried, make side effects idempotent where the operation requires it.

## Unit tests

- **Create or edit unit tests only when the user explicitly asks for unit tests.** A feature request, bug fix, or refactor alone does not trigger test authoring. Wait for the user's request before adding test files, a runner, or test configuration.
- When asked, cover the newly introduced behavior in scope, including new branches in existing files. Cover success, relevant boundary conditions, and expected failures. Backfill unrelated legacy behavior only when explicitly requested.
- Use the existing runner and file conventions. If no runner exists and the user asks for tests, prefer Vitest for application TypeScript, React Testing Library with Vitest for React interactions, and `Deno.test` for runtime-specific Edge Function logic.
- For application tests, default to colocated `*.test.ts` or `*.test.tsx` files when there is no established convention. For Deno tests, use `*_test.ts`.
- Assert observable behavior. Use small fakes for network, database, time, and other external dependencies. Unit tests must run without live Supabase credentials, a production database, or network calls. SQL migration, RPC, and RLS behavior require database integration checks and should be reported separately from unit coverage.
- Running existing tests is encouraged for verification, even when writing tests is outside the task.

## Before finishing

- Review the diff for scope, accidental breaking changes, server-only imports, and exposed secrets.
- Run the relevant existing type checks, lint, build, and tests supported by the repository. For database changes, use the local Supabase environment for migration and authorization checks when available.
- Report the change, the checks you ran, and anything you could not verify. State the scope of any tests you added.