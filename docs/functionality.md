# Functionality

Tracks what's actually built vs. what's still planned. See `decisions.md` for the architecture/stack reasoning behind these choices.

## Implemented

### Infrastructure
- Turborepo monorepo (`api` = NestJS, `frontend` = Angular 22), pnpm workspace, shared `dev`/`build`/`lint`/`test` pipeline.
- Postgres connection via TypeORM (`192.168.1.6:5432/financetracker`), migration-based schema (`synchronize: false`), CLI scripts (`migration:generate`/`run`/`revert`).
- Node pinned to 24.18.1 via `.nvmrc` (required by Angular 22).

### Data model
- Entities: `User`, `Account`, `Category` (with subcategories), `Transaction` (with transfer-pairing), `Budget`.
- PK convention across all entities: integer auto-increment `id` (internal, used for all FK relations) + `domainId` UUID (`gen_random_uuid()`, unique — the external-facing identifier).
- `Transaction` has `source`/`externalId`/`isPending` fields, ready for future CSV import/Plaid sync (not built yet — see below).
- `User.status` (`active`/`deactivated`) enforced at login and refresh.

### Auth (`/auth`)
- `POST /auth/register` — creates a user, sets the refresh token cookie, returns `{ accessToken }`.
- `POST /auth/login` — Passport local strategy (email/password), same cookie + response shape as register.
- `POST /auth/refresh` — reads the refresh token from the cookie (not the body), rotates it, sets the new cookie, returns a new `{ accessToken }`. Old refresh tokens are invalidated (SHA-256 hash + constant-time compare, not bcrypt — see decisions.md for why).
- `POST /auth/logout` — revokes the stored refresh token server-side and clears the cookie client-side.
- Deactivated users are rejected at login and refresh (403).
- **Token transport**: refresh token lives in an httpOnly cookie (`sameSite: strict`, scoped to `/auth/refresh`, `secure` in production) — never touched by JS. Access token stays in the JSON response body / `Authorization: Bearer` header, unchanged. See decisions.md for the reasoning. Requires `cookie-parser` + CORS with `credentials: true` (wired in `main.ts`); `CORS_ORIGIN` env var (default `http://localhost:4200`) sets the allowed origin.

### User management (`/users`)
- `GET /users/account` — caller's own profile (derived from JWT), returns `UserDto`.
- `PATCH /users/:domainId` — update `firstName`/`lastName`.
- `PATCH /users/:domainId/password` — change password (requires current password; revokes the stored refresh token on success).
- `PATCH /users/:domainId/activate` / `PATCH /users/:domainId/deactivate` — set account status.
- **Ownership enforcement**: `OwnDomainIdGuard` (stacked after `JwtAuthGuard` on all four `:domainId` routes) checks the JWT's `domainId` claim against the URL's `:domainId` and 403s on mismatch — a user can only act on their own account. `domainId` is now embedded directly in the access/refresh token payload (alongside `sub`/`email`) so this check costs no extra DB query. Verified with two separate users: cross-user access 403s, self-access succeeds.

### Accounts (`/accounts`)
- `POST /accounts` — create (`name`, `type`, optional `institution`/`initialBalance`).
- `GET /accounts` — list all of the caller's accounts.
- `GET /accounts/:domainId` / `PATCH /accounts/:domainId` — get/update one.
- `DELETE /accounts/:domainId` — archives (`isArchived = true`), never a hard delete — `Transaction.account` cascades on delete, so a real DELETE would silently wipe transaction history.
- `Account.currentBalance` is cached, not computed on read, and kept in sync entirely by Postgres triggers (not application code) — see `decisions.md`. Verified through the real API: creating with an `initialBalance` seeds `currentBalance` to match, editing `initialBalance` shifts `currentBalance` by the same delta.
- **Ownership**: no guard here (unlike Users) — every service method takes `userId` from the JWT and scopes the query by `{ domainId, userId }` together, so another user's `domainId` returns 404, not 403. Verified with two users.

### Categories (`/categories`)
- `POST /categories` — create (`name`, `type`, optional `parentDomainId`/`icon`/`color`).
- `GET /categories` / `GET /categories/:domainId` — list/get, visible set is the caller's own categories **plus every system default** (`userId IS NULL`).
- `PATCH /categories/:domainId` — update `name`/`icon`/`color` only; `type` and `parentDomainId` aren't updatable post-creation (would need cascading re-validation of children, not worth the complexity yet).
- `DELETE /categories/:domainId` — a real hard delete, unlike Accounts: `Transaction.category` is already `onDelete: SET NULL`, so deleting a category can't destroy transaction data, only uncategorize it.
- **Ownership split**: reads use `{ domainId, userId } OR { domainId, userId: NULL }`; writes (`update`/`remove`) use `{ domainId, userId }` only — a system default can never be edited or deleted through this API, by anyone, including whoever's "using" it. Verified: writes on defaults 404 for every user, cross-user writes on custom categories 404.
- **Subcategories**: capped at one level (a category with a `parentId` can't itself be a parent — rejected with 400), child's `type` must match the parent's `type` (400 on mismatch), and the parent must be a system default or belong to the same user (cross-user parenting 404s). All four rules verified end-to-end.
- **Default categories**: 17 starter income/expense categories (`SeedDefaultCategories` migration) + 4 transfer defaults — Savings Transfer, Investment Transfer, Debt Payment, Credit Card Payment (`SeedTransferDefaultCategories` migration, run separately because Postgres won't let a newly-added enum value be used in the same transaction that added it — see decisions.md). All plain `INSERT`s, `userId` left `NULL`, no runtime seeding logic.
- `CategoryDto.isSystemDefault` tells clients which categories to hide edit/delete affordances for.
- `CategoryType` has three values — `income`, `expense`, `transfer` — added specifically so `Transaction.type` can validate against `Category.type` with one uniform rule (no special-casing transfers as "never categorized") once Transactions is built. See decisions.md.

### Transactions (`/transactions`)
- `POST /transactions` — create a normal income/expense transaction (`accountDomainId`, optional `categoryDomainId`, positive `amount`, `date`, `description`, optional `notes`, `type`). `type` is restricted to `income`/`expense` at the DTO level — `transfer` is rejected here (400), since a lone transfer row with no pair would be a broken half-state.
- `POST /transactions/transfer` — the only way a `transfer`-type row gets created. Takes `fromAccountDomainId`, `toAccountDomainId`, positive `amount`, plus the same date/description/notes/optional category. Creates both legs atomically in one DB transaction (`dataSource.transaction()`), linked via `transferPairId` — verified: both rows always exist together, both account balances update correctly via the existing triggers.
- `GET /transactions` (optional `?accountDomainId=` filter) / `GET /transactions/:domainId` — ownership is via `Transaction.account.userId` (no direct `userId` column on Transaction), scoped with a relation-based `where: { account: { userId } }`.
- `PATCH /transactions/:domainId` — `description`/`notes`/`date`/`categoryDomainId` always editable; `amount` is rejected (400) for `transfer`-type rows specifically, since editing one leg alone would desync the pair — delete and recreate instead.
- `DELETE /transactions/:domainId` — for a transfer, deletes both legs atomically; a transfer can never end up with only one leg left behind. Verified: both rows removed, both account balances revert correctly.
- **Sign normalization**: `amount` in all DTOs is always a positive magnitude — the client never negates anything. The service applies the sign: negative for `expense`/the transfer source leg, positive for `income`/the transfer destination leg. Storage stays signed as already decided for the balance triggers.
- **Category consistency enforced**: `category.type` must equal `transaction.type` (400 on mismatch) — verified end-to-end. Category resolution reuses the same own-or-system-default visibility rule as Categories.
- **`source`/`externalId`/`isPending` aren't client-settable** here — always `manual`, reserved for the future CSV/Plaid ingestion path.
- Verified: cross-user account ownership blocked on both create and transfer (404, including using someone else's account as a transfer destination).

### Budgets (`/budgets`)
- `POST /budgets` — create (`categoryDomainId`, positive `amount`, `period` [`weekly`/`monthly`/`yearly`], `startDate`). Only one budget per category per user is allowed — creating a second one for a category that already has a budget returns 409, pointing at updating the existing one instead.
- `GET /budgets` / `GET /budgets/:domainId` — standard `{ domainId, userId }` ownership (Budget has a direct `userId` column, no join needed, same pattern as Accounts).
- `PATCH /budgets/:domainId` — `amount`/`period`/`startDate` editable; `categoryDomainId` is not (to track a different category, create a new budget and delete the old one, same philosophy as Category's immutable `type`/`parentId`).
- `DELETE /budgets/:domainId` — a real hard delete; nothing references a Budget by FK, so there's no cascade risk at all (unlike Accounts/Categories).
- **`currentPeriodSpent` is computed on every read, not cached** — unlike `Account.currentBalance`, this is advisory/analytical, not a source of truth about actual money, so a live `SUM` query is the right level of consistency guarantee (see decisions.md).
- **Periods are calendar-aligned**, not anchored to the budget's own `startDate`: weekly = Mon–Sun, monthly = 1st–last day of month, yearly = Jan 1–Dec 31 (`getCurrentPeriodRange` util). `startDate` only clamps the lower bound — activity before it never counts, even if the calendar period technically starts earlier. Verified: an expense dated before `startDate` is correctly excluded from `currentPeriodSpent` while one dated in-period is correctly included.
- Category can be any type (income/expense/transfer) — no restriction, since the spend-vs-target comparison works identically regardless, and some budgeting styles track income or transfer goals the same way as expense limits.
- The spend calculation joins `Transaction → Account` and filters by `Account.userId`, `categoryId`, and the effective date range — same relation-based ownership technique introduced for Transactions.

### Frontend — auth vertical slice complete, domain features not started (updated 2026-08-03)

Architecture: Repository → Signal Store → Service → smart/dumb Component, modeled after `/home/solonk/4TB/Projects/Spring/patient-management/frontent`'s documented conventions (`docs/architecture-boundaries.md`, `docs/architecture-state-management.md`), adapted for this project's own rule — every Repository GET uses Angular's `httpResource()`, every mutation (POST/PUT/PATCH/DELETE) uses plain `HttpClient`. No Sheriff (domain-boundary lint enforcement) — deliberately skipped, not needed at this scale. Full reasoning and the confirmed store-per-domain breakdown are in `decisions.md`.

**Done:**
- Tailwind CSS v4 + Spartan UI (`@spartan-ng/brain` + helm, "nova" style, import alias `@spartan-ng/helm`) installed and building correctly — CSS-first config in `src/styles.css`, light/dark theme tokens in place. `components.json` setup completed (`componentsPath: src/app/shared/ui`) — the earlier non-interactive-setup blocker is resolved.
- Spartan UI components generated via `ng g @spartan-ng/cli:ui <name>`: `button`, `card`, `input`, `label` (`shared/ui/{button,card,input,label,utils}`).
- `@ngrx/signals` / `@ngrx/operators` installed (`22.0.0-beta.0` — stable `21.1.1` doesn't support Angular 22 yet).
- Core infrastructure: `BaseRepository`, `ApiEndpoints` (endpoint URL constants), `withCallState()` (mutation loading/error tracking), `resourceCallState()` (adapts an `httpResource`'s own status signals to the same shape) — both in `core/store/features/`.
- Environments (`environment.ts`/`environment.development.ts`, `apiUrl`) and path aliases (`@core/*`, `@shared/*`, `@app/*`, `@environments/*`) configured in `tsconfig.json`.
- **Auth vertical slice, end to end**:
  - `AuthRepository` (`core/repositories/auth.repository.ts`) — login/register/refresh/logout, all `withCredentials: true` so the refresh cookie round-trips.
  - `AuthStore` (`core/store/auth/`) — the one cross-cutting exception to the store-granularity rule. In-memory `accessToken` signal (never persisted, per decisions.md), `bootstrapped` flag, `isAuthenticated` computed, `login`/`register`/`logout` as `rxMethod`s, and `tryRestoreSession()` as a plain async method (not an rxMethod, since the app initializer needs an awaitable `Promise`).
  - `authInterceptor` (`core/interceptors/auth.interceptor.ts`) — attaches `Authorization: Bearer` + `withCredentials: true` to every request; on a 401 from a non-auth endpoint, calls `/auth/refresh` once and retries the original request, clearing the session on refresh failure.
  - `authGuard` (`core/guards/auth.guard.ts`) — redirects to `/login` when `isAuthenticated()` is false.
  - `app.config.ts` wires `provideHttpClient(withInterceptors([authInterceptor]))` plus `provideAppInitializer(() => authStore.tryRestoreSession())`, which blocks bootstrap until the httpOnly refresh cookie has been checked — so route guards can read `isAuthenticated()` synchronously with no loading state to juggle.
  - `LoginPage` / `RegisterPage` (`app/auth/`) — reactive forms (email/password, plus first/last name for register), real Spartan UI markup (`HlmCard`/`HlmInput`/`HlmLabel`/`HlmButton`), inline error display from `authStore.error()`, redirect-to-`/` via an `effect()` watching `isAuthenticated()`.
  - `HomePage` (`app/home/`) — placeholder landing page behind `authGuard`, just a logout button.
  - `app.routes.ts` — `/login`, `/register` public; `''` → `HomePage` behind `authGuard`.
- Build verified reliably green across multiple consecutive runs (see the Angular CLI cache bug note in decisions.md — this needed an explicit fix, wasn't free).

**Uncommitted:**
- `frontend/package.json`/`pnpm-lock.yaml` add `@tailwindcss/postcss` + `postcss` as dev dependencies, and a new `frontend/.postcssrc.json` (`{ "plugins": { "@tailwindcss/postcss": {} } }`) — a toolchain addition not yet committed.

**Not started yet:**
- Verifying the auth vertical slice actually works end-to-end in a real browser against the live backend (register → login → refresh → logout, guard redirects) — built and code-reviewed, not yet exercised live.
- Every domain feature area: `users` (self-profile, `UserDetailStore` only), `accounts` (`AccountSearchStore`/`AccountDetailStore`), `categories` (`CategoryLookupStore` for dropdowns + `CategorySearchStore`/`CategoryDetailStore` for the management screen), `transactions` (`TransactionSearchStore`/`TransactionDetailStore`, including the transfer-creation flow), `budgets` (`BudgetSearchStore`/`BudgetDetailStore`).
- App shell/layout (nav, etc.) beyond the bare `HomePage` placeholder.

## Planned / not yet implemented

- **Dashboard/reporting**: the actual point of the app — a proper multi-entity view (spending by category, balances over time, budgets vs. actual all in one place). All four CRUD entities now exist to aggregate over; this would be new dedicated endpoint(s), not just what Budgets already exposes per-category.
- **CSV import / Plaid bank sync**: schema is ready (`source`, `externalId`, `isPending` on `Transaction`), no import/sync logic written. Will exercise the balance triggers as a new write path — that's exactly why triggers were chosen over application-level recalculation.
- **Shared types package**: discussed early on (a `packages/shared-types` for DTOs shared between `api` and `frontend`) but never set up.
- **Roles**: no roles concept (e.g., admin) exists yet — every authorization check so far is "must be the resource's own owner," nothing more granular.
- **Password reset / email verification**: not started.
- **Multi-session refresh tokens**: currently one `hashedRefreshToken` per user (single active session) — no per-device session tracking.
- **Tests**: Nest's default Jest scaffold exists, but no unit/e2e tests have been written for any of the custom auth/users/entity code yet.
