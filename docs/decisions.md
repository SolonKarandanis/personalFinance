# Project Decisions

Personal finance dashboard — a web app for tracking accounts, transactions, categories, and budgets. This document records the architecture and scope decisions made during planning, along with the alternatives considered and why they were passed on.

## Stack overview

| Concern       | Choice                          |
|----------------|----------------------------------|
| Monorepo tool  | Turborepo                       |
| Backend        | NestJS                          |
| Database       | PostgreSQL                      |
| ORM            | TypeORM                         |
| API style      | Plain REST (Nest controllers)   |
| Auth           | Passport.js + JWT (self-rolled) |
| Frontend       | Angular 22                      |

## Account balance: cached, kept in sync via DB triggers

`Account` has two balance fields: `initialBalance` (user-editable, covers real-world history predating when the account was added) and `currentBalance` (derived, never written directly by application code).

Considered computing `currentBalance` on every read (`initialBalance + SUM(transactions)`) vs. caching it in a column. Chose to cache it, and chose to keep it in sync via **Postgres triggers** rather than application code, specifically because future write paths (CSV import, Plaid sync) are already planned — a trigger fires no matter what writes a `transactions` row, while application-level recalculation only works if every current *and future* write path remembers to call it. For a domain where balance correctness is the entire point of the app, that guarantee was worth the cost of moving some logic into SQL instead of TypeScript.

`Transaction.amount` is **signed** (expense = negative, income = positive; each leg of a transfer carries whatever sign matches its own account's effect) specifically so the balance math is a flat sum with no `CASE WHEN type = ...` branching.

Two triggers, added in `AddAccountBalanceTriggers` migration:
- `trg_accounts_initial_balance_change` (`BEFORE INSERT OR UPDATE ON accounts`) — seeds `currentBalance = initialBalance` on creation, and shifts `currentBalance` by the same delta if `initialBalance` is edited later.
- `trg_transactions_balance` (`AFTER INSERT OR UPDATE OR DELETE ON transactions`) — adjusts the owning account's `currentBalance` by the transaction's signed amount; an `UPDATE` reverses the old row's effect on the old account and applies the new row's effect on the new account, which is correct whether or not `accountId` itself changed.

Both were verified directly with SQL (insert/update/delete/initialBalance-edit sequence, wrapped in a rolled-back transaction) before any application code was built on top — caught a real bug where the first version only handled `initialBalance` *changes*, not the initial seed on account creation (new accounts started at 0 instead of matching `initialBalance`).

## Category/Transaction type consistency, and why CategoryType has a TRANSFER value

Decided that creating/updating a `Transaction` with a `categoryId` must validate `category.type === transaction.type`, rejecting the mismatch rather than just discouraging it in the UI — the dashboard's core features (spending-by-category, budget-vs-actual) are aggregations grouped by category, and a mismatched category corrupts those numbers silently rather than visibly. This is the same principle already applied to Categories' own subcategory rule (child's `type` must match its parent's).

The open question this raised: `Transaction.type` has three values (`income`/`expense`/`transfer`), but `CategoryType` originally only had two. Considered blocking `categoryId` entirely for `transfer` transactions (a transfer between your own accounts isn't income or spending) vs. adding `CategoryType.TRANSFER`. Chose to add it:
- The consistency rule becomes uniform across all three transaction types with no special case, instead of needing a carve-out for transfers specifically.
- It's strictly more capable, not more restrictive — transfers can still go uncategorized, but can now also be meaningfully labeled (why the money moved: "Savings Transfer", "Debt Payment", etc.) rather than being blocked from categorization altogether.
- Transfer categories stay informational, not counted as spending — `transfer`-type transactions already have to be excluded from expense/income totals in any aggregation regardless of whether transfer categories exist, so this doesn't add new reporting complexity.

Seeded 4 default transfer categories (Savings Transfer, Investment Transfer, Debt Payment, Credit Card Payment) alongside the original 17 income/expense defaults.

**Postgres migration gotcha hit while implementing this**: widening a Postgres enum (`ALTER TYPE ... ADD VALUE`) and then using that new value (e.g. an `INSERT` referencing it) **cannot happen in the same transaction** — Postgres rejects it. Since each TypeORM migration's `up()` runs in its own transaction, the enum-widening migration (`AddTransferCategoryType`) and the seed migration that uses the new value (`SeedTransferDefaultCategories`) had to be two separate migration files, not combined into one. Worth remembering for any future Postgres enum extension followed by a data seed.

## Authorization pattern

Two different ownership-check patterns, chosen deliberately per case rather than one-size-fits-all:

- **User self-service routes** (`/users/:domainId/...`) use a guard (`OwnDomainIdGuard`) that compares the JWT's `domainId` claim against the URL's `:domainId`. This works because for these routes the URL identifier *is* the owner identifier — no DB lookup needed, just a claim comparison.
- **Account/Category/Transaction/Budget** (once built) will instead scope every service query by `userId` directly, e.g. `findOneBy({ domainId, userId })`, rather than a separate ownership guard. For these, the URL identifier is the *resource's* id, not the owner's — a guard would need to load the row to check ownership, then the service loads it again to act on it. Scoping the query itself does the lookup and the enforcement in one step, and returns 404 (not 403) when a `domainId` belongs to another user — a 403 would confirm the resource exists, leaking information a 404 doesn't. Standing rule: every service method for these entities takes `userId` (from the JWT) alongside `domainId`, and always filters by both together.

## Backend: NestJS

Chosen as the API framework. Decorator-based, dependency-injection-driven — this shaped several downstream choices below (ORM, frontend).

## Database & ORM: PostgreSQL + TypeORM

Considered TypeORM, Prisma, and Drizzle.

- **TypeORM** — chosen. First-class official integration (`@nestjs/typeorm`), and its decorator/DI style matches Nest's own architecture directly — most Nest tutorials and starters pair the two for this reason.
- **Prisma** — best standalone DX and type-safety, but doesn't use decorators/DI natively; would need a `PrismaService` wrapper to fit into Nest's module system. Passed on in favor of the more native fit.
- **Drizzle** — lightest weight and most SQL-transparent, best suited to serverless/edge deployments. Weakest "native" fit with Nest (no decorators, manual provider wiring). A split approach (TypeORM for CRUD, Drizzle for dashboard/reporting queries) was considered but rejected — two connection pools and duplicated schema definitions (Drizzle schema mirroring TypeORM-managed tables) added real maintenance overhead for a solo project. Decision: start with TypeORM everywhere and use its QueryBuilder/raw SQL for analytics queries; revisit Drizzle only if that becomes genuinely painful.

## API style: Plain REST

Considered `nestjs-trpc` and oRPC as alternatives to standard `@Controller()` REST endpoints.

- **tRPC / nestjs-trpc** — gives end-to-end type safety by sharing the router's TypeScript type directly with the frontend (no schema/codegen). Works best in a monorepo where the frontend can import that type, and `@trpc/react-query` pairs natively with TanStack Query. Not adopted here since the frontend is Angular, where tRPC client support is much thinner, and a REST/OpenAPI surface was preferred over TS-only typing.
- **oRPC** — similar type-safe RPC approach, but OpenAPI-first: auto-generates OpenAPI docs from the same procedure definitions, making it a better fit if third-party or non-TypeScript clients (e.g. a future mobile app) need to consume the API.
- **Decision**: neither is needed without third-party/non-TS API consumers. Both would also replace REST controllers rather than layer on top of them, adding architectural complexity for no current benefit. Plain REST it is.

## Auth: Passport.js + JWT

Considered a self-rolled Passport.js setup vs. a managed provider (Clerk, Auth0, Supabase Auth).

- **Decision**: self-rolled Passport.js + JWT. Standard NestJS approach (`@nestjs/passport`, `passport-local` for login, `passport-jwt` for protecting routes), full control, no external dependency or cost.
- Access token (short-lived) + refresh token (longer-lived, rotated) pattern.
- Passwords hashed with bcrypt or argon2.
- Managed providers were a reasonable alternative (handle password reset/email verification/social login out of the box) but weren't necessary for this project's scope.

### Token transport: split, not all-cookies

Considered putting both tokens in cookies vs. keeping the original all-JSON-body design. Chose a split instead of either extreme:

- **Refresh token → httpOnly cookie** (`sameSite: strict`, scoped to `path: /auth/refresh` only, `secure` in production). Long-lived (7 days) and highly sensitive, so keeping it out of reach of JavaScript entirely removes it as an XSS target.
- **Access token → stays in the JSON response body**, held in memory by the client and sent via `Authorization: Bearer` header, unchanged from the original design. Short-lived (15 min), so a worst-case XSS exposure window is small, and keeping it out of cookies means it's never auto-attached to requests — which is what makes header-based auth naturally CSRF-resistant.

Putting the refresh token in a cookie does introduce some CSRF surface on `/auth/refresh` specifically, since browsers auto-attach cookies. `sameSite: strict` closes the large majority of that for a same-origin SPA; a full CSRF-token scheme was considered unnecessary on top of that, since every other authenticated action stays header-based and is unaffected.

`JwtStrategy`/`JwtAuthGuard` (access token validation) didn't need to change at all — only `JwtRefreshStrategy` (now reads the cookie via a custom extractor instead of `ExtractJwt.fromBodyField`) and `AuthController` (sets/clears the cookie via `@Res({ passthrough: true })`, alongside the existing server-side revocation in `AuthService`). Requires `cookie-parser` and CORS configured with `credentials: true` and an explicit origin (`CORS_ORIGIN` env var) — `origin: '*'` doesn't work once credentials/cookies are involved. Verified end-to-end with curl's cookie jar: register/login set the cookie, refresh works via cookie with no body needed, refresh without a cookie 401s, and logout both clears the cookie client-side and revokes it server-side.

## Frontend: Angular 22

Considered Angular, AnalogJS, and a React SPA (Vite + TanStack Router + TanStack Query).

- **Angular** — chosen. Shares a mental model with NestJS: both use decorators and dependency injection (Nest's architecture was explicitly inspired by Angular's), so switching between backend and frontend code feels consistent. `HttpClient` + interceptors gives a clean, centralized way to attach the JWT to every request and handle 401→refresh logic; router guards (`CanActivate`) map directly to the auth-guard pattern needed for protected dashboard routes.
- **AnalogJS** — a meta-framework on top of Angular adding SSR/SSG and file-based routing (Angular's answer to Next.js). Explicitly ruled out: this dashboard sits behind auth, so there's no SEO benefit to SSR, and it would add hydration/server-client complexity for no real gain. Its bundled API-routes feature would also be redundant since NestJS is already the API layer.
- **TanStack Router (React SPA)** — a strong alternative, especially given `@trpc/react-query`'s native pairing with TanStack Query. Passed on once Angular was chosen for the DI/decorator consistency with the backend.

## Frontend UI/state stack: Spartan UI + NgRx Signal Store + httpResource-based repositories

**UI library**: Spartan UI (`@spartan-ng/brain` + helm — shadcn-style two-layer: unstyled accessible primitives from npm, styled components copied into the codebase and owned there), on Tailwind CSS v4.

**State management**: NgRx Signal Store (`@ngrx/signals`), not classic NgRx store/effects.

**Architecture layering**, modeled on the documented conventions in a reference project (`/home/solonk/4TB/Projects/Spring/patient-management/frontent/docs/architecture-boundaries.md` and `architecture-state-management.md`), adapted rather than copied 1:1:

- `Repository → Store → Service → smart/dumb Component`. Components never call a data-access service directly; only services touch stores; only smart components (`Page`/`Search`/`Detail`/`Edit`/`Overview` suffixes) touch services. A store never depends on another store — combining several is a service's job.
- **Signal Store granularity**: a store manages exactly one responsibility — Search/list state, Detail/edit state, Lookup data, a piece of UI state, or (new category, not in the reference doc) read-only aggregate/dashboard state. A "manage" CRUD feature is always at least two stores (Search + Detail), never one.
- **Deliberate deviation from the reference project**: this project uses Angular's `httpResource()` for *every* Repository GET method, not just the one-off read-only-aggregate-store exception the reference project uses it for. POST/PUT/PATCH/DELETE stay on plain `HttpClient`. Consequence: `resourceCallState()` (adapting an `httpResource`'s own status signals to the same `loading`/`loaded`/`error`/`status` shape `withCallState()` produces) becomes the *normal* way every store's read side reports state, while `withCallState()` narrows to just the write/mutation side.
- **Consequence for staying in sync after a mutation**: rather than manually splicing a mutation's HTTP response into store state (what the reference project does), a successful mutation calls `.reload()` on the affected `httpResource`(s). Avoids two sources of truth for the same server data now that `httpResource` owns reads.
- **Reactive/live filtering**: search/list criteria are signals feeding directly into a store's `httpResource` request function, so typing a filter auto-refetches — no explicit "Search" button, unlike the reference project's `rxMethod`-dispatched search. Enabled specifically by using `httpResource` for reads.
- **Sheriff** (Nx domain-boundary lint enforcement, used by the reference project) — explicitly skipped. It's calibrated for multi-contributor codebases; not worth the setup overhead for a solo project. Conventions are followed by discipline, not automated enforcement.
- **Category gets two separate stores** despite both reading from the same `/categories` endpoint: `CategoryLookupStore` (shared — minimal, just the list, used by Transaction/Budget form dropdowns) and `CategorySearchStore`/`CategoryDetailStore` (the dedicated "manage categories" CRUD screen). Different UI jobs, so different stores, per the granularity rule.
- Planned per-domain stores: `users` → `UserDetailStore` only (always "my own profile", no search needed); `accounts` → Search+Detail; `categories` → Lookup + Search+Detail (above); `transactions` → Search+Detail (Detail handles both normal create and `createTransfer`, since a transfer is still "a Transaction" once it exists); `budgets` → Search+Detail; `dashboard` → future aggregate store, once backend reporting endpoints exist. `AuthStore` is the one cross-cutting exception to the granularity categories (holds the in-memory access token; the refresh token itself lives in the httpOnly cookie already built on the backend).
- **Smart component file naming**: `<name>-page.component.ts`, class `<Name>PageComponent` (e.g. `accounts-page.component.ts` → `AccountsPageComponent`). The auth slice was originally built with `<name>.page.ts` / class `<Name>Page` (no `Component` suffix); changed to the current convention once the `accounts` feature started, to stay closer to standard Angular file-naming (kebab-case file mirrors the class name, `.component.ts` suffix) while keeping `-page` in the name to distinguish smart page-level components from dumb ones. Applied retroactively to the auth/home pages so the whole repo is consistent.

### Toolchain gotchas hit setting this up (Angular 22.1.0)

- `@spartan-ng/cli init` auto-runs `npm install` regardless of the project's actual package manager — failed here on jsdom's postinstall step (`npm-run-all: not found`), an npm-vs-pnpm hoisting difference, not a real problem. Just run `pnpm install` manually afterward.
- That same run left `tailwindcss` itself out of `package.json` (only added `@spartan-ng/brain`, `@angular/cdk`, `tailwind-merge`, `tw-animate-css`) and pinned `@angular/cdk` to an exact old patch (`22.0.0`) mismatched with the rest of Angular (`^22.1.0`). Both had to be fixed by hand.
- **Real bug in `@angular/build@22.1.1`**: its persistent build cache (`.angular/cache`) writes something it can't correctly read back — a build with a *fresh* cache succeeds, but the very next build (reading that cache) reproducibly fails with `"contents" must be a string or a Uint8Array [plugin angular-compiler]`. Confirmed by alternating fresh-cache/cached builds. Fixed by disabling the cache entirely: `frontend/angular.json` → `"cli": { "cache": { "enabled": false } }`. Don't re-enable without retesting against a newer Angular patch.
- TypeScript 6.0 deprecated `baseUrl` (errors by default unless silenced). Path aliases (`@core/*` etc.) in `tsconfig.json` are declared without `baseUrl`, using `./`-prefixed path values instead (bundler module resolution doesn't need `baseUrl` alongside `paths`).
- `@ngrx/signals`/`@ngrx/operators` stable (`21.1.1`) declares peer `@angular/core: ^21.0.0` — doesn't support Angular 22. Used `22.0.0-beta.0` instead (explicitly declares `^22.0.0`, published ~10 days before this was set up). Revisit once a stable 22.x ships.

## Monorepo: Turborepo

Considered Nx, Turborepo, and plain pnpm workspaces (no build orchestrator).

- **Nx** — has first-party generators for both Nest and Angular, plus caching, task orchestration, and a dependency graph with enforceable module boundaries. Passed on: its main value (caching/graph/boundary enforcement at scale) matters more for larger teams than a solo project, and it's more machinery than needed here.
- **Plain pnpm workspaces** — simplest option, would still allow sharing a `packages/shared-types` library between `api` and `frontend`, but no task caching or orchestration.
- **Decision**: Turborepo — a middle ground. Gets the caching benefit of Nx without its generators/opinionated plugin ecosystem.

## Scope decisions

- **Single currency only.** No multi-currency/FX support — accounts and transactions assume one currency (e.g. USD). Ruled out an FX-rates table and conversion logic as unnecessary complexity for personal use.
- **Manual transaction entry for v1**, but the `Transaction` schema plans ahead for CSV import and bank sync (Plaid) later via `source`, `externalId`, and `isPending` fields — cheap to add now, painful to retrofit once real transaction data exists.
- **Transfers** between a user's own accounts are modeled as two paired `Transaction` rows (linked via `transferPairId`) rather than a separate `Transfer` entity, keeping account balances a simple sum-of-transactions.

## Data model

- **User** — id, email, passwordHash, name, currency (single default, e.g. "USD"), createdAt
- **Account** — id, userId (FK), name, type (checking/savings/credit_card/cash/investment), institution, isArchived, createdAt
- **Category** — id, userId (nullable → system default vs. user-created), name, type (income/expense), parentId (self-FK, for subcategories), icon/color
- **Transaction** — id, accountId (FK), categoryId (FK, nullable), amount, date, description/merchant, notes, type (income/expense/transfer), transferPairId (self-FK), source (manual/csv_import/plaid), externalId (nullable, unique per source), isPending (bool, default false), createdAt
- **Budget** — id, userId (FK), categoryId (FK), amount, period (weekly/monthly/yearly), startDate

## Repo & infra notes

- Repo: `personalFinance/`, top-level `api/` (NestJS) and `frontend/` (Angular) packages — not nested under an `apps/` directory.
- GitHub remote: `https://github.com/SolonKarandanis/personalFinance.git`.
- **Node version**: Angular 22 requires Node ≥24.15.0. The system's default Node (via nvm) was v22.14.0, so 24.18.1 was installed alongside it (global default left untouched) and pinned for this repo via `.nvmrc` and `package.json` engines. Run `nvm use` in the repo to pick it up.
- `lmdb`'s native addon fails to build during `pnpm install` on this system (old system g++/libstdc++). It's only an optional Angular CLI build-cache backend — harmless, builds and serving work fine without it.

## Status

Scaffolded and pushed to GitHub: Turborepo pipeline wired, `api` (NestJS 11) and `frontend` (Angular 22.1.1) both build and boot successfully.

Not yet done: Postgres connection/TypeORM config, entities, auth module, any UI, `packages/shared-types`.
